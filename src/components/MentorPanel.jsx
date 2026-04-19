import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send } from 'lucide-react'

export default function MentorPanel({ messages, isProcessing, isListening, isSpeaking, onSend, onToggleMic, isCollapsed, onExpand }) {
  const inputRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages])

  const submit = () => {
    const val = inputRef.current?.value?.trim()
    if (val) {
      onSend(val)
      inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #1a1a1a', background: '#000' }}>

      {/* Expand Handle (Mobile Only) */}
      {isCollapsed && (
        <div onClick={onExpand} style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2 }} />
        </div>
      )}

      {/* Header — Hacker Logo */}
      {!isCollapsed && (
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #111', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            {/* Spinning ring when processing */}
            {isProcessing && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: -6, border: '2px dashed #3b82f6', borderRadius: '50%', opacity: 0.5 }} />
            )}
            {/* Glow pulse when speaking */}
            <motion.div
              animate={{ boxShadow: isSpeaking ? ['0 0 10px #3b82f6', '0 0 24px #3b82f6', '0 0 10px #3b82f6'] : '0 0 8px rgba(59,130,246,0.1)' }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid #3b82f6', overflow: 'hidden' }}
            >
              <img src="/logo.png" alt="Indie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.12em' }}>INDIE</div>
            <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, letterSpacing: 2, marginTop: 3 }}>LOGIC MENTOR v1.0</div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div style={{ padding: '6px 20px', borderBottom: '1px solid #111', height: 30, flexShrink: 0, display: (!isCollapsed || isListening || isSpeaking || isProcessing) ? 'block' : 'none' }}>
        <AnimatePresence mode="wait">
          {isListening && (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ color: '#3b82f6', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
              ● LISTENING...
            </motion.div>
          )}
          {isSpeaking && !isListening && (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }} exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ color: '#34d399', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
              ▶ SPEAKING...
            </motion.div>
          )}
          {isProcessing && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ color: '#f59e0b', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
              ⟳ PROCESSING...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message log */}
      {!isCollapsed && (
        <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: m.role === 'user' ? '#444' : '#3b82f6' }}>
                {m.role === 'user' ? 'YOU' : 'INDIE'}
              </div>
              <div style={{
                padding: '10px 14px', maxWidth: '88%', fontSize: 13, lineHeight: 1.6,
                backgroundColor: m.role === 'user' ? '#111' : 'transparent',
                border: m.role === 'user' ? 'none' : '1px solid #1e1e1e',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              }}>
                {m.content}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #111', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0a0a0a', border: '1px solid #222', borderRadius: 100, padding: '6px 6px 6px 16px' }}>
          <input
            ref={inputRef}
            placeholder="Ask Indie anything..."
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: 13 }}
          />
          <button onClick={submit} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Send size={15} />
          </button>
          <button onClick={onToggleMic} style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: isListening ? '#3b82f6' : '#111',
            color: isListening ? '#fff' : '#555',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
