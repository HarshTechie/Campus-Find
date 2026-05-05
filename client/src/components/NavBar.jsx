import React, { useState, useEffect, useRef } from 'react'
import { clearToken, getToken } from '../services/auth'

// Pull { name, email } out of the existing JWT — no new API calls, no
// new state in the parent. Returns null on missing/malformed tokens.
function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const [, payload] = token.split('.')
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '==='.slice((b64.length + 3) % 4)
    return JSON.parse(decodeURIComponent(
      Array.from(atob(padded))
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    ))
  } catch {
    return null
  }
}

export default function NavBar({ onLogout }) {
  const token = getToken()
  const user = decodeJwt(token)

  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const handleLogout = () => {
    setOpen(false)
    clearToken()
    if (typeof onLogout === 'function') onLogout()
  }

  // Close on outside click + Esc — only listen while open
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()
  const display = user?.name || (user?.email ? user.email.split('@')[0] : 'Account')

  return (
    <header className="bg-board border-b-2 border-ink relative z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-baseline justify-between">

        {/* Brand */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[26px] font-extrabold text-ink leading-none tracking-tight">
            CampusFind
          </span>
          <span className="font-mono text-[10px] uppercase tracking-tracked text-accent leading-none">
            est. now
          </span>
        </div>

        {/* User menu */}
        {token ? (
          <div className="relative self-center" ref={wrapperRef}>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              {/* Initial circle (or, later, an avatar) */}
              <span
                className="w-8 h-8 rounded-full bg-accent text-board flex items-center justify-center font-display font-extrabold text-[13px] border-2 border-ink leading-none transition-transform duration-150 group-hover:-translate-y-0.5"
                style={{ boxShadow: '2px 2px 0 #1A1814' }}
              >
                {initial}
              </span>

              <span className="hidden sm:inline-block font-display text-[14px] font-bold text-ink leading-none max-w-[140px] truncate">
                {display}
              </span>

              <svg
                className={`hidden sm:block w-3 h-3 text-ink-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dropdown — pinned note */}
            <div
              role="menu"
              aria-hidden={!open}
              className={`absolute right-0 top-full mt-4 w-72 z-50 transition-all duration-200 ${
                open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              style={{
                transform: open ? 'rotate(-0.6deg) scale(1)' : 'rotate(0deg) scale(0.96)',
                transformOrigin: 'top right',
              }}
            >
              <div
                className="relative bg-paper-note border-2 border-ink px-5 py-5 pin-dot"
                style={{ boxShadow: '4px 4px 0 #1A1814' }}
              >
                <p className="font-mono text-[10px] uppercase tracking-tracked text-accent mb-2">
                  ✦ Signed in as
                </p>
                <p className="font-display font-extrabold text-[17px] text-ink leading-tight truncate">
                  {user?.name || 'Account'}
                </p>
                {user?.email && (
                  <p className="font-mono text-[11px] text-ink-2 mt-1.5 truncate">
                    {user.email}
                  </p>
                )}

                <div className="border-t-2 border-dashed border-ink/30 my-4" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-between gap-2 border-2 border-ink px-3.5 py-2.5 bg-transparent font-display font-extrabold text-[12px] uppercase tracking-tracked-tight text-ink hover:bg-accent hover:text-board transition-colors duration-150 focus:outline-none focus:bg-accent focus:text-board"
                >
                  <span>Sign out</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
