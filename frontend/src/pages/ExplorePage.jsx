import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Search, X, UserPlus, Check, Sparkles, Users } from 'lucide-react';

export default function ExplorePage({ onOpenProfile }) {
  const { user, isAuthenticated, addToast } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchUsers(query);
        const userList = data.users || [];
        setUsers(userList);

        const map = {};
        userList.forEach((u) => {
          map[u.username] = u.is_following;
        });
        setFollowingMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

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
      addToast(err.message || 'Action failed.', 'error');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
          Explore & Discover
        </h1>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Find creators, friends, and community members across ConnectSphere
        </p>
      </div>

      {/* Search Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          marginBottom: '28px',
        }}
      >
        <Search size={20} color="var(--primary)" />
        <input
          type="text"
          className="input-field"
          placeholder="Search by username or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0',
            boxShadow: 'none',
            fontSize: '1rem',
          }}
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Users size={18} color="var(--accent-cyan)" />
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
          {query ? `Search Results for "${query}"` : 'Suggested Creators'}
        </h2>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Searching community...
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Sparkles size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No users found</h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Try searching for another username or term.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {users.map((u) => {
            const isFollowing = followingMap[u.username];
            const isSelf = user && user.username === u.username;

            return (
              <div
                key={u.id}
                className="glass-card"
                style={{
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform var(--transition-normal)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div onClick={() => onOpenProfile(u.username)} style={{ cursor: 'pointer' }}>
                    {u.profile_picture ? (
                      <img src={u.profile_picture} alt={u.username} className="avatar avatar-md" />
                    ) : (
                      <div className="avatar avatar-md">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      onClick={() => onOpenProfile(u.username)}
                      style={{
                        fontWeight: '700',
                        fontSize: '0.96rem',
                        color: '#fff',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.username}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      @{u.username}
                    </div>
                  </div>
                </div>

                {u.bio && (
                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                      maxHeight: '42px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {u.bio}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: 'auto',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {u.follower_count ?? 0} followers
                  </span>

                  {!isSelf && (
                    <button
                      className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleFollowToggle(u.username)}
                      style={{ padding: '4px 14px', fontSize: '0.8rem' }}
                    >
                      {isFollowing ? (
                        <>
                          <Check size={14} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
