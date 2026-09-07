import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

export default function FeedPage({ onOpenProfile, onOpenDetail }) {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getFeed();
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>Home Feed</h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Updates and thoughts from your network
          </p>
        </div>

        <button
          className="btn btn-secondary btn-icon"
          onClick={() => fetchFeed(true)}
          disabled={refreshing || loading}
          title="Refresh feed"
          style={{ width: '38px', height: '38px' }}
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Post Composer for Authenticated Users */}
      {isAuthenticated && <PostComposer onPostCreated={handlePostCreated} />}

      {/* Feed List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                height: '180px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: 0.6,
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ width: '120px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ width: '80px', height: '10px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
              <div style={{ width: '90%', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ width: '60%', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={32} color="var(--accent-rose)" style={{ marginBottom: '10px' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Unable to load feed</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
            {error}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => fetchFeed()}>
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Sparkles size={28} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
            Your feed is empty
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 20px auto' }}>
            Start following other users or post your first thought to ignite the feed!
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPostDeleted={handlePostDeleted}
            onOpenProfile={onOpenProfile}
            onOpenDetail={onOpenDetail}
          />
        ))
      )}
    </div>
  );
}
