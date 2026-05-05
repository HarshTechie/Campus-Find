import React, { useEffect, useState, useRef } from 'react'
import { connectSocket, getSocket } from '../services/socket'
import { getToken } from '../services/auth'
import { getJSON } from '../services/api'

export default function Chat({ matchId, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const listRef = useRef(null)
  const token = getToken()

  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!matchId) return
    setError(null)
    setLoading(true)

    const socketWrapper = connectSocket()
    if (!socketWrapper) {
      setError('Socket not available. Are you signed in?')
      setLoading(false)
      return
    }

    const socket = (typeof socketWrapper.on === 'function') ? socketWrapper : (socketWrapper && socketWrapper.socket && typeof socketWrapper.socket.on === 'function' ? socketWrapper.socket : socketWrapper)
    if (!socket) {
      console.error('Chat: invalid socket object', socketWrapper)
      setError('Socket connection error (invalid socket object).')
      setLoading(false)
      return
    }

    function handleConnect() { console.log('socket connected', socket.id) }
    function handleDisconnect(reason) { console.log('socket disconnected', reason) }
    function handleConnectError(err) { console.log('socket connect_error', err && err.message); }
    function handleMessageNew(payload) {
      const msg = payload && payload.msg ? payload.msg : payload
      setMessages(prev => [...prev, msg])
    }

    function handleMatchCancelled(payload) {
      if (!payload) return
      if (payload.matchId === matchId || payload.lostRequestId === matchId || payload.foundRequestId === matchId) {
        // match cancelled/affected -> notify user and close
        setError('This match was cancelled or closed. Chat is no longer available.')
        setTimeout(() => {
          if (typeof onClose === 'function') onClose()
          else setVisible(false)
        }, 1200)
      }
    }

    function handleMatchUpdated(payload) {
      if (!payload) return
      if (payload.matchId === matchId && payload.status && payload.status !== 'open') {
        setError('This match status changed — chat will close.')
        setTimeout(() => {
          if (typeof onClose === 'function') onClose()
          else setVisible(false)
        }, 1200)
      }
    }

    if (typeof socket.on === 'function') {
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      socket.on('connect_error', handleConnectError)
      socket.on('message:new', handleMessageNew)
      socket.on('match:cancelled', handleMatchCancelled)
      socket.on('match:updated', handleMatchUpdated)
      socket.on('match:closed', handleMatchCancelled)
      socket.on('error', (d) => {
        // server side socket errors sometimes arrive here
        console.warn('socket error event', d)
        const msg = (d && d.message) ? d.message : (typeof d === 'string' ? d : null)
        if (msg) setError(msg)
      })
    } else if (typeof socket.addEventListener === 'function') {
      socket.addEventListener('message:new', handleMessageNew)
      // addEventListener for custom events might not be available cross libs; keep minimum
    }

    try {
      if (typeof socket.emit === 'function') socket.emit('join', { matchId })
      else if (typeof socket.dispatchEvent === 'function') socket.dispatchEvent(new CustomEvent('join', { detail: { matchId } }))
    } catch (e) {
      console.error('emit join failed', e)
    }

    (async () => {
      try {
        const res = await getJSON(`/api/matches/${matchId}/messages`, token)
        if (!res) throw new Error('Empty response fetching messages')
        setMessages(res.messages || [])
      } catch (err) {
        console.error('Failed to load chat history', err)
        setError('Failed to load chat history: ' + (err.message || err))
      } finally {
        setLoading(false)
      }
    })()

    return () => {
      try {
        if (typeof socket.off === 'function') {
          socket.off('message:new', handleMessageNew)
          socket.off('connect', handleConnect)
          socket.off('disconnect', handleDisconnect)
          socket.off('connect_error', handleConnectError)
          socket.off('match:cancelled', handleMatchCancelled)
          socket.off('match:updated', handleMatchUpdated)
          socket.off('match:closed', handleMatchCancelled)
        } else if (typeof socket.removeEventListener === 'function') {
          socket.removeEventListener('message:new', handleMessageNew)
        }
      } catch (e) {}
    }
  }, [matchId, token])

  useEffect(() => {
    try { listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) } catch (e) {}
  }, [messages])

  const send = () => {
    if (!text || text.trim() === '') return
    const sock = getSocket()
    const realSock = (sock && typeof sock.emit === 'function') ? sock : (sock && sock.socket ? sock.socket : null)
    if (!realSock || !realSock.connected) {
      alert('Socket not connected — cannot send message')
      return
    }
    try {
      if (typeof realSock.emit === 'function') realSock.emit('message:send', { matchId, text })
      else if (typeof realSock.dispatchEvent === 'function') realSock.dispatchEvent(new CustomEvent('message:send', { detail: { matchId, text } }))
      else console.warn('Chat: cannot emit message:send on socket')
    } catch (e) {
      console.warn('message emit failed', e)
    }
    setText('')
  }

  const handleClose = () => {
    if (typeof onClose === 'function') onClose()
    else setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dim board */}
      <div className="absolute inset-0 bg-ink/60" onClick={handleClose} />

      {/* Sticky-note pinned over the board */}
      <div className="relative bg-paper-note w-full max-w-md max-h-[85vh] flex flex-col border-2 border-ink shadow-flyer animate-fade-in pin-dot">

        {/* Header */}
        <div className="flex items-baseline justify-between px-5 pt-5 pb-4 border-b-2 border-dashed border-ink/30">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-tracked text-accent mb-1">
              ✉ Note
            </p>
            <h3 className="font-display text-[20px] font-extrabold text-ink leading-tight">
              Quick chat
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="font-mono text-[11px] uppercase tracking-tracked-tight text-ink-2 hover:text-accent underline-offset-4 hover:underline"
          >
            Close ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="font-sans italic text-ink-3 text-center py-8">Loading…</p>
          ) : error ? (
            <div className="bg-accent text-board px-3 py-2 inline-block transform -rotate-1">
              <p className="font-display font-extrabold text-[12px] uppercase tracking-tracked-tight">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-display text-[20px] font-bold text-ink leading-snug">
                No messages yet.
              </p>
              <p className="font-sans italic text-[13px] text-ink-2 mt-2">
                Say hello — see if it's the right one.
              </p>
            </div>
          ) : (
            <div>
              {messages.map((m, idx) => (
                <div
                  key={m._id || idx}
                  className={idx > 0 ? 'pt-4 mt-4 border-t border-dashed border-ink/20' : ''}
                >
                  <div className="flex items-baseline justify-between mb-1.5 gap-3">
                    <span className="font-display font-bold text-[13px] text-ink">
                      {m.sender?.name || m.sender?.email || (m.sender || 'Unknown')}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="font-sans text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                </div>
              ))}
              <div ref={listRef} />
            </div>
          )}
        </div>

        {/* Compose */}
        <div className="border-t-2 border-dashed border-ink/30 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <input
              className="flex-1 bg-transparent border-0 border-b-2 border-ink/30 pb-1.5 font-sans text-[14px] text-ink placeholder-ink-3/70 focus:outline-none focus:border-accent transition-colors duration-150"
              placeholder="Write a quick reply…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="font-display font-extrabold text-[12px] uppercase tracking-tracked-tight text-ink hover:text-accent transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed underline-offset-4 hover:underline whitespace-nowrap"
            >
              Send →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
