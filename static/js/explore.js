/**
 * ConnectSphere - Explore & User Search Logic
 */

let searchTimeout = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    setupSearch();
    await performSearch(''); // Load initial suggestions
});

async function initAuth() {
    try {
        currentUser = await apiRequest('/api/me/');
    } catch (err) {
        currentUser = null;
    }
}

function setupSearch() {
    const searchInput = document.getElementById('explore-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300); // 300ms debounce
    });
}

async function performSearch(query) {
    const grid = document.getElementById('user-results-grid');
    if (!grid) return;

    try {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">🔍</div>
                <div class="empty-title">Searching ConnectSphere...</div>
            </div>
        `;

        const users = await apiRequest(`/api/search/?q=${encodeURIComponent(query)}`);

        if (!users || users.length === 0) {
            grid.innerHTML = `
                <div class="empty-state card" style="grid-column: 1 / -1;">
                    <div class="empty-icon">👀</div>
                    <div class="empty-title">No users found</div>
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
