import React, { useState, useEffect } from 'react'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { getToken, clearToken } from './services/auth'
import './index.css'

export default function App() {
  const [authed, setAuthed] = useState(!!getToken())

  
  useEffect(() => {
    const id = setInterval(() => {
      const t = !!getToken()
      setAuthed(prev => (prev === t ? prev : t))
    }, 500)
    return () => clearInterval(id)
  }, [])

  const handleLogout = () => {
    clearToken()
    setAuthed(false) 
  }

  const handleLogin = () => {
    setAuthed(true) 
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar onLogout={handleLogout} />
      <main className="flex-1">
        {!authed ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Dashboard onLogout={handleLogout} />
        )}
      </main>
    </div>
  )
}
