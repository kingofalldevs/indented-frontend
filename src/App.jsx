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
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'System online. I am Indie — your C++ logic mentor. Ask me anything or speak to begin.' }
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

  const handleMessage = useCallback(async (text) => {
    if (!text.trim() || isProcessing) return
    cancel()
    setVoiceLoop(true)
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
          user_name: user?.displayName || 'Student'
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

      // Extract code blocks
      const cm = full.match(/\[\[CODE:\s*([\s\S]*?)\]\]/)
      if (cm) setCode(cm[1].trim())

      const clean = full.replace(/\[\[CODE:[\s\S]*?\]\]/g, '').trim()
      setMessages(prev => [...prev, { role: 'assistant', content: clean }])
      speak(clean)
    } catch {
      const fallback = 'I am offline right now. Start the backend and try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
      speak(fallback)
    } finally {
      setIsProcessing(false)
    }
  }, [messages, isProcessing, cancel, speak])

  const { isListening, start, stop } = useListen(handleMessage)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return () => unsub()
  }, [])

  // Auto re-listen after Indie finishes speaking
  useEffect(() => {
    if (voiceLoop && !isSpeaking && !isProcessing && !isListening) {
      const t = setTimeout(start, 600)
      return () => clearTimeout(t)
    }
  }, [voiceLoop, isSpeaking, isProcessing, isListening, start])

  const toggleMic = () => {
    if (isSpeaking) cancel()
    else if (isListening) stop()
    else { setVoiceLoop(true); start() }
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

      {/* Sidebar Toolrail - Hidden on mobile, or just keep it and add hamburger somewhere else? Let's keep it but adjust layout if needed. Actually we'll keep it so users can sign in */}
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

      {/* Floating Hamburger for Mobile */}
      {isMobile && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ position: 'absolute', top: 16, left: 16, zIndex: 40, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: 8, color: '#fff', cursor: 'pointer', display: 'flex' }}>
          <Menu size={20} />
        </button>
      )}

      {/* IDE Board */}
      <div style={{ flex: 1, padding: isMobile ? '70px 10px 10px' : 20, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, paddingBottom: isMobile ? 120 : 20 }}>
        <IDE code={code} onCodeChange={setCode} />
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
