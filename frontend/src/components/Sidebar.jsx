import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Home, Compass, User as UserIcon, Feather, LogIn, UserPlus, MessageSquare } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, onOpenNewPost, onOpenProfile }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = async () => {
      try {
        const data = await api.getUnreadCount();
        setUnreadCount(data.unread_count || 0);
      } catch (err) {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const navItems = [
    { id: 'feed', label: 'Home Feed', icon: Home, authRequired: true },
    { id: 'explore', label: 'Explore & Search', icon: Compass, authRequired: false },
    { id: 'messages', label: 'Messages', icon: MessageSquare, authRequired: true, badge: unreadCount },
    { id: 'profile', label: 'My Profile', icon: UserIcon, authRequired: true },
  ];

  return (
    <aside className="layout-left-sidebar" style={{ position: 'sticky', top: '80px', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
        {/* Navigation links */}
        <nav className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.authRequired && !isAuthenticated) {
                    setCurrentTab('login');
                  } else if (item.id === 'profile' && user) {
                    onOpenProfile(user.username);
                  } else {
                    setCurrentTab(item.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--gradient-brand)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '500',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'var(--transition-fast)',
                  boxShadow: isActive ? '0 4px 16px rgba(99, 102, 241, 0.3)' : 'none',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Icon size={20} color={isActive ? '#fff' : 'currentColor'} />
                <span style={{ fontSize: '0.96rem', flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span
                    style={{
                      background: 'var(--accent-pink)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: '0 0 10px rgba(236, 72, 153, 0.5)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {isAuthenticated && (
            <button
              className="btn btn-primary"
              onClick={onOpenNewPost}
              style={{ marginTop: '12px', width: '100%', padding: '12px' }}
            >
              <Feather size={18} />
              <span>Create Post</span>
            </button>
          )}
        </nav>

        {/* User Mini Profile / Auth CTA */}
        <div style={{ marginTop: 'auto' }}>
          {isAuthenticated && user ? (
            <div
              className="glass-card"
              style={{
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
              onClick={() => onOpenProfile(user.username)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt={user.username} className="avatar avatar-md" />
                ) : (
                  <div className="avatar avatar-md">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.94rem', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user.username}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    @{user.username}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>{user.post_count ?? 0}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Posts</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>{user.follower_count ?? 0}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Followers</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>{user.following_count ?? 0}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Following</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px' }}>
                Join ConnectSphere
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Log in to follow creators, like posts, and join conversations.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setCurrentTab('login')}>
                  <LogIn size={14} /> Log In
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('register')}>
                  <UserPlus size={14} /> Create Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
