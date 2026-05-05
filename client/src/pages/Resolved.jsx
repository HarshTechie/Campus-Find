import React, { useEffect, useState } from 'react'
import { getJSON } from '../services/api'
import { getToken } from '../services/auth'

export default function Resolved() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const token = getToken()

  useEffect(() => {
    (async () => {
      try {
        const res = await getJSON('/api/matches/resolved/all', token)
        if (res && res.matches) setMatches(res.matches)
      } catch (err) {
        console.error('Failed to load resolved matches', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading) return (
    <div className="border-2 border-dashed border-ink/30 p-10 text-center">
      <p className="font-sans italic text-ink-3">Loading the archive…</p>
    </div>
  )

  if (!matches.length) return (
    <section>
      <div className="flex items-baseline justify-between mb-6 px-2">
        <h2 className="font-display text-[20px] font-bold text-ink">
          Returned items
        </h2>
      </div>
      <div className="border-2 border-dashed border-ink/30 p-12 text-center">
        <p className="font-display text-[22px] font-bold text-ink leading-tight">
          Nothing returned yet.
        </p>
        <p className="font-sans italic text-[14px] text-ink-2 mt-2">
          Reunions will be archived here.
        </p>
      </div>
    </section>
  )

  return (
    <section>
      <div className="flex items-baseline justify-between mb-6 px-2">
        <h2 className="font-display text-[20px] font-bold text-ink">
          Returned items
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-tracked text-ink-3">
          {String(matches.length).padStart(3, '0')} archived
        </span>
      </div>

      <div className="space-y-7 sm:space-y-8 px-2 pt-3">
        {matches.map((m, idx) => {
          const tilt = idx % 2 === 0 ? 'tilt-l' : 'tilt-r'
          return (
            <article
              key={m._id}
              className={`relative pin-dot border-2 border-ink shadow-flyer bg-paper-found ${tilt} animate-fade-in`}
            >
              {/* Big diagonal RETURNED stamp */}
              <div
                className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10"
                style={{ transform: 'rotate(-12deg)' }}
              >
                <div className="border-[3px] border-accent px-2.5 py-1 bg-paper-found/40">
                  <span className="font-display font-extrabold text-[18px] sm:text-[22px] uppercase tracking-tracked-tight text-accent leading-none block">
                    Returned
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <p className="font-mono text-[10px] uppercase tracking-tracked text-ink-2 mb-2">
                  Closed · #{String(idx + 1).padStart(3, '0')}
                </p>
                <h3 className="font-display text-[22px] sm:text-[26px] font-extrabold text-ink leading-[1.05] pr-32 sm:pr-36">
                  {m.lostRequestId?.title || '(untitled)'}
                </h3>

                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  {m.lostRequestId?.locationText && (
                    <>
                      <span className="font-sans text-[13px] text-ink-2">
                        📍 {m.lostRequestId.locationText}
                      </span>
                      <span className="text-ink-3">·</span>
                    </>
                  )}
                  <span className="font-sans text-[13px] text-ink-2">
                    Reported by {m.lostRequestId?.owner?.name || m.lostRequestId?.owner?.email || 'Unknown'}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-ink/30">
                  <p className="font-mono text-[10px] uppercase tracking-tracked text-ink-2 mb-1.5">
                    ↳ Matched with
                  </p>
                  <p className="font-display font-bold text-[16px] text-ink leading-snug">
                    {m.foundRequestId?.title || 'A found item'}
                  </p>
                  <p className="font-sans text-[13px] text-ink-2 mt-1">
                    Found by {m.foundRequestId?.owner?.name || m.foundRequestId?.owner?.email || 'someone'}
                    {m.closedAt && (
                      <>
                        {' · '}
                        <span className="font-mono text-[12px] text-ink-3">
                          {new Date(m.closedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
