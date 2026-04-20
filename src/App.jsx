import React, { useState, useCallback, useEffect } from 'react'
import IDE from './components/IDE.jsx'
import MentorPanel from './components/MentorPanel.jsx'
import NavSidebar from './components/NavSidebar.jsx'
import { auth, googleProvider } from './firebase/config'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { Menu } from 'lucide-react'

// ── Speech Synthesis ──────────────────────────────────────────────
function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis
    if (!synth || !text) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const voices = synth.getVoices()
    const english = voices.filter(v => v.lang.startsWith('en'))
    const voice = english.find(v => v.name.includes('Daniel'))
      || english.find(v => v.name.includes('Alex'))
      || english.find(v => v.name.includes('Google US English'))
      || english[0]
    if (voice) u.voice = voice
    u.rate = 0.88; u.pitch = 0.9; u.volume = 1.0
    u.onstart = () => setIsSpeaking(true)
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)
    setTimeout(() => synth.speak(u), 50)
  }, [])

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { speak, isSpeaking, cancel }
}

// ── Speech Recognition ────────────────────────────────────────────
function useListen(onResult) {
  const [isListening, setIsListening] = useState(false)
  const recRef = React.useRef(null)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    r.onstart = () => setIsListening(true)
    r.onend = () => setIsListening(false)
    r.onerror = () => setIsListening(false)
    r.onresult = (e) => { if (onResult) onResult(e.results[0][0].transcript) }
    r.start(); recRef.current = r
  }, [onResult])

  const stop = useCallback(() => {
    recRef.current?.stop(); setIsListening(false)
  }, [])

  return { isListening, start, stop }
}

// ── Main App ──────────────────────────────────────────────────────
const INITIAL_CODE = `// Indie Logic v1.0
#include <iostream>

int main() {
    std::cout << "Hello from Indented!" << std::endl;
    return 0;
}`

export default function App() {
  const [code, setCode] = useState(INITIAL_CODE)
  const [errorLines, setErrorLines] = useState([])
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'System online. I am Nova — your C++ logic mentor. Ask me anything or speak to begin.' }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [voiceLoop, setVoiceLoop] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [user, setUser] = useState(null) // Mock user state for now

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 860)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 860)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { speak, isSpeaking, cancel } = useSpeech()

  const handleMessage = useCallback(async (text, wasVoice = false) => {
    if (!text.trim() || isProcessing) return
    cancel()
    setVoiceLoop(wasVoice)
    setErrorLines([])
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsProcessing(true)

    try {
      // Hardened Production Fallback
      const RENDER_BACKEND = "https://indented-backend.onrender.com";
      const apiUrl = import.meta.env.VITE_API_URL || RENDER_BACKEND;
      // In dev, use the vite proxy so we test locally. In prod, use the external URL.
      const fetchUrl = import.meta.env.DEV 
        ? '/api/chat' 
        : (apiUrl ? `${apiUrl.replace(/\/$/, '')}/api/chat` : '/api/chat');
      
      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: messages,
          user_name: user?.displayName || 'Student',
          current_code: code
        })
      })

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
      }

      // Extract error lines
      const errorRegex = /\[\[ERROR:\s*(\d+)\s*\]\]/g
      const errorMatches = Array.from(full.matchAll(errorRegex))
      
      if (errorMatches.length > 0) {
        const lines = errorMatches.map(m => parseInt(m[1], 10))
        setErrorLines(lines)
      }

      // Hide tags from the chat bubble
      const clean = full
        .replace(/\[\[CODE:\s*([\s\S]*?)\]\]/g, (match, p1) => `(Code solution provided below)`) 
        .replace(/```(?:cpp|c\+\+|c)?\s*([\s\S]*?)```/g, '')
        .replace(errorRegex, '')
        .trim();

      setMessages(prev => [...prev, { role: 'assistant', content: clean }])
      speak(clean)
    } catch (e) {
      const fallback = 'Nova is currently offline. Please check your connection or restart the backend.'
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
      speak(fallback)
    } finally {
      setIsProcessing(false)
    }
  }, [messages, isProcessing, cancel, speak])

  const { isListening, start, stop } = useListen((t) => handleMessage(t, true))

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (voiceLoop && !isSpeaking && !isProcessing && !isListening) {
      const t = setTimeout(start, 600)
      return () => clearTimeout(t)
    }
  }, [voiceLoop, isSpeaking, isProcessing, isListening, start])

  // Clear error lines on code change IF manually changed
  const handleCodeChange = (newCode) => {
    setCode(newCode)
    if (errorLines.length > 0) setErrorLines([])
  }

  const toggleMic = () => {
    if (isListening) {
      stop();
      setVoiceLoop(false);
    } else {
      if (isSpeaking) cancel();
      setVoiceLoop(true);
      start();
    }
  }

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      setIsSidebarOpen(false)
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setIsSidebarOpen(false)
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#000', overflow: 'hidden' }}>

      {/* Sidebar Overlay */}
      <NavSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Sidebar Toolrail - LAPTOP ONLY */}
      {!isMobile && (
        <div style={{ width: 60, borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, gap: 20, flexShrink: 0 }}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.target.style.color = '#555'}>
            <Menu size={24} />
          </button>
        </div>
      )}

      {/* Auth Button Top-Left - MOBILE ONLY */}
      {isMobile && (
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 100 }}>
          {user ? (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              title={user.displayName}
              style={{ 
                background: '#0a0a0a', border: '1px solid #222', borderRadius: '50%', padding: 4, 
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} 
              />
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              style={{ 
                background: '#fff', border: 'none', borderRadius: 100, padding: '8px 16px', 
                color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.25h2.91c1.7-1.56 2.68-3.86 2.68-6.61z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
                <path fill="#FBBC05" d="M3.96 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.98H.95C.35 6.19 0 7.56 0 9s.35 2.81.95 4.02l3.01-2.3z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.5 0 2.43 2.11.95 5.12l3.01 2.3c.71-2.13 2.7-3.71 5.04-3.71z"/>
              </svg>
              Sign In
            </button>
          )}
        </div>
      )}

      {/* IDE Board */}
      <div style={{ flex: 1, padding: isMobile ? '70px 10px 10px' : 20, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, paddingBottom: isMobile ? 120 : 20 }}>
        <IDE 
          code={code} 
          onCodeChange={handleCodeChange} 
          errorLines={errorLines} 
          onClearError={(line) => setErrorLines(prev => prev.filter(l => l !== line))}
        />
      </div>

      {/* Mentor Panel Mobile Wrapper */}
      <div style={
        isMobile ? {
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: isMobileChatOpen ? '65vh' : 'auto', maxHeight: isMobileChatOpen ? 500 : 'auto', zIndex: 60,
          background: '#000', borderTop: '1px solid #222', borderTopLeftRadius: 16, borderTopRightRadius: 16,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: isMobileChatOpen ? '0 -10px 40px rgba(0,0,0,0.8)' : '0 -4px 20px rgba(0,0,0,0.5)',
          transition: 'height 0.3s ease, max-height 0.3s ease'
        } : {
          width: 380, flexShrink: 0
        }
      }>
        {isMobile && isMobileChatOpen && (
          <button onClick={() => setIsMobileChatOpen(false)} style={{
            position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', 
            color: '#555', fontSize: 24, cursor: 'pointer', zIndex: 10, lineHeight: 1
          }}>
            ×
          </button>
        )}
        <MentorPanel
          messages={messages}
          isProcessing={isProcessing}
          isListening={isListening}
          isSpeaking={isSpeaking}
          onSend={handleMessage}
          onToggleMic={toggleMic}
          isCollapsed={isMobile && !isMobileChatOpen}
          onExpand={() => setIsMobileChatOpen(true)}
        />
      </div>
    </div>
  )
}
