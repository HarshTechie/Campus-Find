// client/src/pages/Login.jsx
import React, { useEffect, useState, useRef } from 'react'
import { signinWithIdToken } from '../services/auth'

const RAW_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Treat unset, empty, or placeholder values as missing (catches the
// "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE…" copy-paste pitfall that otherwise
// passes a truthy-but-invalid string straight to Google → 401 invalid_client).
const IS_PLACEHOLDER = !RAW_CLIENT_ID || RAW_CLIENT_ID.startsWith('PASTE_')
const CLIENT_ID = IS_PLACEHOLDER ? null : RAW_CLIENT_ID
// Diagnostic — first 8 chars + length only; client IDs are public, not secret.
console.log(`[auth] VITE_GOOGLE_CLIENT_ID: ${RAW_CLIENT_ID ? RAW_CLIENT_ID.slice(0, 8) + '…' : '(empty)'} (len=${RAW_CLIENT_ID ? RAW_CLIENT_ID.length : 0})${IS_PLACEHOLDER ? ' ⚠ PLACEHOLDER OR EMPTY' : ''}`)

function loadGsiScriptOnce() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (existing.getAttribute('__gsi_loaded') === '1') return resolve();
      existing.addEventListener('load', () => { existing.setAttribute('__gsi_loaded', '1'); resolve(); });
      existing.addEventListener('error', () => reject(new Error('gsi script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.id = 'gis-client';
    s.async = true;
    s.defer = true;
    s.onload = () => { s.setAttribute('__gsi_loaded', '1'); resolve(); };
    s.onerror = () => reject(new Error('gsi script failed to load'));
    document.head.appendChild(s);
  });
}

export default function Login({ onLogin }) {
  const [loadingScript, setLoadingScript] = useState(true)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    let mounted = true
    if (!CLIENT_ID) {
      setError('Missing Google Client ID. Set VITE_GOOGLE_CLIENT_ID and rebuild the client on Render.')
      setLoadingScript(false)
      return
    }

    async function init() {
      try {
        await loadGsiScriptOnce()
      } catch (e) {
        console.error('Failed to load Google Identity script', e)
        if (!mounted) return
        setError('Failed to load Google Identity script (network/CSP).')
        setLoadingScript(false)
        return
      }

      // wait for containerRef and window.google to be ready (short loop)
      let tries = 0
      const maxTries = 20
      const delay = 100

      while (mounted && tries < maxTries) {
        if (containerRef.current && window.google && window.google.accounts && typeof window.google.accounts.id?.initialize === 'function') break
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, delay))
        tries++
      }

      if (!mounted) return
      if (!containerRef.current) {
        setError('Sign-in container not found in DOM. (containerRef is null)')
        setLoadingScript(false)
        return
      }
      if (!(window.google && window.google.accounts && typeof window.google.accounts.id?.initialize === 'function')) {
        setError('Google Identity objects not available on window.google after script load.')
        setLoadingScript(false)
        return
      }

      try {
       window.google.accounts.id.initialize({
  client_id: CLIENT_ID,
  callback: async (response) => {
    try {
      const idToken = response?.credential
      if (!idToken) throw new Error('No id_token received from Google')
      const user = await signinWithIdToken(idToken)
      if (typeof onLogin === 'function') onLogin(user)
    } catch (err) {
      console.error('signin callback error', err)
      // Reset Google's cached selection so the user can pick a different
      // account next time without an extra click.
      try { window.google?.accounts?.id?.disableAutoSelect?.() } catch {}
      setError(err?.message || 'Sign-in failed. Please try again.')
    }
  },

  auto_select: false,       
  cancel_on_tap_outside: false
          // hosted_domain: 'chitkara.edu.in' // optional client-side domain hint
        })

        // render into the always-present container; width: "100%" makes it expand to parent
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%'
        })
        // window.google.accounts.id.prompt(); // optional auto prompt
        if (mounted) setLoadingScript(false)
      } catch (err) {
        console.error('GSI init/render error', err)
        if (mounted) {
          setError('Failed to initialize Google Sign-in. See console for details.')
          setLoadingScript(false)
        }
      }
    }

    init()
    return () => { mounted = false }
  }, [onLogin])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      {/* A single yellow flyer pinned to the board */}
      <div
        className="w-full max-w-sm bg-paper-lost border-2 border-ink shadow-flyer p-7 sm:p-8 pin-dot tilt-l animate-fade-in"
      >
        <div className="text-center mb-7">
          <p className="font-mono text-[10px] uppercase tracking-tracked text-accent mb-3">
            ★ Welcome to the board ★
          </p>
          <h1 className="font-display text-[44px] sm:text-[52px] font-extrabold text-ink leading-[0.92] tracking-tight">
            Campus<br />Find
          </h1>
          <p className="font-sans text-[14px] text-ink-2 mt-4 leading-snug">
            A place to post what's lost.<br />And what's been found.
          </p>
        </div>

        {/* Perforation */}
        <div className="border-t-2 border-dashed border-ink/30 pt-6">
          {error && (
            <div className="mb-4 bg-accent text-board px-3 py-2 inline-block transform -rotate-1">
              <p className="font-mono text-[10px] uppercase tracking-tracked-tight">Login error</p>
              <p className="font-sans text-[12px] mt-0.5">{error}</p>
            </div>
          )}

          {/* Google button mount */}
          <div
            id="g-btn"
            ref={containerRef}
            className="min-h-[48px] flex items-center w-full"
            style={{ width: '100%' }}
          />

          {loadingScript && !error && (
            <p className="font-sans text-[12px] text-ink-3 mt-3 italic">Loading sign-in…</p>
          )}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-tracked text-ink-3">
          Sign in with any Google account
        </p>
      </div>
    </div>
  )
}
