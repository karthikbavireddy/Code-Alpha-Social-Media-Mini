import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Sparkles, UserPlus, Check, Flame } from 'lucide-react';

export default function RightSidebar({ onOpenProfile }) {
  const { user, isAuthenticated, addToast } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    async function loadSuggestions() {
      setLoading(true);
      try {
        const data = await api.searchUsers('');
        // Filter out current user and take up to 4
        const filtered = (data.users || [])
          .filter((u) => !user || u.username !== user.username)
          .slice(0, 4);
        setSuggestedUsers(filtered);

        const initialMap = {};
        filtered.forEach((u) => {
          initialMap[u.username] = u.is_following;
        });
        setFollowingMap(initialMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSuggestions();
  }, [user]);

  const handleFollowToggle = async (username) => {
    if (!isAuthenticated) {
      addToast('Please log in to follow creators.', 'error');
      return;
    }
    const currentStatus = followingMap[username];
    setFollowingMap((prev) => ({ ...prev, [username]: !currentStatus }));

    try {
      const res = await api.toggleFollow(username);
      setFollowingMap((prev) => ({ ...prev, [username]: res.is_following }));
      addToast(res.message, 'info');
    } catch (err) {
      setFollowingMap((prev) => ({ ...prev, [username]: currentStatus }));
      addToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <aside className="layout-right-sidebar" style={{ position: 'sticky', top: '80px', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Suggested Creators */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Flame size={18} color="var(--accent-pink)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>Who to Follow</h3>
          </div>

          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px 0' }}>
              Discovering creators...
            </div>
          ) : suggestedUsers.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No suggestions right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {suggestedUsers.map((su) => {
                const isFollowing = followingMap[su.username];
                return (
                  <div
                    key={su.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div
                      onClick={() => onOpenProfile(su.username)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', overflow: 'hidden' }}
                    >
                      {su.profile_picture ? (
                        <img src={su.profile_picture} alt={su.username} className="avatar avatar-sm" />
                      ) : (
                        <div className="avatar avatar-sm">
                          {su.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {su.username}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {su.follower_count} followers
                        </div>
                      </div>
                    </div>

                    <button
                      className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleFollowToggle(su.username)}
                      style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                    >
                      {isFollowing ? (
                        <>
                          <Check size={12} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} /> Follow
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Info / Tech stack card */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>ConnectSphere v2.0</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px' }}>
            Powered by Django 6 & React 19. Engineered with real-time comments, media uploads, and instant social graph sync.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span className="badge badge-primary">React 19</span>
            <span className="badge badge-primary">Django 6</span>
            <span className="badge badge-cyan">REST API</span>
            <span className="badge badge-primary">Dark Glass</span>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          © 2026 ConnectSphere. Built for Code_Alpha.
        </div>
      </div>
    </aside>
  );
}
