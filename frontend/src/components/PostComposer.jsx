import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Image, Send, X, Loader2, Crop } from 'lucide-react';
import ImageCropModal from './ImageCropModal';
import HashtagSuggestionBar from './HashtagSuggestionBar';

export default function PostComposer({ onPostCreated }) {
  const { user, isAuthenticated, addToast, refreshUser } = useAuth();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  if (!isAuthenticated) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Please select a valid image file (PNG, JPG, WebP, GIF, etc.).', 'error');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCropComplete = (croppedFile, newPreviewUrl) => {
    setImageFile(croppedFile);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(newPreviewUrl);
    addToast('Photo cropped & enhanced!', 'success');
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) {
      addToast('Please write something or attach an image.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await api.createPost(formData);
      addToast('Post published successfully!', 'success');
      setContent('');
      handleRemoveImage();
      refreshUser();
      if (onPostCreated) {
        onPostCreated(response.post);
      }
    } catch (err) {
      addToast(err.message || 'Failed to publish post.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '14px' }}>
        {user?.profile_picture ? (
          <img src={user.profile_picture} alt={user.username} className="avatar avatar-md" />
        ) : (
          <div className="avatar avatar-md">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <form onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              className="input-field"
              placeholder="What's happening in your sphere?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                padding: '8px 0',
                fontSize: '1rem',
                resize: 'none',
              }}
            />

            <HashtagSuggestionBar text={content} onSelect={setContent} textareaRef={textareaRef} />

            {imagePreview && (
              <div
                style={{
                  position: 'relative',
                  marginTop: '12px',
                  marginBottom: '12px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  maxHeight: '320px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <img
                  src={imagePreview}
                  alt="Attachment preview"
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCropModalOpen(true)}
                    style={{
                      background: 'rgba(15, 17, 28, 0.88)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    }}
                    title="Crop, rotate, and filter photo"
                  >
                    <Crop size={15} color="var(--primary)" />
                    <span>Edit & Crop</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(8px)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                    title="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="post-image-input"
                />
                <label
                  htmlFor="post-image-input"
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: 'pointer', gap: '6px' }}
                >
                  <Image size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.82rem' }}>Photo</span>
                </label>

                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {content.length > 0 && `${content.length} chars`}
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmitting || (!content.trim() && !imageFile)}
                style={{ padding: '8px 18px', gap: '6px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Post
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Interactive Photo Crop & Edit Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageSrc={imagePreview}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
