/**
 * Lightweight web-vitals collection without extra dependencies.
 * Captures FCP, LCP, CLS, INP (best effort), and TTFB.
 */

const defaultReporter = (metric) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(`[Vitals] ${metric.name}: ${metric.value}`, metric);
  }
};

const observeEntryType = (entryType, onEntries) => {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      onEntries(list.getEntries());
    });

    observer.observe({ type: entryType, buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
};

export const startWebVitalsCollection = (onMetric = defaultReporter) => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return () => {};

  const cleanups = [];
  const send = (name, value, metadata = {}) => {
    const roundedValue = typeof value === 'number' ? Number(value.toFixed(3)) : value;
    onMetric({ name, value: roundedValue, ...metadata });
  };

  // TTFB from navigation timing
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav?.responseStart != null) {
      send('TTFB', nav.responseStart);
    }
  } catch {
    // noop
  }

  // First Contentful Paint
  cleanups.push(
    observeEntryType('paint', (entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          send('FCP', entry.startTime);
        }
      });
    })
  );

  // Largest Contentful Paint
  let lcpValue = 0;
  cleanups.push(
    observeEntryType('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      if (lastEntry?.startTime) {
        lcpValue = lastEntry.startTime;
      }
    })
  );

  const finalizeLcp = () => {
    if (lcpValue > 0) send('LCP', lcpValue);
  };
  window.addEventListener('visibilitychange', finalizeLcp, { once: true });
  cleanups.push(() => window.removeEventListener('visibilitychange', finalizeLcp));

  // Cumulative Layout Shift
  let clsValue = 0;
  cleanups.push(
    observeEntryType('layout-shift', (entries) => {
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      send('CLS', clsValue);
    })
  );

  // Interaction to Next Paint (best-effort on supported browsers)
  cleanups.push(
    observeEntryType('event', (entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'click' || entry.name === 'keydown' || entry.name === 'pointerdown') {
          if (entry.duration) {
            send('INP', entry.duration, { interactionType: entry.name });
          }
        }
      });
    })
  );

  return () => cleanups.forEach((cleanup) => cleanup());
};
