/**
 * Lightweight web-vitals collection without extra dependencies.
 * Captures FCP, LCP, CLS, INP (best effort), and TTFB.
 * 
 * Workstream B4: Enhanced with performance budgets and CI-compatible reporting
 */

// Performance budgets for Core Web Vitals (in milliseconds or score)
export const PERFORMANCE_BUDGETS = {
  // Good thresholds (green)
  good: {
    FCP: 1800,    // First Contentful Paint
    LCP: 2500,    // Largest Contentful Paint
    CLS: 0.1,     // Cumulative Layout Shift
    INP: 200,     // Interaction to Next Paint
    TTFB: 800,    // Time to First Byte
  },
  // Needs improvement thresholds (yellow)
  needsImprovement: {
    FCP: 3000,
    LCP: 4000,
    CLS: 0.25,
    INP: 500,
    TTFB: 1800,
  },
  // Poor thresholds exceed these (red)
};

// Determine rating based on budgets
const getRating = (name, value) => {
  const goodThreshold = PERFORMANCE_BUDGETS.good[name];
  const needsImprovementThreshold = PERFORMANCE_BUDGETS.needsImprovement[name];
  
  if (!goodThreshold) return 'unknown';
  
  if (value <= goodThreshold) return 'good';
  if (value <= needsImprovementThreshold) return 'needs-improvement';
  return 'poor';
};

// Send metrics to analytics endpoint
const sendToAnalytics = (metric) => {
  const payload = JSON.stringify({ ...metric, timestamp: Date.now(), url: window.location.href });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', payload);
  } else {
    fetch('/api/analytics/vitals', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }
};

const defaultReporter = (metric) => {
  const { name, value, rating } = metric;
  
  if (process.env.NODE_ENV !== 'production') {
    // Color-coded console output
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    // eslint-disable-next-line no-console
    console.info(`${color} [Vitals] ${name}: ${value} (${rating})`, metric);
  }
  
  sendToAnalytics(metric);
};

const observeEntryType = (entryType, onEntries) => {
  if (typeof PerformanceObserver === 'undefined') return () => { };

  try {
    const observer = new PerformanceObserver((list) => {
      onEntries(list.getEntries());
    });

    observer.observe({ type: entryType, buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => { };
  }
};

export const startWebVitalsCollection = (onMetric = defaultReporter) => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return () => { };

  const cleanups = [];
  const metrics = {}; // Store all metrics for aggregate reporting
  
  const send = (name, value, metadata = {}) => {
    const roundedValue = typeof value === 'number' ? Number(value.toFixed(3)) : value;
    const rating = getRating(name, roundedValue);
    const metric = { 
      name, 
      value: roundedValue, 
      rating,
      route: window.location.pathname,
      timestamp: Date.now(),
      ...metadata 
    };
    
    metrics[name] = metric;
    onMetric(metric);
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

  // Aggregate summary on page unload (for CI/monitoring)
  const reportSummary = () => {
    const summary = {
      timestamp: Date.now(),
      route: window.location.pathname,
      metrics: Object.values(metrics),
      overall: {
        good: Object.values(metrics).filter(m => m.rating === 'good').length,
        needsImprovement: Object.values(metrics).filter(m => m.rating === 'needs-improvement').length,
        poor: Object.values(metrics).filter(m => m.rating === 'poor').length,
      }
    };
    
    // Store in sessionStorage for debugging/testing
    try {
      sessionStorage.setItem('webVitalsReport', JSON.stringify(summary));
    } catch {
      // Storage quota exceeded or disabled
    }
  };
  
  window.addEventListener('beforeunload', reportSummary);
  cleanups.push(() => window.removeEventListener('beforeunload', reportSummary));

  return () => cleanups.forEach((cleanup) => cleanup());
};

// Export metrics for programmatic access (useful for tests)
export const getWebVitalsReport = () => {
  try {
    const report = sessionStorage.getItem('webVitalsReport');
    return report ? JSON.parse(report) : null;
  } catch {
    return null;
  }
};

// CI budget check function
export const checkPerformanceBudgets = (metrics) => {
  const violations = [];
  
  Object.entries(metrics).forEach(([name, metric]) => {
    const budget = PERFORMANCE_BUDGETS.good[name];
    if (budget && metric.value > budget) {
      violations.push({
        metric: name,
        value: metric.value,
        budget,
        overage: metric.value - budget,
        rating: metric.rating,
      });
    }
  });
  
  return {
    passed: violations.length === 0,
    violations,
  };
};
