import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, User, Settings, HelpCircle, LogOut, ChevronRight, BookOpen, ArrowLeft, Check } from 'lucide-react';
import { modules } from '../data/curriculum';

export default function NavSidebar({ isOpen, onClose, user, onLogin, onLogout, completedModules = [] }) {
  const [activeView, setActiveView] = useState('main'); // 'main' | 'curriculum' | 'module'
  const [selectedModule, setSelectedModule] = useState(null);

  const handleModuleClick = (m) => {
    setSelectedModule(m);
    setActiveView('module');
  };

  const closeSidebar = () => {
    onClose();
    setTimeout(() => setActiveView('main'), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
            }}
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: 320,
              background: '#050505',
              borderRight: '1px solid #1a1a1a',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '20px 0 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #111' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {activeView !== 'main' ? (
                  <button 
                    onClick={() => setActiveView(activeView === 'module' ? 'curriculum' : 'main')}
                    style={{ background: '#111', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #3b82f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo.png" alt="Nova" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {activeView === 'main' ? (user ? user.displayName || 'Student' : 'Guest Account') : (activeView === 'curriculum' ? 'Learning Path' : `Module ${selectedModule.id}`)}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>
                    {activeView === 'main' ? (user ? 'PREMIUM ACCESS' : 'NOT LOGGED IN') : 'C++ FOR BEGINNERS'}
                  </div>
                </div>
              </div>
              <button 
                onClick={closeSidebar}
                style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 12px' }}>
              <AnimatePresence mode="wait">
                {activeView === 'main' && (
                  <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {!user && (
                      <button onClick={onLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '14px 16px', background: '#fff', border: 'none', borderRadius: 8, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 20 }}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: 18 }} />
                        Login with Google
                      </button>
                    )}
                    <div style={{ color: '#333', fontSize: 9, fontWeight: 800, letterSpacing: 1, marginBottom: 10, paddingLeft: 12 }}>ACADEMY</div>
                    <MenuLink icon={<BookOpen size={18} color="#3b82f6" />} label="Learning Path" onClick={() => setActiveView('curriculum')} />
                    
                    <div style={{ color: '#333', fontSize: 9, fontWeight: 800, letterSpacing: 1, marginTop: 24, marginBottom: 10, paddingLeft: 12 }}>ACCOUNT</div>
                    <MenuLink icon={<User size={18} />} label="My Profile" disabled={!user} />
                    <MenuLink icon={<Settings size={18} />} label="Settings" />
                  </motion.div>
                )}

                {activeView === 'curriculum' && (
                  <motion.div key="curriculum" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    {modules.map((m) => {
                      const isCompleted = completedModules.includes(m.id);
                      return (
                        <button 
                          key={m.id}
                          onClick={() => handleModuleClick(m)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '16px',
                            background: '#0a0a0a', border: isCompleted ? '1px solid #3b82f633' : '1px solid #111', borderRadius: 12, color: '#fff',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 10,
                            transition: 'all 0.2s',
                            opacity: isCompleted ? 0.8 : 1
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#0e0e0e'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = isCompleted ? '#3b82f633' : '#111'; e.currentTarget.style.background = '#0a0a0a'; }}
                        >
                          <div style={{ 
                            width: 24, height: 24, borderRadius: '50%', background: isCompleted ? '#3b82f622' : '#111', 
                            color: isCompleted ? '#27c93f' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: 10, fontWeight: 900 
                          }}>
                            {isCompleted ? <Check size={14} /> : m.id}
                          </div>
                          <span style={{ flex: 1 }}>{m.title.split('—')[1] || m.title}</span>
                          {isCompleted ? <Check size={14} color="#27c93f" style={{ opacity: 0.6 }} /> : <ChevronRight size={14} style={{ opacity: 0.3 }} />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {activeView === 'module' && selectedModule && (
                  <motion.div key="module" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                    <div style={{ background: '#0a0a0a', padding: 20, borderRadius: 12, border: '1px solid #111' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#3b82f6' }}>{selectedModule.title}</h3>
                      <div style={{ 
                        fontSize: 14, color: '#aaa', lineHeight: 1.7, whiteSpace: 'pre-wrap', 
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>
                        {selectedModule.notes}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #111', padding: 12 }}>
              {activeView === 'main' && user && (
                <MenuLink icon={<LogOut size={18} />} label="Sign Out" onClick={onLogout} color="#ef4444" />
              )}
              <div style={{ padding: '8px', fontSize: 10, color: '#222', textAlign: 'center', letterSpacing: 1 }}>
                NOVA ACADEMY v1.0.5
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuLink({ icon, label, onClick, color = '#aaa', disabled = false }) {
  return (
    <button 
      onClick={!disabled ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 16px',
        background: 'none', border: 'none', borderRadius: 6, color: disabled ? '#222' : color,
        fontSize: 13, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = '#0a0a0a')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = 'none')}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {!disabled && <ChevronRight size={14} style={{ opacity: 0.3 }} />}
    </button>
  );
}
