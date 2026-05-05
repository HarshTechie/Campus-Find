import React, { useState, useEffect } from 'react'
import CreateRequest from './CreateRequest'
import MatchesModal from './MatchesModal'
import Chat from './Chat'
import Resolved from './Resolved'
import { getToken } from '../services/auth'
import { getJSON, postJSON } from '../services/api'
import { getSocket, connectSocket } from '../services/socket'

// Display helpers (UI-only; no logic change)
const scorePhrase = (s) => {
  if (typeof s !== 'number') return 'Possible match'
  if (s >= 0.85) return 'Strong match'
  if (s >= 0.6) return 'Possible match'
  return 'Long shot'
}
const formatRelative = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Dashboard({ onLogout }) {
  const [showCreateKind, setShowCreateKind] = useState(null)
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [showResolvedPage, setShowResolvedPage] = useState(false)
  const [matchMeta, setMatchMeta] = useState({}) // map matchId -> match object
  const token = getToken()

  const fetchMyRequests = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await getJSON('/api/requests/me', token)
      if (res && res.requests) {
        setRequests(res.requests)
        // once requests fetched, load match metadata for any matches we haven't loaded
        const allMatchIds = []
        for (const r of res.requests) {
          if (r._matches && r._matches.length) {
            for (const m of r._matches) {
              if (m.matchId) allMatchIds.push(m.matchId)
            }
          }
        }
        const unique = [...new Set(allMatchIds)]
        if (unique.length) await loadMatchMeta(unique)
      } else {
        setRequests([])
        setMatchMeta({})
      }
    } catch (err) {
      console.error('Failed to fetch requests', err)
    } finally {
      setLoading(false)
    }
  }

  // loads metadata for given match ids and stores into matchMeta
  const loadMatchMeta = async (matchIds = []) => {
    if (!matchIds || matchIds.length === 0) return
    const newMeta = { ...matchMeta }
    try {
      await Promise.all(matchIds.map(async (id) => {
        try {
          const m = await getJSON(`/api/matches/${id}`, token)
          if (m && m._id) newMeta[id] = m
        } catch (e) {
          console.warn('Failed to fetch match meta for', id, e)
        }
      }))
      setMatchMeta(newMeta)
    } catch (e) {
      console.error('loadMatchMeta failed', e)
    }
  }

  useEffect(() => {
    fetchMyRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Socket listeners: refresh lists when matches change
  useEffect(() => {
    const socket = connectSocket()
    if (!socket) return
    function onMatchCancelled(payload) {
      console.log('socket: match:cancelled', payload)
      // quick strategy: refetch all my requests so UI is in sync
      fetchMyRequests()
    }
    function onMatchUpdated(payload) {
      console.log('socket: match:updated', payload)
      // refresh that single match meta and requests
      if (payload && payload.matchId) {
        loadMatchMeta([payload.matchId])
      }
      fetchMyRequests()
    }
    function onMatchClosed(payload) {
      console.log('socket: match:closed', payload)
      fetchMyRequests()
    }

    socket.on && socket.on('match:cancelled', onMatchCancelled)
    socket.on && socket.on('match:updated', onMatchUpdated)
    socket.on && socket.on('match:closed', onMatchClosed)

    // cleanup
    return () => {
      try {
        socket.off && socket.off('match:cancelled', onMatchCancelled)
        socket.off && socket.off('match:updated', onMatchUpdated)
        socket.off && socket.off('match:closed', onMatchClosed)
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreated = async (createdRequest) => {
    await fetchMyRequests()
  }

  const confirmMatch = async (matchId) => {
    if (!matchId) return
    if (!token) { alert('Not authenticated'); return }
    try {
      await postJSON(`/api/matches/${matchId}/confirm`, {}, token)
      await loadMatchMeta([matchId])
      await fetchMyRequests()
      alert('Confirmed. If both parties confirmed, match will be closed.')
    } catch (err) {
      console.error('confirm match failed', err)
      alert('Failed to confirm match: ' + (err.message || err))
    }
  }

  const computeUIFlags = (r, mEntry) => {
    const meta = matchMeta[mEntry.matchId]
    if (!meta) return { closed: false, pending: false, confirmedByMe: false }
    const closed = meta.status === 'closed' || meta.status === 'verified' || meta.status === 'cancelled'
    const iAmLostSide = (r.kind === 'lost')
    const confirmedByMe = iAmLostSide ? !!meta.lostConfirmed : !!meta.foundConfirmed
    const otherConfirmed = iAmLostSide ? !!meta.foundConfirmed : !!meta.lostConfirmed
    const pending = !closed && (meta.lostConfirmed || meta.foundConfirmed) && !(meta.lostConfirmed && meta.foundConfirmed)
    return { closed, pending, confirmedByMe, otherConfirmed }
  }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Board header */}
        <div className="mb-8 sm:mb-10 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-tracked text-ink-2 mb-1">
              ◷ The Board
            </p>
            <h1 className="font-display text-[32px] sm:text-[40px] font-extrabold text-ink leading-none tracking-tight">
              What's lost. What's found.
            </h1>
          </div>
          <button
            onClick={() => setShowResolvedPage(v => !v)}
            className="font-mono font-medium text-[13px] uppercase tracking-tracked-tight text-ink hover:text-accent underline-offset-4 hover:underline whitespace-nowrap pb-1"
          >
            {showResolvedPage ? '← Back to board' : 'See returned →'}
          </button>
        </div>

        {showResolvedPage ? (
          <Resolved />
        ) : (
          <>
            {/* Two action stamps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 mb-12 px-2">
              <button
                onClick={() => setShowCreateKind('lost')}
                className={`relative bg-paper-lost border-2 border-ink p-5 sm:p-6 text-left shadow-flyer hover:shadow-flyer-hover hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all duration-150 tilt-l ${showCreateKind === 'lost' ? 'ring-4 ring-accent ring-offset-2 ring-offset-board' : ''}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-tracked text-accent mb-2">
                  ✦ I lost something
                </p>
                <p className="font-display text-[24px] sm:text-[28px] font-extrabold text-ink leading-[1.05]">
                  Post a missing flyer
                </p>
                <p className="font-sans text-[13px] text-ink-2 mt-2 leading-relaxed">
                  Tell the board what's gone — we'll watch for it.
                </p>
              </button>

              <button
                onClick={() => setShowCreateKind('found')}
                className={`relative bg-paper-found border-2 border-ink p-5 sm:p-6 text-left shadow-flyer hover:shadow-flyer-hover hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all duration-150 tilt-r ${showCreateKind === 'found' ? 'ring-4 ring-accent ring-offset-2 ring-offset-board' : ''}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-tracked text-ink mb-2">
                  ☞ I found something
                </p>
                <p className="font-display text-[24px] sm:text-[28px] font-extrabold text-ink leading-[1.05]">
                  Drop a found tag
                </p>
                <p className="font-sans text-[13px] text-ink-2 mt-2 leading-relaxed">
                  Pin a tag to the board — owners will come looking.
                </p>
              </button>
            </div>

            {showCreateKind && (
              <div className="mb-12 animate-fade-in">
                <CreateRequest kind={showCreateKind} onCreated={(req) => { handleCreated(req); setShowCreateKind(null); }} />
              </div>
            )}

            {/* The flyer feed */}
            <section>
              <div className="flex items-baseline justify-between mb-6 px-2">
                <h2 className="font-display text-[20px] font-bold text-ink">
                  Your flyers
                </h2>
                {requests.length > 0 && (
                  <span className="font-mono text-[11px] uppercase tracking-tracked text-ink-3">
                    {requests.length} pinned
                  </span>
                )}
              </div>

              {loading ? (
                <div className="border-2 border-dashed border-ink/30 p-10 text-center">
                  <p className="font-sans italic text-ink-3">Loading the board…</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="border-2 border-dashed border-ink/30 p-12 text-center">
                  <p className="font-display text-[22px] font-bold text-ink leading-tight">
                    An empty board.
                  </p>
                  <p className="font-sans italic text-[14px] text-ink-2 mt-2">
                    Hopefully it stays that way.
                  </p>
                </div>
              ) : (
                <div className="space-y-7 sm:space-y-8 px-2 pt-3">
                  {requests.map((r, idx) => {
                    const isLost = r.kind === 'lost'
                    const tilt = idx % 2 === 0 ? 'tilt-l' : 'tilt-r'
                    return (
                      <article
                        key={r._id}
                        className={`relative pin-dot border-2 border-ink shadow-flyer ${tilt} ${isLost ? 'bg-paper-lost' : 'bg-paper-found'} animate-fade-in`}
                      >
                        {/* Status stamp */}
                        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 tilt-stamp z-10">
                          <span className={`inline-block font-display font-extrabold text-[12px] uppercase tracking-tracked-tight px-2 py-1 border-2 ${r.status === 'open' ? 'border-accent text-accent' : 'border-ink-3 text-ink-3'}`}>
                            {r.status}
                          </span>
                        </div>

                        <div className="p-5 sm:p-6">
                          {/* Top label */}
                          <p className={`font-mono text-[10px] uppercase tracking-tracked mb-2 ${isLost ? 'text-accent' : 'text-ink'}`}>
                            {isLost
                              ? '⚠ Missing'
                              : `Found · #${String(idx + 1).padStart(3, '0')}`}
                          </p>

                          {/* Big poster title */}
                          <h3 className="font-display text-[22px] sm:text-[28px] font-extrabold text-ink leading-[1.05] pr-20 sm:pr-24">
                            {r.title || '(untitled)'}
                          </h3>

                          {/* Meta */}
                          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                            {r.locationText && (
                              <>
                                <span className="font-sans text-[13px] text-ink-2">
                                  📍 {r.locationText}
                                </span>
                                <span className="text-ink-3">·</span>
                              </>
                            )}
                            <span className="font-mono text-[12px] text-ink-3">
                              {formatRelative(r.createdAt)}
                            </span>
                          </div>

                          {/* Description */}
                          {r.description && (
                            <p className="font-sans text-[14px] text-ink-2 mt-3 leading-relaxed">
                              {r.description}
                            </p>
                          )}

                          {(!r._matches || r._matches.length === 0) && (
                            <p className="font-sans italic text-[13px] text-ink-3 mt-4">
                              No matches yet — keep checking back.
                            </p>
                          )}
                        </div>

                        {/* Tear-off tabs (matches) */}
                        {r._matches && r._matches.length > 0 && (
                          <div className={`relative ${isLost ? 'bg-paper-lost' : 'bg-paper-found'}`}>
                            <div className="border-t-2 border-dashed border-ink/40 px-5 sm:px-6 pt-4 pb-2">
                              <p className="font-mono text-[10px] uppercase tracking-tracked text-ink-2">
                                ✄ ─ ─ ─ Possible matches ─ ─ ─ tear off &amp; follow up
                              </p>
                            </div>
                            <ul className="px-5 sm:px-6 pb-5">
                              {r._matches.map((m, mIdx) => {
                                const flags = computeUIFlags(r, m)
                                const phrase = scorePhrase(m.score)
                                const isStrong = phrase === 'Strong match'
                                return (
                                  <li
                                    key={mIdx}
                                    className={`flex items-baseline justify-between gap-3 py-2.5 flex-wrap ${mIdx > 0 ? 'border-t border-dashed border-ink/15' : ''} ${flags.closed ? 'opacity-50' : ''}`}
                                  >
                                    <div className="min-w-0 flex items-baseline gap-2.5 flex-wrap">
                                      <span className={`font-display font-bold text-[13px] uppercase tracking-tracked-tight ${isStrong ? 'text-accent' : 'text-ink'}`}>
                                        {phrase}
                                      </span>
                                      <span className="font-sans text-[14px] text-ink">
                                        {m.matchedRequest ? m.matchedRequest.title : '(untitled)'}
                                      </span>
                                      {m.matchedRequest?.locationText && (
                                        <span className="font-sans text-[12px] text-ink-3">
                                          · {m.matchedRequest.locationText}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-baseline gap-3 flex-shrink-0">
                                      {flags.pending && (
                                        <span className="font-mono text-[10px] uppercase tracking-tracked text-ink-3">awaiting</span>
                                      )}
                                      {flags.closed && (
                                        <span className="font-mono text-[10px] uppercase tracking-tracked text-ink-3">closed</span>
                                      )}
                                      <button
                                        className="font-sans text-[13px] font-medium text-ink-2 hover:text-accent underline-offset-4 hover:underline transition-colors duration-150"
                                        onClick={() => setSelectedMatchId(m.matchId)}
                                      >
                                        Reply
                                      </button>
                                      <button
                                        className={`font-sans text-[13px] font-medium underline-offset-4 transition-colors duration-150 ${flags.closed || flags.confirmedByMe ? 'text-ink-3 cursor-not-allowed' : 'text-ink hover:text-accent hover:underline'}`}
                                        onClick={() => confirmMatch(m.matchId)}
                                        disabled={!!flags.closed || !!flags.confirmedByMe}
                                        title={flags.closed ? 'This match is closed' : (flags.confirmedByMe ? 'You already confirmed' : 'Confirm received/returned')}
                                      >
                                        {flags.confirmedByMe ? 'Confirmed ✓' : 'Confirm'}
                                      </button>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedMatchId && (
        <Chat matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />
      )}
    </div>
  )
}
