/**
 * ConnectSphere - Profile Page Logic
 */

let targetUsername = null;
let currentUser = null;
let profileData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get target username from global variable set in profile.html
    targetUsername = window.TARGET_USERNAME;
    if (!targetUsername) return;

    await initAuth();
    await loadUserProfile();
    setupEditProfileModal();
});

// Check viewer authentication
async function initAuth() {
    try {
        currentUser = await apiRequest('/api/me/');
    } catch (err) {
        currentUser = null;
    }
}

// Load profile data and user's posts
async function loadUserProfile() {
    const profileContainer = document.getElementById('profile-content');
    if (!profileContainer) return;

    try {
        profileData = await apiRequest(`/api/users/${targetUsername}/`);
        renderProfileHeader(profileData);
        renderUserPosts(profileData.posts || []);
    } catch (err) {
        profileContainer.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">User Not Found</div>
                <p class="empty-text">${err.message || 'The requested user profile does not exist.'}</p>
                <a href="/" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Back to Home</a>
            </div>
        `;
    }
}

// Render profile header (Avatar, Bio, Stats, Action Button)
function renderProfileHeader(data) {
    const isOwnProfile = currentUser && currentUser.username.toLowerCase() === data.username.toLowerCase();

    const avatarWrap = document.getElementById('profile-avatar-wrap');
    const nameEl = document.getElementById('profile-display-name');
    const usernameEl = document.getElementById('profile-username-tag');
    const bioEl = document.getElementById('profile-bio-text');
    const postCountEl = document.getElementById('profile-posts-count');
    const followerCountEl = document.getElementById('profile-followers-count');
    const followingCountEl = document.getElementById('profile-following-count');
    const actionBtnContainer = document.getElementById('profile-action-container');

    if (avatarWrap) {
        avatarWrap.innerHTML = renderAvatarHtml(data.profile_picture, data.username, 'profile-large-avatar');
    }

    if (nameEl) {
        nameEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>${escapeHtml(data.username)}</span>
                ${data.is_mutual_following ? '<span class="badge" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 700;">Mutual Follower</span>' : ''}
                ${!data.is_mutual_following && data.is_followed_by ? '<span class="badge" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); color: var(--text-muted);">Follows you</span>' : ''}
            </div>
        `;
    }
    if (usernameEl) usernameEl.textContent = `@${data.username}`;
    if (bioEl) bioEl.textContent = data.bio || 'No bio yet.';
    if (postCountEl) postCountEl.textContent = data.post_count ?? 0;
    if (followerCountEl) followerCountEl.textContent = data.follower_count ?? 0;
    if (followingCountEl) followingCountEl.textContent = data.following_count ?? 0;

    // Action button: Edit Profile (if owner) or Follow/Unfollow (if other)
    if (actionBtnContainer) {
        if (isOwnProfile) {
            actionBtnContainer.innerHTML = `
                <button class="btn btn-outline" onclick="openEditProfileModal()">
                    ✏️ Edit Profile
                </button>
                <a href="/settings/" class="btn btn-outline" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    ⚙️ Settings
                </a>
            `;
        } else if (currentUser) {
            const isFollowing = data.is_following;
            actionBtnContainer.innerHTML = `
                <button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'}" id="follow-toggle-btn" onclick="toggleFollow('${data.username}')">
                    ${isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <a href="/messages/${encodeURIComponent(data.username)}/" class="btn btn-outline" id="profile-message-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                    💬 Message
                </a>
            `;
        } else {
            actionBtnContainer.innerHTML = `
                <a href="/login/" class="btn btn-primary btn-sm">Log in to Follow</a>
            `;
        }
    }
}

// Follow / Unfollow Toggle without page reload
async function toggleFollow(username) {
    const btn = document.getElementById('follow-toggle-btn');
    const followerCountEl = document.getElementById('profile-followers-count');
    if (!btn) return;

    try {
        btn.disabled = true;
        const result = await apiRequest(`/api/users/${username}/follow/`, { method: 'POST' });

        if (result.following) {
            btn.className = 'btn btn-outline';
            btn.textContent = 'Unfollow';
            showToast(`You are now following @${username}`, 'success');
        } else {
            btn.className = 'btn btn-primary';
            btn.textContent = 'Follow';
            showToast(`Unfollowed @${username}`, 'info');
        }

        if (followerCountEl) {
            followerCountEl.textContent = result.follower_count;
        }
    } catch (err) {
        showToast(err.message || 'Action failed.', 'error');
    } finally {
        btn.disabled = false;
    }
}

// Render user's post timeline
function renderUserPosts(posts) {
    const container = document.getElementById('profile-posts-list');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">📝</div>
                <div class="empty-title">No posts yet</div>
                <p class="empty-text">This user has not shared any updates yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    posts.forEach(post => {
        container.appendChild(createPostCardElement(post));
    });
}

// Generate post card element
function createPostCardElement(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;

    const isAuthor = currentUser && currentUser.username === post.author;
    const authorAvatarHtml = renderAvatarHtml(post.author_profile_picture, post.author, 'post-avatar');

    let mediaHtml = '';
    if (post.image) {
        mediaHtml = `
            <div class="post-media-wrap">
                <img src="${post.image}" alt="Post media" class="post-media-img" loading="lazy" onerror="const w=this.closest('.post-media-wrap'); if(w) w.remove();">
            </div>
        `;
    }

    let authorActionsHtml = '';
    if (isAuthor) {
        authorActionsHtml = `
            <div class="post-actions-menu">
                <button class="btn btn-outline btn-sm" onclick="openEditPostModal(${post.id}, \`${escapeHtml(post.content)}\`)">Edit</button>
                <button class="btn btn-danger-outline btn-sm" onclick="confirmDeletePost(${post.id})">Delete</button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="post-header">
            <div class="post-author-wrap">
                <a href="/profile/${post.author}/">${authorAvatarHtml}</a>
                <div class="post-author-info">
                    <a href="/profile/${post.author}/" class="post-author-name">@${post.author}</a>
                    <span class="post-time">${formatTimestamp(post.created_at)}</span>
                </div>
            </div>
            ${authorActionsHtml}
        </div>

        <div class="post-content" id="post-content-${post.id}">${escapeHtml(post.content)}</div>
        ${mediaHtml}

        <div class="post-footer">
            <div class="post-stats-group">
                <button class="btn-action ${post.liked_by_current_user ? 'liked' : ''}" id="like-btn-${post.id}" onclick="toggleLike(${post.id})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${post.liked_by_current_user ? '#f43f5e' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span id="like-count-${post.id}">${post.like_count}</span>
                </button>
                <button class="btn-action" onclick="toggleCommentsSection(${post.id})" title="Comments">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span id="comment-count-${post.id}">${post.comment_count}</span>
                </button>
            </div>
            <a href="/posts/${post.id}/" class="btn btn-outline btn-sm">View Post</a>
        </div>

        <div class="comments-section" id="comments-section-${post.id}">
            <div class="comment-input-row">
                <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') submitComment(${post.id})">
                <button class="btn btn-primary btn-sm" onclick="submitComment(${post.id})">Send</button>
            </div>
            <div class="comment-list" id="comment-list-${post.id}">
                <!-- Populated dynamically -->
            </div>
        </div>
    `;

    return card;
}

// Interactive Comments Drawer on profile posts
async function toggleCommentsSection(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    if (!section) return;

    if (section.classList.contains('open')) {
        section.classList.remove('open');
    } else {
        section.classList.add('open');
        await loadPostComments(postId);
    }
}

async function loadPostComments(postId) {
    const list = document.getElementById(`comment-list-${postId}`);
    if (!list) return;

    list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">Loading comments...</p>';

    try {
        const comments = await apiRequest(`/api/posts/${postId}/comments/`);
        if (!comments || comments.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No comments yet. Be the first!</p>';
            return;
        }

        list.innerHTML = '';
        comments.forEach(c => {
            list.appendChild(createCommentElement(c));
        });
    } catch (err) {
        list.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem;">Error loading comments: ${err.message}</p>`;
    }
}

async function submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const list = document.getElementById(`comment-list-${postId}`);
    const countSpan = document.getElementById(`comment-count-${postId}`);
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
        showToast('Comment text cannot be empty.', 'error');
        return;
    }

    try {
        input.disabled = true;
        const newComment = await apiRequest(`/api/posts/${postId}/comments/`, {
            method: 'POST',
            body: { text }
        });

        input.value = '';
        input.disabled = false;

        const emptyMsg = list.querySelector('p');
        if (emptyMsg) emptyMsg.remove();

        list.appendChild(createCommentElement(newComment));

        if (countSpan) {
            countSpan.textContent = parseInt(countSpan.textContent || '0', 10) + 1;
        }

        showToast('Comment posted!', 'success');
    } catch (err) {
        input.disabled = false;
        if (err.status === 401) {
            showToast('Please log in to post comments.', 'info');
            setTimeout(() => { window.location.href = '/login/'; }, 600);
        } else {
            showToast(err.message || 'Failed to post comment.', 'error');
        }
    }
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';

    const avatarHtml = renderAvatarHtml(comment.author_profile_picture, comment.author, 'comment-avatar');

    div.innerHTML = `
        <a href="/profile/${comment.author}/">${avatarHtml}</a>
        <div class="comment-body">
            <div class="comment-header">
                <a href="/profile/${comment.author}/" class="comment-author">@${comment.author}</a>
                <span class="comment-date">${formatTimestamp(comment.created_at)}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
        </div>
    `;

    return div;
}

// Like Toggle on profile posts
async function toggleLike(postId) {
    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const likeCountSpan = document.getElementById(`like-count-${postId}`);
    if (!likeBtn) return;

    likeBtn.disabled = true;

    try {
        const data = await apiRequest(`/api/posts/${postId}/like/`, { method: 'POST' });
        likeCountSpan.textContent = data.like_count;
        const svg = likeBtn.querySelector('svg');

        if (data.liked) {
            likeBtn.classList.add('liked');
            svg.setAttribute('fill', '#f43f5e');
        } else {
            likeBtn.classList.remove('liked');
            svg.setAttribute('fill', 'none');
        }
    } catch (err) {
        if (err.status === 401) {
            showToast('Please log in to like posts.', 'info');
            setTimeout(() => { window.location.href = '/login/'; }, 600);
        } else {
            showToast(err.message || 'Error updating like.', 'error');
        }
    } finally {
        likeBtn.disabled = false;
    }
}

// Setup edit profile modal
function setupEditProfileModal() {
    const fileInput = document.getElementById('edit-avatar-input');
    const previewImg = document.getElementById('edit-avatar-preview');

    if (fileInput && previewImg) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    const bioInput = document.getElementById('edit-bio-input');
    const previewImg = document.getElementById('edit-avatar-preview');

    if (modal && profileData) {
        if (bioInput) bioInput.value = profileData.bio || '';
        if (previewImg && profileData.profile_picture) {
            previewImg.src = profileData.profile_picture;
            previewImg.style.display = 'block';
        }
        modal.classList.add('active');
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.remove('active');
}

async function saveProfileChanges() {
    const modal = document.getElementById('edit-profile-modal');
    const bioInput = document.getElementById('edit-bio-input');
    const fileInput = document.getElementById('edit-avatar-input');
    const saveBtn = document.getElementById('save-profile-btn');

    const formData = new FormData();
    if (bioInput) formData.append('bio', bioInput.value.trim());
    if (fileInput && fileInput.files[0]) {
        formData.append('profile_picture', fileInput.files[0]);
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const result = await apiRequest('/api/profile/', {
            method: 'PUT',
            body: formData
        });

        showToast('Profile updated!', 'success');
        closeEditProfileModal();

        // Reload profile data to refresh UI
        await loadUserProfile();
    } catch (err) {
        showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Delete post from profile
async function confirmDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        await apiRequest(`/api/posts/${postId}/delete/`, { method: 'DELETE' });
        showToast('Post deleted.', 'success');

        const card = document.getElementById(`post-${postId}`);
        if (card) {
            card.remove();
        }

        const postCountEl = document.getElementById('profile-posts-count');
        if (postCountEl) {
            const current = parseInt(postCountEl.textContent || '1', 10);
            postCountEl.textContent = Math.max(0, current - 1);
        }
    } catch (err) {
        showToast(err.message || 'Could not delete post.', 'error');
    }
}

// Edit post modal handling
let currentEditingPostId = null;

function openEditPostModal(postId, currentContent) {
    currentEditingPostId = postId;
    const modal = document.getElementById('edit-post-modal');
    const textarea = document.getElementById('edit-post-text');

    if (modal && textarea) {
        textarea.value = currentContent;
        modal.classList.add('active');
    }
}

function closeEditPostModal() {
    const modal = document.getElementById('edit-post-modal');
    if (modal) {
        modal.classList.remove('active');
        currentEditingPostId = null;
    }
}

async function saveEditedPost() {
    if (!currentEditingPostId) return;

    const textarea = document.getElementById('edit-post-text');
    const saveBtn = document.getElementById('save-edit-post-btn');
    const content = textarea.value.trim();

    if (!content) {
        showToast('Content cannot be empty.', 'error');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const updated = await apiRequest(`/api/posts/${currentEditingPostId}/update/`, {
            method: 'PUT',
            body: { content }
        });

        const contentEl = document.getElementById(`post-content-${currentEditingPostId}`);
        if (contentEl) contentEl.textContent = updated.content;

        showToast('Post updated!', 'success');
        closeEditPostModal();
    } catch (err) {
        showToast(err.message || 'Failed to update post.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
