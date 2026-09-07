import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Search, LogOut, PlusCircle, User as UserIcon } from 'lucide-react';

export default function Navbar({ currentTab, setCurrentTab, onOpenNewPost, onOpenProfile }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}>
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Logo */}
        <div
          onClick={() => setCurrentTab('feed')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.03em' }}>
            Connect<span className="gradient-text">Sphere</span>
          </span>
        </div>

        {/* Global Search Bar trigger */}
        <div
          onClick={() => setCurrentTab('explore')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '8px 16px',
            width: '100%',
            maxWidth: '380px',
            cursor: 'pointer',
            transition: 'var(--transition-normal)',
          }}
          className="search-shortcut"
        >
          <Search size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Search people, creators, tags...
          </span>
        </div>

        {/* User / Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAuthenticated ? (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={onOpenNewPost}
                style={{ display: 'flex', gap: '6px' }}
              >
                <PlusCircle size={16} />
                <span className="hide-mobile">Post</span>
              </button>

              <div
                onClick={() => onOpenProfile(user.username)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px 4px 4px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt={user.username} className="avatar avatar-sm" />
                ) : (
                  <div className="avatar avatar-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '0.86rem', fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hide-mobile">
                  {user.username}
                </span>
              </div>

              <button
                className="btn btn-secondary btn-icon"
                onClick={logout}
                title="Log Out"
                style={{ width: '36px', height: '36px' }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('login')}>
                Log In
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setCurrentTab('register')}>
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
