/**
 * ConnectSphere - Explore & User Search Logic
 */

let searchTimeout = null;
let currentUser = null;
let currentExploreTab = 'members'; // 'members' | 'posts'

document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    setupSearch();

    // Check if query was passed via URL (e.g. /explore/?q=%23tech or /explore/?q=@Karthik)
    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q') || '';
    const searchInput = document.getElementById('explore-search-input');

    if (qParam) {
        if (searchInput) searchInput.value = qParam;
        if (qParam.startsWith('#')) {
            switchExploreTab('posts', false);
        }
        await performSearch(qParam);
    } else {
        await performSearch(''); // Load initial suggestions
    }
});

async function initAuth() {
    try {
        currentUser = await apiRequest('/api/me/');
    } catch (err) {
        currentUser = null;
    }
}

function switchExploreTab(tab, executeSearch = true) {
    currentExploreTab = tab;
    const btnMembers = document.getElementById('tab-explore-members');
    const btnPosts = document.getElementById('tab-explore-posts');
    const userGrid = document.getElementById('user-results-grid');
    const postGrid = document.getElementById('post-results-grid');

    if (tab === 'members') {
        if (btnMembers) { btnMembers.className = 'btn btn-primary btn-sm'; }
        if (btnPosts) { btnPosts.className = 'btn btn-outline btn-sm'; }
        if (userGrid) userGrid.style.display = 'grid';
        if (postGrid) postGrid.style.display = 'none';
    } else {
        if (btnMembers) { btnMembers.className = 'btn btn-outline btn-sm'; }
        if (btnPosts) { btnPosts.className = 'btn btn-primary btn-sm'; }
        if (userGrid) userGrid.style.display = 'none';
        if (postGrid) postGrid.style.display = 'block';
    }

    if (executeSearch) {
        const query = (document.getElementById('explore-search-input')?.value || '').trim();
        performSearch(query);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('explore-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        searchTimeout = setTimeout(() => {
            // Auto switch tab if user starts typing #
            if (query.startsWith('#') && currentExploreTab !== 'posts') {
                switchExploreTab('posts', false);
            }
            performSearch(query);
        }, 300); // 300ms debounce
    });
}

async function performSearch(query) {
    if (currentExploreTab === 'posts') {
        await performPostSearch(query);
    } else {
        await performUserSearch(query);
    }
}

async function performUserSearch(query) {
    const grid = document.getElementById('user-results-grid');
    if (!grid) return;

    try {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">🔍</div>
                <div class="empty-title">Searching members...</div>
            </div>
        `;

        const users = await apiRequest(`/api/search/?q=${encodeURIComponent(query)}&type=users`);

        if (!users || users.length === 0) {
            grid.innerHTML = `
                <div class="empty-state card" style="grid-column: 1 / -1;">
                    <div class="empty-icon">👀</div>
                    <div class="empty-title">No members found</div>
                    <p class="empty-text">No user profiles matched "${escapeHtml(query)}". Try another search term!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        users.forEach(user => {
            grid.appendChild(createUserCardElement(user));
        });
    } catch (err) {
        grid.innerHTML = `
            <div class="empty-state card" style="grid-column: 1 / -1;">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Search Error</div>
                <p class="empty-text">${err.message}</p>
            </div>
        `;
    }
}

async function performPostSearch(query) {
    const postGrid = document.getElementById('post-results-grid');
    if (!postGrid) return;

    try {
        postGrid.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">🔍</div>
                <div class="empty-title">Searching posts & hashtags...</div>
            </div>
        `;

        const posts = await apiRequest(`/api/search/?q=${encodeURIComponent(query)}&type=posts`);

        if (!posts || posts.length === 0) {
            postGrid.innerHTML = `
                <div class="empty-state card">
                    <div class="empty-icon">#️⃣</div>
                    <div class="empty-title">No matching posts found</div>
                    <p class="empty-text">No posts matched "${escapeHtml(query)}". Try searching for another hashtag!</p>
                </div>
            `;
            return;
        }

        postGrid.innerHTML = '';
        posts.forEach(post => {
            postGrid.appendChild(createExplorePostCard(post));
        });
    } catch (err) {
        postGrid.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Search Error</div>
                <p class="empty-text">${err.message}</p>
            </div>
        `;
    }
}

function createExplorePostCard(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.style.marginBottom = '1.25rem';

    const avatarHtml = renderAvatarHtml(post.author_profile_picture, post.author, 'post-avatar');

    let mediaHtml = '';
    if (post.image) {
        mediaHtml = `
            <div class="post-media-wrap">
                <img src="${post.image}" alt="Post media" class="post-media-img" loading="lazy">
            </div>
        `;
    }

    card.innerHTML = `
        <div class="post-header">
            <div class="post-author-wrap">
                <a href="/profile/${post.author}/">${avatarHtml}</a>
                <div class="post-author-info">
                    <a href="/profile/${post.author}/" class="post-author-name">@${post.author}</a>
                    <span class="post-time">${typeof formatTimestamp === 'function' ? formatTimestamp(post.created_at) : new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <a href="/posts/${post.id}/" class="btn btn-outline btn-sm">View Post</a>
        </div>
        <div class="post-content">${formatMentions(escapeHtml(post.content))}</div>
        ${mediaHtml}
        <div class="post-footer" style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 1.25rem; padding-top: 0.75rem;">
            <span>❤️ ${post.like_count || 0} likes</span>
            <span>💬 ${post.comment_count || 0} comments</span>
        </div>
    `;
    return card;
}

function createUserCardElement(user) {
    const card = document.createElement('div');
    card.className = 'user-card';

    const avatarHtml = renderAvatarHtml(user.profile_picture, user.username, 'user-card-avatar');
    const isOwn = currentUser && currentUser.username === user.username;

    let followBtnHtml = '';
    if (!isOwn && currentUser) {
        followBtnHtml = `
            <button class="btn ${user.is_following ? 'btn-outline' : 'btn-primary'} btn-sm btn-block" id="explore-follow-${user.username}" onclick="toggleExploreFollow('${user.username}')" style="margin-top: 0.5rem;">
                ${user.is_following ? 'Unfollow' : 'Follow'}
            </button>
        `;
    }

    card.innerHTML = `
        <a href="/profile/${user.username}/">${avatarHtml}</a>
        <a href="/profile/${user.username}/" class="user-card-name">@${user.username}</a>
        <p class="user-card-bio">${escapeHtml(user.bio) || 'No bio provided.'}</p>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            <span id="explore-follower-count-${user.username}">${user.follower_count}</span> followers
        </div>
        <div style="display: flex; gap: 0.5rem; width: 100%;">
            <a href="/profile/${user.username}/" class="btn btn-outline btn-sm btn-block">View Profile</a>
            ${followBtnHtml}
        </div>
    `;

    return card;
}

async function toggleExploreFollow(username) {
    const btn = document.getElementById(`explore-follow-${username}`);
    const countSpan = document.getElementById(`explore-follower-count-${username}`);
    if (!btn) return;

    try {
        btn.disabled = true;
        const res = await apiRequest(`/api/users/${username}/follow/`, { method: 'POST' });

        if (res.following) {
            btn.className = 'btn btn-outline btn-sm btn-block';
            btn.textContent = 'Unfollow';
            showToast(`Following @${username}`, 'success');
        } else {
            btn.className = 'btn btn-primary btn-sm btn-block';
            btn.textContent = 'Follow';
            showToast(`Unfollowed @${username}`, 'info');
        }

        if (countSpan) {
            countSpan.textContent = res.follower_count;
        }
    } catch (err) {
        showToast(err.message || 'Follow action failed.', 'error');
    } finally {
        btn.disabled = false;
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
