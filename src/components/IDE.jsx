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


function simulate(code) {
  const matches = [...code.matchAll(/cout\s*<<\s*"([^"]*)"/g)]
  if (matches.length) return matches.map(m => m[1])
  if (code.includes('int main')) return ['// Program ran with no output']
  return ['// Write some code and click RUN']
}

export default function IDE({ code, onCodeChange }) {
  const [localCode, setLocalCode] = useState(code || '')
  const [terminal, setTerminal] = useState([{ type: 'sys', text: 'Indie Runtime v1.0 · Ready.' }])
  const [running, setRunning] = useState(false)
  const textareaRef = useRef(null)
  const preRef = useRef(null)

  useEffect(() => {
    if (code !== undefined && code !== localCode) setLocalCode(code)
  }, [code])

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop
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

  const run = () => {
    setRunning(true)
    setTerminal(p => [...p, { type: 'sys', text: '$ g++ main.cpp -o main && ./main' }])
    setTimeout(() => {
      const out = simulate(localCode)
      setTerminal(p => [
        ...p,
        ...out.map(t => ({ type: 'out', text: t })),
        { type: 'sys', text: 'Process exited with code 0.' }
      ])
      setRunning(false)
    }, 750)
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
        <pre ref={preRef} aria-hidden style={{
          position: 'absolute', inset: 0, margin: 0, padding: 20,
          fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 15, lineHeight: '1.75',
          color: '#e5e7eb', whiteSpace: 'pre', overflow: 'auto', pointerEvents: 'none', background: 'transparent'
        }} dangerouslySetInnerHTML={{ __html: highlight(localCode) }} />
        <textarea 
          ref={textareaRef} 
          value={localCode} 
          onChange={handleChange} 
          onKeyDown={handleKeyDown}
          onScroll={syncScroll} 
          spellCheck={false} 
          style={{
            position: 'absolute', inset: 0, margin: 0, padding: 20,
            fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 15, lineHeight: '1.75',
            color: 'transparent', caretColor: '#3b82f6', background: 'transparent',
            border: 'none', outline: 'none', resize: 'none', overflow: 'auto', whiteSpace: 'pre'
          }} 
        />
      </div>

      {/* Terminal */}
      <div style={{ flex: '0 0 160px', borderTop: '2px solid #111', background: '#050505', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid #111' }}>
          <span style={{ color: '#444', fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>TERMINAL</span>
          <button onClick={clearTerm} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 10 }}>CLR</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          {terminal.map((l, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, color: l.type === 'out' ? '#3b82f6' : '#3a3a3a' }}>
              {l.type === 'sys' ? '' : '→ '}{l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
