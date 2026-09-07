import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import PostCard from '../components/PostCard';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function PostDetailPage({ postId, onBack, onOpenProfile }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getPost(postId);
        setPost(data.post || data);
      } catch (err) {
        setError(err.message || 'Could not find post.');
      } finally {
        setLoading(false);
      }
    }
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading post...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={32} color="var(--accent-rose)" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Post Unavailable</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '18px' }}>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          marginBottom: '16px',
          fontSize: '0.9rem',
        }}
      >
        <ArrowLeft size={18} /> Back to Feed
      </button>

      <PostCard
        post={post}
        onPostDeleted={onBack}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
}
