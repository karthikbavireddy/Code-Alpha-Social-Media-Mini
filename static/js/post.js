/**
 * ConnectSphere - Post Detail & Comment Stream Logic
 */

let postId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    postId = window.POST_ID;
    if (!postId) return;

    await initAuth();
    await loadPostDetails();
    await loadComments();
    setupCommentForm();
});

async function initAuth() {
    try {
        currentUser = await apiRequest('/api/me/');
    } catch (err) {
        currentUser = null;
    }
}

async function loadPostDetails() {
    const container = document.getElementById('post-detail-container');
    if (!container) return;

    try {
        const post = await apiRequest(`/api/posts/${postId}/`);
        renderPost(post);
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Post Not Found</div>
                <p class="empty-text">${err.message || 'This post may have been removed.'}</p>
                <a href="/" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Back to Feed</a>
            </div>
        `;
    }
}

function renderPost(post) {
    const avatarEl = document.getElementById('post-author-avatar');
    const nameEl = document.getElementById('post-author-username');
    const timeEl = document.getElementById('post-created-time');
    const contentEl = document.getElementById('post-full-content');
    const mediaContainer = document.getElementById('post-media-container');
    const likeBtn = document.getElementById('post-like-btn');
    const likeCountEl = document.getElementById('post-like-count');
    const commentCountEl = document.getElementById('post-comment-count');

    const authorAvatarHtml = renderAvatarHtml(post.author_profile_picture, post.author, 'post-avatar');
    if (avatarEl) avatarEl.innerHTML = authorAvatarHtml;
    if (nameEl) {
        nameEl.textContent = `@${post.author}`;
        nameEl.href = `/profile/${post.author}/`;
    }
    if (timeEl) timeEl.textContent = formatTimestamp(post.created_at);
    if (contentEl) contentEl.textContent = post.content;

    if (mediaContainer) {
        if (post.image) {
            mediaContainer.innerHTML = `
                <div class="post-media-wrap">
                    <img src="${post.image}" alt="Post media" class="post-media-img" onerror="const w=this.closest('.post-media-wrap'); if(w) w.remove();">
                </div>
            `;
        } else {
            mediaContainer.innerHTML = '';
        }
    }

    if (likeCountEl) likeCountEl.textContent = post.like_count;
    if (commentCountEl) commentCountEl.textContent = post.comment_count;

    if (likeBtn) {
        const svg = likeBtn.querySelector('svg');
        if (post.liked_by_current_user) {
            likeBtn.classList.add('liked');
            if (svg) svg.setAttribute('fill', '#f43f5e');
        } else {
            likeBtn.classList.remove('liked');
            if (svg) svg.setAttribute('fill', 'none');
        }

        likeBtn.onclick = () => togglePostDetailLike();
    }
}

async function togglePostDetailLike() {
    const likeBtn = document.getElementById('post-like-btn');
    const likeCountSpan = document.getElementById('post-like-count');
    if (!likeBtn) return;

    likeBtn.disabled = true;

    try {
        const data = await apiRequest(`/api/posts/${postId}/like/`, { method: 'POST' });
        if (likeCountSpan) likeCountSpan.textContent = data.like_count;
        const svg = likeBtn.querySelector('svg');

        if (data.liked) {
            likeBtn.classList.add('liked');
            if (svg) svg.setAttribute('fill', '#f43f5e');
        } else {
            likeBtn.classList.remove('liked');
            if (svg) svg.setAttribute('fill', 'none');
        }
    } catch (err) {
        if (err.status === 401) {
            showToast('Please log in to like posts.', 'info');
            setTimeout(() => { window.location.href = '/login/'; }, 600);
        } else {
            showToast(err.message || 'Like action failed.', 'error');
        }
    } finally {
        likeBtn.disabled = false;
    }
}

async function loadComments() {
    const list = document.getElementById('post-comments-stream');
    if (!list) return;

    try {
        const comments = await apiRequest(`/api/posts/${postId}/comments/`);
        if (!comments || comments.length === 0) {
            list.innerHTML = '<p class="empty-state" style="padding: 1.5rem 0;">No comments yet. Share your thoughts!</p>';
            return;
        }

        list.innerHTML = '';
        comments.forEach(c => list.appendChild(createCommentNode(c)));
    } catch (err) {
        list.innerHTML = `<p style="color: var(--danger); padding: 1rem;">Failed to load comments: ${err.message}</p>`;
    }
}

function setupCommentForm() {
    const form = document.getElementById('new-comment-form');
    const input = document.getElementById('new-comment-text');
    const submitBtn = document.getElementById('submit-comment-btn');

    if (!form || !input) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            window.location.href = '/login/';
            return;
        }

        const text = input.value.trim();
        if (!text) {
            showToast('Comment text cannot be empty.', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            const newComment = await apiRequest(`/api/posts/${postId}/comments/`, {
                method: 'POST',
                body: { text }
            });

            input.value = '';
            showToast('Comment added!', 'success');

            const list = document.getElementById('post-comments-stream');
            const emptyMsg = list.querySelector('.empty-state');
            if (emptyMsg) emptyMsg.remove();

            list.appendChild(createCommentNode(newComment));

            const countEl = document.getElementById('post-comment-count');
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent || '0', 10) + 1;
            }
        } catch (err) {
            showToast(err.message || 'Failed to post comment.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Comment';
        }
    });
}

function createCommentNode(comment) {
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

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
