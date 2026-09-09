import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import CommentList from './CommentList';
import HashtagSuggestionBar from './HashtagSuggestionBar';
import { Heart, MessageCircle, Share2, Trash2, MoreHorizontal, Edit2 } from 'lucide-react';

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

export default function PostCard({ post, onPostDeleted, onOpenProfile, onOpenDetail }) {
  const { user, isAuthenticated, addToast, refreshUser } = useAuth();
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [content, setContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const [editContentText, setEditContentText] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editTextareaRef = useRef(null);

  // Author details (backend serializer handles user nested or author_username)
  const authorUsername = post.author?.username || post.author_username || 'anonymous';
  const authorAvatar = post.author?.profile_picture || post.author_avatar || null;
  const isOwner = user && user.username === authorUsername;

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to like posts.', 'error');
      return;
    }

    const prevLiked = isLiked;
    const prevCount = likeCount;

    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 400);

    try {
      const response = await api.toggleLike(post.id);
      setIsLiked(response.is_liked);
      setLikeCount(response.like_count);
    } catch (err) {
      // Revert on error
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      addToast('Failed to update like status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      await api.deletePost(post.id);
      addToast('Post deleted successfully.', 'success');
      refreshUser();
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete post.', 'error');
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContentText.trim()) {
      addToast('Post content cannot be empty.', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const response = await api.updatePost(post.id, { content: editContentText.trim() });
      setContent(response.content || editContentText.trim());
      setIsEditing(false);
      addToast('Post updated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update post.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/#post-${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      addToast('Post link copied to clipboard!', 'info');
    } else {
      addToast(`Post ID: #${post.id}`, 'info');
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="glass-card animate-fade-in"
      style={{
        padding: '20px',
        marginBottom: '20px',
        position: 'relative',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      {/* Header: Author Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div
          onClick={() => onOpenProfile && onOpenProfile(authorUsername)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorUsername} className="avatar avatar-md" />
          ) : (
            <div className="avatar avatar-md">
              {authorUsername.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.96rem', color: '#fff' }}>
                {authorUsername}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              @{authorUsername} · {timeAgo(post.created_at)}
            </div>
          </div>
        </div>

        {/* Post Actions Menu (Owner Controls) */}
        {isOwner && (
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ width: '32px', height: '32px' }}
            >
              <MoreHorizontal size={16} />
            </button>

            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '36px',
                  background: 'rgba(20, 22, 36, 0.95)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  zIndex: 20,
                  minWidth: '130px',
                }}
              >
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setEditContentText(content);
                    setIsEditing(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Edit2 size={14} color="var(--primary)" />
                  Edit Post
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-rose)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Trash2 size={14} />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Text Content or Inline Editor */}
      {isEditing ? (
        <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glow)' }}>
          <textarea
            ref={editTextareaRef}
            className="input-field"
            value={editContentText}
            onChange={(e) => setEditContentText(e.target.value)}
            rows={3}
            style={{ marginBottom: '10px' }}
            autoFocus
          />
          <HashtagSuggestionBar text={editContentText} onSelect={setEditContentText} textareaRef={editTextareaRef} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContentText.trim()}
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: '0.98rem',
            lineHeight: '1.6',
            color: 'var(--text-primary)',
            marginBottom: post.image ? '14px' : '16px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      )}

      {/* Post Attachment Media */}
      {post.image && (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: '16px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <img
            src={post.image}
            alt="Post media"
            loading="lazy"
            style={{
              width: '100%',
              maxHeight: '480px',
              objectFit: 'cover',
              display: 'block',
              cursor: 'pointer',
            }}
            onClick={() => onOpenDetail && onOpenDetail(post.id)}
          />
        </div>
      )}

      {/* Post Stats & Interaction Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Like Button */}
          <button
            onClick={handleLikeToggle}
            className={`btn-like ${isLikeAnimating ? 'animate-heart' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: isLiked ? 'var(--accent-rose)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: '600',
              transition: 'var(--transition-fast)',
              padding: '6px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <Heart
              size={19}
              fill={isLiked ? 'var(--accent-rose)' : 'none'}
              color={isLiked ? 'var(--accent-rose)' : 'currentColor'}
            />
            <span>{likeCount}</span>
          </button>

          {/* Comment Toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: showComments ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: '600',
              transition: 'var(--transition-fast)',
              padding: '6px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <MessageCircle size={19} color={showComments ? 'var(--primary)' : 'currentColor'} />
            <span>{commentCount}</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 'var(--radius-full)',
          }}
          title="Share Post"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <CommentList
          postId={post.id}
          initialComments={post.comments || []}
          onCommentCountChange={(newCount) => setCommentCount(newCount)}
          onOpenProfile={onOpenProfile}
        />
      )}
    </article>
  );
}
