import React, { useState, useEffect } from 'react'
import { postJSON, getJSON } from '../services/api'
import { getToken } from '../services/auth'

const scorePhrase = (s) => {
  if (typeof s !== 'number') return 'Possible match'
  if (s >= 0.85) return 'Strong match'
  if (s >= 0.6) return 'Possible match'
  return 'Long shot'
}

export default function MatchesModal({ matches = [], onClose, onOpenChat, onRefetch }) {
  const token = getToken()
  const [meta, setMeta] = useState({}) // matchId -> meta

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const ids = matches.map(m => m.matchId).filter(Boolean)
      const map = {}
      try {
        await Promise.all(ids.map(async (id) => {
          try {
            const m = await getJSON(`/api/matches/${id}`, token)
            if (mounted && m && m._id) map[id] = m
          } catch (e) {}
        }))
        if (mounted) setMeta(map)
      } catch (e) { console.error(e) }
    }
    load()
    return () => { mounted = false }
  }, [matches, token])

  const confirm = async (matchId) => {
    try {
      await postJSON(`/api/matches/${matchId}/confirm`, {}, token)
      alert('Confirmed. If both parties confirmed, match will be closed.')
      if (typeof onRefetch === 'function') onRefetch()
      // refresh this match meta
      const updated = await getJSON(`/api/matches/${matchId}`, token)
      setMeta(prev => ({ ...prev, [matchId]: updated }))
    } catch (err) {
      console.error('confirm failed', err)
      alert('Confirm failed: ' + (err.message || err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} />

      <div className="relative bg-paper-note w-full max-w-md max-h-[85vh] flex flex-col border-2 border-ink shadow-flyer animate-fade-in pin-dot">
        <div className="flex items-baseline justify-between px-5 pt-5 pb-4 border-b-2 border-dashed border-ink/30">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-tracked text-accent mb-1">
              ✦ Possible matches
            </p>
            <h3 className="font-display text-[20px] font-extrabold text-ink leading-tight">
              Tear off &amp; check
            </h3>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-tracked-tight text-ink-2 hover:text-accent underline-offset-4 hover:underline"
          >
            Close ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {matches.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-display text-[20px] font-bold text-ink leading-snug">
                Nothing yet.
              </p>
              <p className="font-sans italic text-[13px] text-ink-2 mt-2">
                We'll let you know when something turns up.
              </p>
            </div>
          ) : (
            <ul>
              {matches.map((m, idx) => {
                const mm = meta[m.matchId] || {}
                const closed = mm.status === 'closed'
                const pending = !closed && (mm.lostConfirmed || mm.foundConfirmed) && !(mm.lostConfirmed && mm.foundConfirmed)
                const phrase = scorePhrase(m.score)
                const isStrong = phrase === 'Strong match'
                return (
                  <li
                    key={m.matchId}
                    className={`py-4 ${idx > 0 ? 'border-t border-dashed border-ink/20' : ''} ${closed ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex items-baseline gap-3 flex-wrap">
                        <span className={`font-display font-extrabold text-[13px] uppercase tracking-tracked-tight ${isStrong ? 'text-accent' : 'text-ink'}`}>
                          {phrase}
                        </span>
                        {pending && (
                          <span className="font-mono text-[10px] uppercase tracking-tracked text-ink-3">awaiting</span>
                        )}
                        {closed && (
                          <span className="font-mono text-[10px] uppercase tracking-tracked text-ink-3">closed</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3 flex-shrink-0">
                        <button
                          className="font-sans text-[13px] font-medium text-ink-2 hover:text-accent underline-offset-4 hover:underline"
                          onClick={() => onOpenChat(m.matchId)}
                        >
                          Reply
                        </button>
                        <button
                          className={`font-sans text-[13px] font-medium underline-offset-4 ${closed ? 'text-ink-3 cursor-not-allowed' : 'text-ink hover:text-accent hover:underline'}`}
                          onClick={() => confirm(m.matchId)}
                          disabled={closed}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-ink-3 truncate">
                      ref · {m.matchedRequestId}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
