/**
 * ConnectSphere - Home Feed & Post Interactions Logic
 */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initCurrentUser();
    setupPostComposer();
    await loadFeed();
});

// Fetch current user details to populate mini profile and enable authorization checks
async function initCurrentUser() {
    try {
        const user = await apiRequest('/api/me/');
        currentUser = user;
        renderSidebarMiniProfile(user);

        // Update composer avatar if exists
        const composerAvatarWrap = document.getElementById('composer-avatar-wrap');
        if (composerAvatarWrap) {
            composerAvatarWrap.innerHTML = renderAvatarHtml(user.profile_picture, user.username, 'post-avatar composer-avatar');
        }

        // Update mobile header avatar
        const mobAvatar = document.getElementById('mobile-header-avatar');
        if (mobAvatar) {
            mobAvatar.innerHTML = renderAvatarHtml(user.profile_picture, user.username, 'mobile-header-avatar-img');
        }

        // Load dynamic sidebar creator suggestions
        loadSidebarSuggestions();
    } catch (err) {
        if (err.status === 401) {
            window.location.href = '/login/';
        }
    }
}

// Render mini profile in left sidebar
function renderSidebarMiniProfile(user) {
    const avatarWrap = document.getElementById('sidebar-avatar-wrap');
    const nameEl = document.getElementById('sidebar-username');
    const handleEl = document.getElementById('sidebar-handle');
    const postCountEl = document.getElementById('sidebar-post-count');
    const followerCountEl = document.getElementById('sidebar-follower-count');
    const followingCountEl = document.getElementById('sidebar-following-count');

    if (avatarWrap) {
        avatarWrap.innerHTML = renderAvatarHtml(user.profile_picture, user.username, 'mini-profile-avatar');
    }
    if (nameEl) nameEl.textContent = user.username;
    if (handleEl) handleEl.textContent = `@${user.username}`;
    if (postCountEl) postCountEl.textContent = user.post_count ?? 0;
    if (followerCountEl) followerCountEl.textContent = user.follower_count ?? 0;
    if (followingCountEl) followingCountEl.textContent = user.following_count ?? 0;
}

// Fetch and render suggested creators in the Discover sidebar
async function loadSidebarSuggestions() {
    const suggestionsContainer = document.getElementById('sidebar-suggestions');
    if (!suggestionsContainer) return;

    try {
        const users = await apiRequest('/api/search/');
        if (!users || users.length === 0) {
            suggestionsContainer.innerHTML = '';
            return;
        }

        const candidates = users.slice(0, 3);
        suggestionsContainer.innerHTML = candidates.map(u => {
            const avatarHtml = renderAvatarHtml(u.profile_picture, u.username, 'suggestion-avatar-inner');

            return `
                <div class="suggestion-item">
                    <a href="/profile/${u.username}/" class="suggestion-user-info">
                        <div class="suggestion-avatar">${avatarHtml}</div>
                        <div>
                            <div class="suggestion-username">@${u.username}</div>
                        </div>
                    </a>
                    <a href="/profile/${u.username}/" class="btn btn-outline btn-sm" style="padding: 0.3rem 0.65rem; font-size: 0.74rem;">
                        View
                    </a>
                </div>
            `;
        }).join('');
    } catch (err) {
        // Silently skip if unavailable
    }
}

// Setup Post Composer with image preview
function setupPostComposer() {
    const postBtn = document.getElementById('composer-submit-btn');
    const textarea = document.getElementById('composer-text');
    const fileInput = document.getElementById('composer-image-input');
    const previewWrap = document.getElementById('composer-preview-wrap');
    const previewImg = document.getElementById('composer-preview-img');
    const removePreviewBtn = document.getElementById('composer-remove-preview');

    if (!postBtn || !textarea) return;

    // Image adjustment toolbar handlers
    const btnFitContain = document.getElementById('btn-fit-contain');
    const btnFitTop = document.getElementById('btn-fit-top');
    const btnFitCenter = document.getElementById('btn-fit-center');

    function setAdjustMode(mode) {
        if (!previewImg) return;
        previewImg.classList.remove('fit-contain', 'fit-top', 'fit-center');
        [btnFitContain, btnFitTop, btnFitCenter].forEach(b => b && b.classList.remove('active'));

        if (mode === 'top') {
            previewImg.classList.add('fit-top');
            if (btnFitTop) btnFitTop.classList.add('active');
        } else if (mode === 'center') {
            previewImg.classList.add('fit-center');
            if (btnFitCenter) btnFitCenter.classList.add('active');
        } else {
            previewImg.classList.add('fit-contain');
            if (btnFitContain) btnFitContain.classList.add('active');
        }
    }

    if (btnFitContain) btnFitContain.addEventListener('click', () => setAdjustMode('contain'));
    if (btnFitTop) btnFitTop.addEventListener('click', () => setAdjustMode('top'));
    if (btnFitCenter) btnFitCenter.addEventListener('click', () => setAdjustMode('center'));

    // Handle file selection preview
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    setAdjustMode('contain'); // Default to full fit so head/face is never cropped
                    previewWrap.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Remove preview
    if (removePreviewBtn) {
        removePreviewBtn.addEventListener('click', () => {
            fileInput.value = '';
            previewImg.src = '';
            setAdjustMode('contain');
            previewWrap.style.display = 'none';
        });
    }

    // Handle submission
    postBtn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) {
            showToast('Post content cannot be empty.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('content', content);
        if (fileInput && fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }

        try {
            postBtn.disabled = true;
            postBtn.textContent = 'Posting...';

            const newPost = await apiRequest('/api/posts/create/', {
                method: 'POST',
                body: formData
            });

            showToast('Post shared to your sphere!', 'success');
            textarea.value = '';
            if (fileInput) fileInput.value = '';
            if (previewWrap) previewWrap.style.display = 'none';

            // Prepend new post to feed
            prependPostToFeed(newPost);

            // Update user post count
            if (currentUser) {
                currentUser.post_count = (currentUser.post_count || 0) + 1;
                const postCountEl = document.getElementById('sidebar-post-count');
                if (postCountEl) postCountEl.textContent = currentUser.post_count;
            }
        } catch (err) {
            showToast(err.message || 'Failed to create post.', 'error');
        } finally {
            postBtn.disabled = false;
            postBtn.textContent = 'Post';
        }
    });
}

// Load feed posts
async function loadFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    try {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏳</div>
                <div class="empty-title">Loading feed...</div>
            </div>
        `;

        const posts = await apiRequest('/api/feed/');

        if (!posts || posts.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state card" style="padding: 3rem 1.5rem; text-align: center; border-radius: var(--radius-lg); background: radial-gradient(circle at 50% 25%, rgba(99, 102, 241, 0.08) 0%, rgba(17, 24, 39, 0.6) 70%); border: 1px solid rgba(99, 102, 241, 0.18);">
                    <div style="width: 70px; height: 70px; margin: 0 auto 1.25rem; border-radius: 50%; background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2)); border: 1px solid rgba(99,102,241,0.35); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(99,102,241,0.25);">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                    </div>
                    <div class="empty-title" style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin-bottom: 0.5rem;">Your feed is quiet</div>
                    <p class="empty-text" style="color: var(--text-muted); font-size: 0.92rem; max-width: 380px; margin: 0 auto 1.5rem; line-height: 1.55;">
                        Connect with creators, share your thoughts, or follow inspiring people to build your personalized sphere!
                    </p>
                    <a href="/explore/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.4rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                        <span>Explore People</span>
                    </a>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = '';
        posts.forEach(post => {
            feedContainer.appendChild(createPostCardElement(post));
        });
    } catch (err) {
        feedContainer.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Could not load feed</div>
                <p class="empty-text">${err.message}</p>
                <button onclick="loadFeed()" class="btn btn-outline btn-sm" style="margin-top: 1rem;">Try Again</button>
            </div>
        `;
    }
}

// Prepend single post to top of feed
function prependPostToFeed(post) {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    const emptyState = feedContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const postCard = createPostCardElement(post);
    feedContainer.prepend(postCard);
}

// Generate DOM element for a Post card
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

                <button class="btn-action" onclick="toggleCommentsSection(${post.id})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span id="comment-count-${post.id}">${post.comment_count}</span>
                </button>
            </div>

            <a href="/posts/${post.id}/" class="btn btn-outline btn-sm">View Details</a>
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

// Interactive Like Toggle without page reload
async function toggleLike(postId) {
    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const likeCountSpan = document.getElementById(`like-count-${postId}`);
    if (!likeBtn) return;

    // Temporarily disable to prevent double clicks
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
        showToast(err.message || 'Error updating like.', 'error');
    } finally {
        likeBtn.disabled = false;
    }
}

// Toggle comments visibility and load them on first open
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

// Fetch comments for a post
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

// Submit a new comment without page reload
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

        // Remove empty state message if present
        const emptyMsg = list.querySelector('p');
        if (emptyMsg) emptyMsg.remove();

        list.appendChild(createCommentElement(newComment));

        // Update comment counter
        if (countSpan) {
            countSpan.textContent = parseInt(countSpan.textContent || '0', 10) + 1;
        }

        showToast('Comment posted!', 'success');
    } catch (err) {
        input.disabled = false;
        showToast(err.message || 'Failed to post comment.', 'error');
    }
}

// Create single comment DOM element
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

// Delete post confirmation and action
async function confirmDeletePost(postId) {
    if (!confirm('Are you sure you want to permanently delete this post?')) return;

    try {
        await apiRequest(`/api/posts/${postId}/delete/`, { method: 'DELETE' });
        showToast('Post deleted.', 'success');

        const card = document.getElementById(`post-${postId}`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            card.style.transition = 'all 0.3s ease';
            setTimeout(() => card.remove(), 300);
        }

        // Decrement user post count
        if (currentUser && currentUser.post_count > 0) {
            currentUser.post_count -= 1;
            const postCountEl = document.getElementById('sidebar-post-count');
            if (postCountEl) postCountEl.textContent = currentUser.post_count;
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

        // Update post content in DOM
        const contentEl = document.getElementById(`post-content-${currentEditingPostId}`);
        if (contentEl) contentEl.textContent = updated.content;

        showToast('Post updated successfully!', 'success');
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
