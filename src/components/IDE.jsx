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
  const [terminalHeight, setTerminalHeight] = useState(180)
  const [isDragging, setIsDragging] = useState(false)
  const [execTime, setExecTime] = useState(null)
  const [exitCode, setExitCode] = useState(null)
  const termBodyRef = useRef(null)
  const textareaRef = useRef(null)
  const preRef = useRef(null)
  const highlightRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const accumulatedStdoutRef = useRef('')

  useEffect(() => {
    if (code !== undefined && code !== localCode) setLocalCode(code)
  }, [code])

  const syncScroll = () => {
    const top = textareaRef.current.scrollTop
    const left = textareaRef.current.scrollLeft

    if (preRef.current) {
      preRef.current.scrollTop = top
      preRef.current.scrollLeft = left
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = top
      highlightRef.current.scrollLeft = left
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = top
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
    setExitCode(null)
    const t0 = Date.now()
    
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
      
      if (!res.ok) throw new Error(`Backend returned a ${res.status} error.`)
      
      const data = await res.json()
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
      setExecTime(elapsed)
      
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
      if (isFallback) linesToAppend.push({ type: 'sys', text: '--- context reset ---' })

      // Parse compiler errors from g++ output: format is "main.cpp:LINE:COL: error: msg"
      const compilerErrorLines = []
      if (newOut) {
        if (newOut.endsWith('\n')) newOut = newOut.slice(0, -1)
        const parsed = newOut.split('\n').map(t => {
          const errMatch = t.match(/[\w.]+:(\d+):\d+:\s*(error|warning|note):\s*(.*)/)
          if (errMatch) {
            const lineNum = parseInt(errMatch[1], 10)
            const level = errMatch[2]
            if (level === 'error') compilerErrorLines.push(lineNum)
            return { type: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'note', text: t, line: lineNum }
          }
          return { type: 'out', text: t }
        })
        linesToAppend = [...linesToAppend, ...parsed]
      }

      // Fire red highlights for compiler errors
      if (compilerErrorLines.length > 0) {
        if (onClearError) compilerErrorLines.forEach(l => {}) // clear is handled separately
        setErrorLines(prev => [...new Set([...prev, ...compilerErrorLines])])
      }
      
      setTerminal(p => [...p, ...linesToAppend])

      if (data.waiting_for_input) {
        setPendingInput(true);
      } else {
        const code = data.exit_code ?? 0
        setExitCode(code)
        setTerminal(p => [...p, { 
          type: code === 0 ? 'success' : 'error_exit', 
          text: code === 0 ? `Process exited successfully. (${elapsed}s)` : `Process exited with code ${code}. (${elapsed}s)` 
        }])
      }
    } catch (e) {
      setExecTime(null)
      setTerminal(p => [
        ...p,
        { type: 'error', text: `ERROR: Backend unreachable or crashed. ${e.message}` },
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

  const clearTerm = () => {
    setTerminal([{ type: 'sys', text: 'Terminal cleared.' }])
    setExitCode(null)
    setExecTime(null)
  }

  // Auto-scroll terminal body
  useEffect(() => {
    if (termBodyRef.current) termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight
  }, [terminal])

  // Drag-to-resize the terminal
  const onDragStart = (e) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = terminalHeight
    const onMove = (ev) => setTerminalHeight(Math.min(500, Math.max(80, startH - (ev.clientY - startY))))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

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
      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#000' }}>
        {/* Gutter */}
        <div ref={lineNumbersRef} style={{ 
          width: 45, background: '#050505', borderRight: '1px solid #111', 
          padding: '20px 0', color: '#333', textAlign: 'center', 
          fontFamily: '"JetBrains Mono", monospace', fontSize: 15, lineHeight: '1.75', 
          overflow: 'hidden', userSelect: 'none', flexShrink: 0
        }}>
          {localCode.split('\n').map((_, i) => (
            <div key={i} style={{ color: errorLines.includes(i + 1) ? '#ef4444' : '#333', fontWeight: errorLines.includes(i + 1) ? 900 : 400 }}>{i + 1}</div>
          ))}
        </div>

        {/* Core Editor Viewport */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Error Underline Layer */}
          <div 
            ref={highlightRef}
            style={{ position: 'absolute', inset: 0, padding: 20, pointerEvents: 'none', zIndex: 4, overflow: 'auto', whiteSpace: 'pre' }}>
            {/* Invisible spacer to match editor height for scrolling */}
            <div style={{ height: (localCode.split('\n').length + 5) * (15 * 1.75) }} />
            
            {errorLines.map((lineNum, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: (lineNum - 1) * (15 * 1.75) + 20,
                left: 0,
                right: 0,
                height: (15 * 1.75),
                background: 'rgba(239, 68, 68, 0.15)',
                borderBottom: '2px solid #ef4444',
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pointerEvents: 'none'
              }}>
                <div style={{ pointerEvents: 'auto' }}>
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
      </div>

      {/* Terminal */}
      <div style={{ 
        height: isTerminalExpanded ? terminalHeight : 32, 
        transition: isDragging ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0, minHeight: 0, background: '#050505', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Drag Handle */}
        {isTerminalExpanded && (
          <div 
            onMouseDown={onDragStart}
            style={{ height: 4, cursor: 'ns-resize', background: '#0f0f0f', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}
          />
        )}

        {/* Header bar */}
        <div 
          onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '0 12px', height: 28, cursor: 'pointer', background: '#070707', flexShrink: 0,
            borderTop: isTerminalExpanded ? 'none' : '1px solid #111'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#3a3a3a', fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}>TERMINAL</span>
            {exitCode !== null && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '1px 6px', borderRadius: 3,
                background: exitCode === 0 ? '#27c93f22' : '#ef444422',
                color: exitCode === 0 ? '#27c93f' : '#ef4444',
                border: `1px solid ${exitCode === 0 ? '#27c93f44' : '#ef444444'}`
              }}>
                {exitCode === 0 ? '✓ SUCCESS' : `✗ EXIT ${exitCode}`}
              </span>
            )}
            {running && (
              <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 800, letterSpacing: 1, padding: '1px 6px', borderRadius: 3, background: '#3b82f622', border: '1px solid #3b82f644' }}>⟳ RUNNING...</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {execTime && !running && (
              <span style={{ fontSize: 9, color: '#333', letterSpacing: 0.5 }}>{execTime}s</span>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); clearTerm(); }} 
              style={{ background: 'none', border: 'none', color: '#2a2a2a', cursor: 'pointer', fontSize: 10, letterSpacing: 1, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#2a2a2a'}
            >
              CLR
            </button>
            <span style={{ color: '#222', fontSize: 12 }}>{isTerminalExpanded ? '▼' : '▲'}</span>
          </div>
        </div>

        {/* Body */}
        <div 
          ref={termBodyRef}
          style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', minHeight: 0, background: '#050505' }}
        >
          {terminal.map((l, i) => {
            const colorMap = {
              out: '#c9d1d9',
              in: '#27c93f',
              sys: '#2a2a2a',
              error: '#ef4444',
              warning: '#f59e0b',
              note: '#60a5fa',
              success: '#27c93f',
              error_exit: '#ef4444'
            }
            const prefixMap = {
              out: '',
              in: '❯ ',
              sys: '  ',
              error: '✗ ',
              warning: '⚠ ',
              note: '  ',
              success: '✓ ',
              error_exit: '✗ '
            }
            const isClickableError = (l.type === 'error' || l.type === 'warning') && l.line
            return (
              <div 
                key={i} 
                onClick={() => isClickableError && setErrorLines(prev => [...new Set([...prev, l.line])])}
                style={{ 
                  fontFamily: '"JetBrains Mono", monospace', 
                  fontSize: 12, 
                  lineHeight: 1.9, 
                  color: colorMap[l.type] || '#c9d1d9',
                  cursor: isClickableError ? 'pointer' : 'default',
                  padding: '0 4px',
                  borderRadius: 3,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => isClickableError && (e.currentTarget.style.background = '#ef444411')}
                onMouseLeave={e => isClickableError && (e.currentTarget.style.background = 'none')}
              >
                <span style={{ opacity: 0.4, marginRight: 4 }}>{prefixMap[l.type]}</span>
                {l.text}
              </div>
            )
          })}
          {pendingInput && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: '#27c93f', fontSize: 12, marginRight: 8, fontFamily: 'monospace' }}>❯</span>
              <input 
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') executeBackend(inputValue, true) }}
                style={{ 
                  flex: 1, background: 'transparent', border: 'none', outline: 'none', 
                  color: '#e5e7eb', fontSize: 12, fontFamily: '"JetBrains Mono", monospace'
                }} 
                placeholder="Type and press Enter..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


