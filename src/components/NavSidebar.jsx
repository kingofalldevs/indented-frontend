import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, User, Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

export default function NavSidebar({ isOpen, onClose, user, onLogin, onLogout }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #3b82f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/logo.png" alt="Indie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {user ? user.displayName || 'Student' : 'Guest Account'}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>
                    {user ? 'PREMIUM ACCESS' : 'NOT LOGGED IN'}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              {!user && (
                <button 
                  onClick={onLogin}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '14px 16px',
                    background: '#fff', border: 'none', borderRadius: 8, color: '#000',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 20
                  }}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: 18 }} />
                  Login with Google
                </button>
              )}

              <MenuLink icon={<User size={18} />} label="My Profile" disabled={!user} />
              <MenuLink icon={<Settings size={18} />} label="Settings" />
              <MenuLink icon={<HelpCircle size={18} />} label="Help & Support" />
              
              {user && (
                <div style={{ marginTop: 'auto', borderTop: '1px solid #111', paddingTop: 12 }}>
                  <MenuLink 
                    icon={<LogOut size={18} />} 
                    label="Sign Out" 
                    onClick={onLogout}
                    color="#ef4444" 
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px', borderTop: '1px solid #111', fontSize: 10, color: '#333', textAlign: 'center', letterSpacing: 1 }}>
              INDIE LOGIC v1.0.4
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
