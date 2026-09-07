import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Camera, Loader2, Save } from 'lucide-react';

export default function ProfileEditModal({ isOpen, onClose, onProfileUpdated }) {
  const { user, refreshUser, addToast } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [pictureFile, setPictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profile_picture || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Please select a valid image file.', 'error');
        return;
      }
      setPictureFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('bio', bio);
      if (pictureFile) {
        formData.append('profile_picture', pictureFile);
      }

      await api.updateProfile(formData);
      addToast('Profile updated successfully!', 'success');
      await refreshUser();
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Edit Profile</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar preview" className="avatar avatar-xl" />
              ) : (
                <div className="avatar avatar-xl">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                <Camera size={16} color="#fff" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Click to change avatar
            </span>
          </div>

          {/* Bio Input */}
          <div className="input-group">
            <label className="input-label">Bio</label>
            <textarea
              className="input-field"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world a little about yourself..."
              rows={3}
              maxLength={500}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {bio.length}/500
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
