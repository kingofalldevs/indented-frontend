import React, { useState, useRef, useEffect } from 'react'

// Custom regex-based C++ highlighter — Tag-Aware to prevent render artifacts
function highlight(raw) {
  // Step 1: HTML-escape
  let h = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Step 2: strings first
  h = h.replace(/"([^"]*)"/g, "<span class='tok-str'>\"$1\"</span>")

  // Helper to highlight words while IGNORING existing HTML tags
  const safeReplace = (text, regex, className) => {
    return text.replace(new RegExp(`(<[^>]+>)|${regex}`, 'g'), (match, tag) => {
      return tag ? tag : `<span class='${className}'>${match}</span>`;
    });
  }

  // Step 3: comments
  h = h.replace(/(\/\/[^\n]*)/g, "<span class='tok-comment'>$1</span>")

  // Step 4: keywords (with tag-shielding)
  h = safeReplace(h, '\\b(#include|int|float|double|char|bool|void|return|if|else|for|while|class|struct|namespace|using|auto|const|new|delete|public|private)\\b', 'tok-kw');

  // Step 5: operators & stdlib (with tag-shielding)
  h = safeReplace(h, '(&lt;&lt;|&gt;&gt;|::)', 'tok-op');
  h = safeReplace(h, '\\b(std|cout|cin|endl|string|vector)\\b', 'tok-std');
  h = safeReplace(h, '\\b(\\d+\\.?\\d*)\\b', 'tok-num');

  return h
}



export default function IDE({ code, onCodeChange, errorLines = [], onClearError }) {
  const [localCode, setLocalCode] = useState(code || '')
  const [terminal, setTerminal] = useState([{ type: 'sys', text: 'Indie Runtime v1.0 · Ready.' }])
  const [running, setRunning] = useState(false)
  const [pendingInput, setPendingInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [fullStdin, setFullStdin] = useState('')
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false)
  const textareaRef = useRef(null)
  const preRef = useRef(null)
  const highlightRef = useRef(null)
  const accumulatedStdoutRef = useRef('')

  useEffect(() => {
    if (code !== undefined && code !== localCode) setLocalCode(code)
  }, [code])

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop
      preRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    setLocalCode(val)
    if (onCodeChange) onCodeChange(val)
  }

  // Senior Feature: Tab Key Interceptor
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      
      const newVal = val.substring(0, start) + "    " + val.substring(end);
      setLocalCode(newVal);
      if (onCodeChange) onCodeChange(newVal);
      
      // Set cursor position in next tick
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  }

  const executeBackend = async (stdin, isInteractive = false) => {
    setPendingInput(false)
    setInputValue('')
    setRunning(true)
    
    // Accumulate stdin
    const newFullStdin = isInteractive ? (fullStdin + stdin + "\n") : ""
    setFullStdin(newFullStdin)
    
    // Manage terminal display
    if (isInteractive) {
      if (stdin !== undefined && stdin !== null) {
        setTerminal(p => [...p, { type: 'in', text: stdin }])
      }
    } else {
      setTerminal(p => [...p, { type: 'sys', text: '$ g++ main.cpp -o main && ./main' }])
      accumulatedStdoutRef.current = ''
    }
    
    try {
      const RENDER_BACKEND = "https://indented-backend.onrender.com";
      const apiUrl = import.meta.env.VITE_API_URL || RENDER_BACKEND;
      const fetchUrl = import.meta.env.DEV 
        ? '/api/run' 
        : (apiUrl ? `${apiUrl.replace(/\/$/, '')}/api/run` : '/api/run');
        
      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: localCode, stdin: newFullStdin })
      })
      
      if (!res.ok) {
        throw new Error(`Backend returned a ${res.status} error.`)
      }
      
      const data = await res.json()
      
      let fullOut = data.output || ""
      let prevOut = accumulatedStdoutRef.current
      let newOut = fullOut

      let isFallback = false;
      if (isInteractive) {
        if (fullOut.startsWith(prevOut)) {
          newOut = fullOut.substring(prevOut.length)
        } else {
          isFallback = true;
        }
      }
      
      accumulatedStdoutRef.current = fullOut
      
      let linesToAppend = []
      if (isFallback) {
         linesToAppend.push({ type: 'sys', text: '--- context reset (non-deterministic output detected) ---' })
      }
      
      if (newOut) {
        if (newOut.endsWith('\n')) newOut = newOut.slice(0, -1)
        const mapped = newOut.split('\n').map(t => ({ type: 'out', text: t }))
        linesToAppend = [...linesToAppend, ...mapped]
      }
      
      setTerminal(p => [...p, ...linesToAppend])

      if (data.waiting_for_input) {
        setPendingInput(true);
      } else {
        setTerminal(p => [...p, { type: 'sys', text: 'Process exited with code 0.' }])
      }
    } catch (e) {
      setTerminal(p => [
        ...p,
        { type: 'out', text: `ERROR: Backend unreachable or crashed. ${e.message}` },
        { type: 'sys', text: 'Process forcefully terminated.' }
      ])
    } finally {
      setRunning(false)
    }
  }

  const run = () => {
    setIsTerminalExpanded(true)
    executeBackend("", false)
  }

  const clearTerm = () => setTerminal([{ type: 'sys', text: 'Terminal cleared.' }])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
      {/* Titlebar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 40, background: '#050505', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {['#ff5f56', '#ffbd2e', '#27c93f'].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
        </div>
        <span style={{ color: '#444', fontSize: 11, fontFamily: 'monospace' }}>
          <span style={{ color: '#3b82f6' }}>● </span>main.cpp
        </span>
        <button onClick={run} disabled={running} style={{
          background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff',
          padding: '3px 14px', fontSize: 11, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
          opacity: running ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5
        }}>
          {running ? '▶ RUNNING...' : '▶  RUN'}
        </button>
      </div>

      {/* Editor area */}
      <div style={{ flex: 2, position: 'relative', overflow: 'hidden', background: '#000' }}>
        {/* Error Underline Layer */}
        <div 
          ref={highlightRef}
          style={{ position: 'absolute', inset: 0, padding: 20, pointerEvents: 'none', zIndex: 4, overflow: 'auto', whiteSpace: 'pre' }}>
          {/* Invisible spacer to match editor height for scrolling */}
          <div style={{ height: localCode.split('\n').length * (15 * 1.75) + 40 }} />
          
          {errorLines.map((lineNum, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: (lineNum - 1) * (15 * 1.75) + 20,
              left: 20,
              right: 20,
              height: (15 * 1.75),
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '2px solid #ef4444',
              zIndex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pointerEvents: 'none' // Important: pass-through by default
            }}>
              <div style={{ pointerEvents: 'auto' }}> {/* Only make the button area clickable */}
                <button 
                  onClick={() => onClearError && onClearError(lineNum)}
                  style={{ 
                    background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, 
                    fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginRight: 10,
                    fontWeight: 900
                  }}>
                  REMOVE
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <pre ref={preRef} aria-hidden style={{
          position: 'absolute', inset: 0, margin: 0, padding: 20,
          fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 15, lineHeight: '1.75',
          color: '#e5e7eb', whiteSpace: 'pre', overflow: 'auto', pointerEvents: 'none', background: 'transparent',
          zIndex: 2
        }} dangerouslySetInnerHTML={{ __html: highlight(localCode) }} />
        <textarea 
          ref={textareaRef} 
          value={localCode} 
          onChange={handleChange} 
          onKeyDown={handleKeyDown}
          onScroll={syncScroll} 
          spellCheck={false} 
          wrap="off"
          style={{
            position: 'absolute', inset: 0, margin: 0, padding: 20,
            fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 15, lineHeight: '1.75',
            color: 'transparent', caretColor: '#3b82f6', background: 'transparent',
            border: 'none', outline: 'none', resize: 'none', overflow: 'auto', whiteSpace: 'pre',
            zIndex: 3
          }} 
        />
      </div>

      {/* Terminal */}
      <div style={{ 
        height: isTerminalExpanded ? 180 : 32, 
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0, 
        minHeight: 0, 
        borderTop: '2px solid #111', 
        background: '#050505', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div 
          onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '4px 12px', borderBottom: '1px solid #111', cursor: 'pointer',
            background: '#080808', flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#444', fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>TERMINAL</span>
            <span style={{ color: '#222', fontSize: 10 }}>{isTerminalExpanded ? '▼' : '▲'}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); clearTerm(); }} 
            style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 10 }}
          >
            CLR
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', minHeight: 0, opacity: isTerminalExpanded ? 1 : 0, transition: 'opacity 0.2s' }}>
          {terminal.map((l, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, color: l.type === 'out' ? '#3b82f6' : l.type === 'in' ? '#27c93f' : '#3a3a3a' }}>
              {l.type === 'sys' ? '' : l.type === 'in' ? '❯ ' : '→ '}{l.text}
            </div>
          ))}
          {pendingInput && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: '#ffbd2e', fontSize: 12, marginRight: 8, fontFamily: 'monospace' }}>❯</span>
              <input 
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeBackend(inputValue, true)
                  }
                }}
                style={{ 
                  flex: 1, background: 'transparent', border: 'none', outline: 'none', 
                  color: '#e5e7eb', fontSize: 12, fontFamily: 'monospace' 
                }} 
                placeholder="Type input and press Enter..." 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
