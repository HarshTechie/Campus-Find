import React, { useState } from 'react'
import { postJSON } from '../services/api'
import { getToken } from '../services/auth'

export default function CreateRequest({ kind = 'lost', onCreated }) {
  const [form, setForm] = useState({ category: 'electronics', title: '', description: '', locationText: '', tags: '' })
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const payload = {
        kind,
        category: form.category,
        title: form.title,
        description: form.description,
        locationText: form.locationText,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      const token = getToken()
      const res = await postJSON('/api/requests', payload, token)
      if (res && res.request) {
        setSuccessMsg('Pinned to the board.')
        onCreated && onCreated(res.request)

      } else {
        setErrorMsg('Could not pin to the board.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to pin. Try again.')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccessMsg(null), 4000)
    }
  }

  const isLost = kind === 'lost'

  const inputClass = "w-full bg-transparent border-0 border-b-2 border-ink/30 pb-2 font-sans text-[15px] text-ink placeholder-ink-3/70 focus:outline-none focus:border-accent transition-colors duration-150"
  const labelClass = "block font-mono text-[10px] uppercase tracking-tracked text-ink-2 mb-2"

  return (
    <div
      className={`relative pin-dot border-2 border-ink shadow-flyer mx-2 ${isLost ? 'bg-paper-lost' : 'bg-paper-found'}`}
    >
      <div className="p-6 sm:p-7">
        <p className={`font-mono text-[10px] uppercase tracking-tracked mb-2 ${isLost ? 'text-accent' : 'text-ink'}`}>
          {isLost ? '⚠ New missing flyer' : '✓ New found tag'}
        </p>
        <h3 className="font-display text-[24px] sm:text-[28px] font-extrabold text-ink leading-tight">
          {isLost ? 'What did you lose?' : 'What did you find?'}
        </h3>
        <p className="font-sans text-[13px] text-ink-2 mt-1.5 mb-7 leading-relaxed">
          Fill in the blanks — we'll pin it to the board.
        </p>

        {successMsg && (
          <div className="mb-5 inline-block bg-ink text-paper-lost px-3 py-1.5 transform -rotate-1">
            <p className="font-display font-extrabold text-[13px] uppercase tracking-tracked-tight">
              ✓ {successMsg}
            </p>
          </div>
        )}
        {errorMsg && (
          <div className="mb-5 inline-block bg-accent text-board px-3 py-1.5 transform -rotate-1">
            <p className="font-display font-extrabold text-[13px] uppercase tracking-tracked-tight">
              ✗ {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-6">
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option value="electronics">Electronics</option>
                <option value="jewellery">Jewellery</option>
                <option value="documents">Documents</option>
                <option value="purse">Purse / money</option>
                <option value="accessories">Accessories</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Title</label>
              <input
                className={inputClass}
                placeholder="Blue North Face backpack"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="What did it look like? Any distinguishing details?"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Location</label>
              <input
                className={inputClass}
                placeholder="Library, Block C"
                value={form.locationText}
                onChange={e => setForm({ ...form, locationText: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Tags</label>
              <input
                className={inputClass}
                placeholder="blue, leather, small"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-9">
            <button
              type="submit"
              className="bg-accent text-board border-2 border-ink px-5 py-2.5 font-display font-extrabold text-[13px] uppercase tracking-tracked-tight shadow-stamp hover:bg-ink hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Pinning…' : '↑ Pin to board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
