import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Send, Loader2 } from 'lucide-react';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function CommentList({ postId, initialComments = [], onCommentCountChange, onOpenProfile }) {
  const { user, isAuthenticated, addToast } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If initialComments wasn't provided or we want fresh comments
    async function fetchComments() {
      setLoading(true);
      try {
        const data = await api.getComments(postId);
        setComments(data.comments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [postId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please log in to comment.', 'error');
      return;
    }
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.createComment(postId, commentText.trim());
      const newComment = response.comment;
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      if (onCommentCountChange) {
        onCommentCountChange(response.comment_count);
      }
      addToast('Comment added!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to submit comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '6px 0' }}>
            No comments yet. Be the first to start the discussion!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                onClick={() => onOpenProfile && onOpenProfile(comment.author_username)}
                style={{ cursor: 'pointer' }}
              >
                {comment.author_avatar ? (
                  <img src={comment.author_avatar} alt={comment.author_username} className="avatar avatar-sm" />
                ) : (
                  <div className="avatar avatar-sm">
                    {comment.author_username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span
                    onClick={() => onOpenProfile && onOpenProfile(comment.author_username)}
                    style={{ fontSize: '0.84rem', fontWeight: '700', color: '#fff', cursor: 'pointer' }}
                  >
                    @{comment.author_username}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Input */}
      {isAuthenticated ? (
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{ padding: '8px 14px', fontSize: '0.88rem', borderRadius: 'var(--radius-full)' }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={submitting || !commentText.trim()}
            style={{ padding: '8px 14px' }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      ) : (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '6px' }}>
          Log in to join the conversation.
        </div>
      )}
    </div>
  );
}
