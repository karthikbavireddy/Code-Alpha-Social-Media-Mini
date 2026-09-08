import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import PostCard from '../components/PostCard';
import ProfileEditModal from '../components/ProfileEditModal';
import { UserCheck, UserPlus, Edit3, Grid, AlertCircle, ArrowLeft, MessageSquare } from 'lucide-react';

export default function ProfilePage({ username, onBack, onOpenProfile, onOpenDetail, onOpenMessages }) {
  const { user, isAuthenticated, addToast, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwner = user && profileData && user.username === profileData.username;

  const loadProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUserProfile(username);
      setProfileData(data);
      setIsFollowing(data.is_following || false);
    } catch (err) {
      setError(err.message || 'User profile not found.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to follow creators.', 'error');
      return;
    }

    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(username);
      setIsFollowing(res.is_following);
      setProfileData((prev) => ({
        ...prev,
        follower_count: res.follower_count,
      }));
      addToast(res.message, 'info');
      refreshUser();
    } catch (err) {
      addToast(err.message || 'Failed to update follow status.', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostDeleted = (deletedPostId) => {
    setProfileData((prev) => ({
      ...prev,
      post_count: Math.max(0, (prev.post_count || 1) - 1),
      posts: (prev.posts || []).filter((p) => p.id !== deletedPostId),
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading profile...
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={32} color="var(--accent-rose)" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>User Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '18px' }}>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Back Button */}
      {onBack && (
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
          <ArrowLeft size={18} /> Back
        </button>
      )}

      {/* Profile Header Card */}
      <div
        className="glass-card"
        style={{
          padding: '28px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient banner */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '90px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(236, 72, 153, 0.3) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        />

        <div style={{ position: 'relative', paddingTop: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Avatar */}
            {profileData.profile_picture ? (
              <img
                src={profileData.profile_picture}
                alt={profileData.username}
                className="avatar avatar-xl"
                style={{ border: '4px solid #121422' }}
              />
            ) : (
              <div className="avatar avatar-xl" style={{ border: '4px solid #121422' }}>
                {profileData.username.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Action Buttons */}
            <div>
              {isOwner ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(true)}
                  style={{ gap: '8px' }}
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onOpenMessages && onOpenMessages(profileData.username)}
                    style={{ gap: '6px', padding: '10px 18px' }}
                  >
                    <MessageSquare size={16} color="var(--primary)" /> Message
                  </button>
                  <button
                    className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    style={{ gap: '8px' }}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={16} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} /> Follow
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
                {profileData.username}
              </h1>
              {profileData.is_mutual_following && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontWeight: '700',
                  }}
                >
                  Mutual Follower
                </span>
              )}
              {!profileData.is_mutual_following && profileData.is_followed_by && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-muted)',
                    fontWeight: '600',
                  }}
                >
                  Follows you
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              @{profileData.username}
            </div>
          </div>

          {/* Bio */}
          {profileData.bio && (
            <p
              style={{
                fontSize: '0.96rem',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
                marginBottom: '20px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {profileData.bio}
            </p>
          )}

          {/* User Stats Counter */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
            }}
          >
            <div>
              <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>
                {profileData.post_count ?? 0}
              </span>{' '}
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Posts</span>
            </div>
            <div>
              <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>
                {profileData.follower_count ?? 0}
              </span>{' '}
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Followers</span>
            </div>
            <div>
              <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>
                {profileData.following_count ?? 0}
              </span>{' '}
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts Section */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Grid size={18} color="var(--primary)" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Posts</h3>
      </div>

      {(!profileData.posts || profileData.posts.length === 0) ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            @{profileData.username} hasn't posted anything yet.
          </p>
        </div>
      ) : (
        profileData.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPostDeleted={handlePostDeleted}
            onOpenProfile={onOpenProfile}
            onOpenDetail={onOpenDetail}
          />
        ))
      )}

      {/* Edit Profile Modal */}
      {isOwner && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onProfileUpdated={loadProfile}
        />
      )}
    </div>
  );
}
