import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Box, Button, TextField, Typography, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

// Simple client-side CAPTCHA component supporting:
// - local-math: small arithmetic (+/-)
// - local-image: text shown as SVG
// - (placeholder) hcaptcha: when REACT_APP_HCAPTCHA_SITEKEY is provided (not auto-integrated)
// Emits onSolve({ type, response }) when solved; onClear() when reset.

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeSVGText(text) {
  const width = Math.max(120, text.length * 28);
  const height = 48;
  const jittered = text.split('').map((c, i) => `\n<text x="${12 + i * 22}" y="${28 + (i % 2 ? -4 : 4)}" font-size="24" font-family="monospace" fill=\"#333\">${c}</text>`).join('');
  const noise = Array.from({ length: 6 }).map((_, i) => `<circle cx='${Math.random() * width}' cy='${Math.random() * height}' r='${Math.random() * 2 + 0.5}' fill='#${Math.floor(Math.random() * 16777215).toString(16)}' opacity='0.15'/>`).join('\n');
  return `data:image/svg+xml;utf8,` + encodeURIComponent(`<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><rect width='100%' height='100%' fill='#f6f7fb'/><g transform='translate(0,0)'>${noise}${jittered}</g></svg>`);
}

export default function CaptchaField({ onSolve, onClear, variant = 'auto', label = 'Verification' }) {
  const siteKey = process.env.REACT_APP_HCAPTCHA_SITEKEY || process.env.REACT_APP_RECAPTCHA_SITEKEY || null;
  const prefer = variant; // 'math'|'image'|'auto'

  const chooseMode = useMemo(() => {
    if (siteKey) return 'hcaptcha';
    if (prefer === 'math') return 'math';
    if (prefer === 'image') return 'image';
    // default heuristic: math for small screens, image for wider screens
    return 'math';
  }, [siteKey, prefer]);

  const [mode, setMode] = useState(chooseMode);
  const [challenge, setChallenge] = useState(null);
  const [value, setValue] = useState('');
  const [solved, setSolved] = useState(false);
  const hcaptchaContainerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const generate = useCallback(() => {
    setSolved(false);
    setValue('');
    if (mode === 'math') {
      const a = randomInt(1, 20);
      const b = randomInt(1, 20);
      const op = Math.random() > 0.5 ? '+' : '-';
      const question = `${a} ${op} ${b}`;
      const answer = op === '+' ? a + b : a - b;
      setChallenge({ type: 'math', question, answer });
    } else if (mode === 'image') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const text = Array.from({ length: 4 }).map(() => chars.charAt(randomInt(0, chars.length - 1))).join('');
      const svg = makeSVGText(text);
      setChallenge({ type: 'image', svg, text });
    } else {
      // hcaptcha placeholder
      setChallenge({ type: 'hcaptcha', siteKey, info: 'Set REACT_APP_HCAPTCHA_SITEKEY to enable hCaptcha' });
    }
  }, [mode, siteKey]);

  useEffect(() => {
    generate();
  }, [generate]);

  // Render hCaptcha widget when siteKey is present and mode === 'hcaptcha'
  useEffect(() => {
    if (mode !== 'hcaptcha' || !siteKey || typeof window === 'undefined') return;

    const renderWidget = () => {
      try {
        if (widgetIdRef.current !== null) {
          // already rendered
          return;
        }
        if (!window.hcaptcha || !hcaptchaContainerRef.current) return;
        widgetIdRef.current = window.hcaptcha.render(hcaptchaContainerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setSolved(true);
            onSolve && onSolve({ type: 'hcaptcha', response: token });
          },
          'expired-callback': () => {
            setSolved(false);
            onClear && onClear();
          }
        });
      } catch (err) {
        // ignore render errors in dev
        console.warn('hcaptcha render failed', err?.message || err);
      }
    };

    const ensureScript = () => {
      if (window.hcaptcha) {
        renderWidget();
        return;
      }
      const id = 'hcaptcha-api-script';
      if (document.getElementById(id)) {
        // wait for global to be available
        const s = setInterval(() => { if (window.hcaptcha) { clearInterval(s); renderWidget(); } }, 250);
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      // Use explicit render mode and rely on onload to avoid premature render warnings
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => renderWidget();
      document.head.appendChild(script);
    };

    ensureScript();

    return () => {
      try {
        if (widgetIdRef.current !== null && window.hcaptcha) {
          window.hcaptcha.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      } catch (e) { /* ignore */ }
    };
  }, [mode, siteKey, onSolve, onClear]);

  const verify = () => {
    if (!challenge) return;
    if (challenge.type === 'math') {
      if (String(challenge.answer) === String(value).trim()) {
        setSolved(true);
        onSolve && onSolve({ type: 'local-math', response: String(value).trim() });
      } else {
        setSolved(false);
        onClear && onClear();
      }
    } else if (challenge.type === 'image') {
      if (String(challenge.text).toLowerCase() === String(value).trim().toLowerCase()) {
        setSolved(true);
        onSolve && onSolve({ type: 'local-image', response: String(value).trim() });
      } else {
        setSolved(false);
        onClear && onClear();
      }
    } else {
      // hcaptcha: not integrated — call onSolve with placeholder when siteKey present
      if (siteKey) {
        setSolved(true);
        onSolve && onSolve({ type: 'hcaptcha', response: 'hcaptcha-placeholder-token' });
      } else {
        setSolved(false);
        onClear && onClear();
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => setMode((m) => m === 'math' ? 'image' : 'math')}>Switch</Button>
          <IconButton size="small" onClick={generate} aria-label="Refresh challenge"><RefreshIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      {mode === 'hcaptcha' && (
        siteKey ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div ref={hcaptchaContainerRef} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => { if (window.hcaptcha && widgetIdRef.current !== null) { try { window.hcaptcha.reset(widgetIdRef.current); } catch (e) { } } }}>Reset</Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption">hCaptcha is available (site key configured). For full integration add REACT_APP_HCAPTCHA_SITEKEY and set HCAPTCHA_SECRET on the server.</Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => { setSolved(true); onSolve && onSolve({ type: 'hcaptcha', response: 'hcaptcha-placeholder-token' }); }}>Simulate hCaptcha</Button>
          </Box>
        )
      )}

      {challenge && challenge.type === 'math' && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>{challenge.question}</Typography>
          <TextField size="small" value={value} onChange={(e) => setValue(e.target.value)} onBlur={verify} placeholder="Answer" />
          {solved && <Typography color="success.main" sx={{ fontWeight: 700 }}>OK</Typography>}
        </Box>
      )}

      {challenge && challenge.type === 'image' && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <img src={challenge.svg} alt="captcha" style={{ height: 48, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }} />
          <TextField size="small" value={value} onChange={(e) => setValue(e.target.value)} onBlur={verify} placeholder="Type letters" />
          {solved && <Typography color="success.main" sx={{ fontWeight: 700 }}>OK</Typography>}
        </Box>
      )}

      {!challenge && <TextField size="small" value={value} onChange={(e) => setValue(e.target.value)} onBlur={verify} placeholder="Verify" />}
    </Box>
  );
}
