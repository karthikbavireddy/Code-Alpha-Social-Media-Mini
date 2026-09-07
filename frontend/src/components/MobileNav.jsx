import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Compass, PlusCircle, User as UserIcon, LogIn, MessageSquare } from 'lucide-react';

export default function MobileNav({ currentTab, setCurrentTab, onOpenNewPost, onOpenProfile }) {
  const { user, isAuthenticated } = useAuth();

  return (
    <nav
      className="mobile-nav-bar"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '480px',
        margin: '0 auto',
        height: '62px',
        background: 'rgba(18, 20, 32, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 999,
        padding: '0 12px',
      }}
    >
      <button
        onClick={() => setCurrentTab('feed')}
        style={{
          background: 'transparent',
          border: 'none',
          color: currentTab === 'feed' ? 'var(--primary)' : 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          cursor: 'pointer',
        }}
      >
        <Home size={22} />
        <span style={{ fontSize: '0.68rem', fontWeight: '600' }}>Feed</span>
      </button>

      <button
        onClick={() => setCurrentTab('explore')}
        style={{
          background: 'transparent',
          border: 'none',
          color: currentTab === 'explore' ? 'var(--primary)' : 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          cursor: 'pointer',
        }}
      >
        <Compass size={22} />
        <span style={{ fontSize: '0.68rem', fontWeight: '600' }}>Explore</span>
      </button>

      {isAuthenticated && (
        <button
          onClick={onOpenNewPost}
          style={{
            background: 'var(--gradient-brand)',
            border: 'none',
            color: '#fff',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45)',
            transform: 'translateY(-6px)',
            cursor: 'pointer',
          }}
        >
          <PlusCircle size={24} />
        </button>
      )}

      {isAuthenticated && (
        <button
          onClick={() => setCurrentTab('messages')}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentTab === 'messages' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer',
          }}
        >
          <MessageSquare size={22} />
          <span style={{ fontSize: '0.68rem', fontWeight: '600' }}>Chat</span>
        </button>
      )}

      {isAuthenticated ? (
        <button
          onClick={() => onOpenProfile(user?.username)}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer',
          }}
        >
          <UserIcon size={22} />
          <span style={{ fontSize: '0.68rem', fontWeight: '600' }}>Profile</span>
        </button>
      ) : (
        <button
          onClick={() => setCurrentTab('login')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer',
          }}
        >
          <LogIn size={22} />
          <span style={{ fontSize: '0.68rem', fontWeight: '600' }}>Log In</span>
        </button>
      )}
    </nav>
  );
}
