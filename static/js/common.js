/**
 * ConnectSphere - Common Utilities & API Fetch Wrapper
 */

// Retrieve CSRF token from cookie or meta tag
function getCsrfToken() {
    // 1. Try meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag && metaTag.content) {
        return metaTag.content;
    }

    // 2. Try cookie
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

// Global API Request Helper with CSRF & Error Handling
async function apiRequest(url, options = {}) {
    const defaultHeaders = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        defaultHeaders['X-CSRFToken'] = csrfToken;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };

    // If body is JSON object (not FormData), set Content-Type
    if (config.body && !(config.body instanceof FormData) && typeof config.body === 'object') {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);

        // Parse JSON response if present
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            let errorMsg = 'An unexpected error occurred.';
            if (data) {
                if (data.error) errorMsg = data.error;
                else if (data.detail) errorMsg = data.detail;
                else if (data.errors) {
                    const firstKey = Object.keys(data.errors)[0];
                    const val = data.errors[firstKey];
                    errorMsg = Array.isArray(val) ? val[0] : val;
                }
            }
            const error = new Error(errorMsg);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (err) {
        throw err;
    }
}

// Toast notification display
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

// Format date into human-readable relative time
function formatTimestamp(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Helper to render user avatar or styled initials
function renderAvatarHtml(avatarUrl, username, extraClass = '') {
    const initial = (username ? username.charAt(0) : '?').toUpperCase();
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
        return `<img src="${avatarUrl}" alt="@${username}" class="${extraClass}" onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className: '${extraClass}', textContent: '${initial}'}));">`;
    }
    return `<div class="${extraClass}">${initial}</div>`;
}

// Global Logout Handler
async function handleLogout() {
    try {
        await apiRequest('/api/logout/', { method: 'POST' });
        showToast('Logged out successfully.', 'success');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 300);
    } catch (err) {
        showToast(err.message || 'Logout failed.', 'error');
    }
}

// Global Unread Messages Counter & Badges for Desktop and Mobile
async function updateUnreadMessagesBadges() {
    const desktopBadge = document.getElementById('nav-messages-badge');
    const mobileTopBadge = document.getElementById('mobile-top-messages-badge');
    const mobileBottomBadge = document.getElementById('mobile-bottom-messages-badge');

    if (!desktopBadge && !mobileTopBadge && !mobileBottomBadge) return;

    try {
        const res = await apiRequest('/api/messages/unread-count/');
        const count = res ? (res.unread_count || 0) : 0;

        [desktopBadge, mobileTopBadge, mobileBottomBadge].forEach(badge => {
            if (!badge) return;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    } catch (err) {
        // Silently skip if guest or network unavailable
    }
}

// ==========================================
// REAL-TIME NOTIFICATIONS SYSTEM
// ==========================================

let _prevUnreadNotifsCount = -1;

async function updateNotificationsBadges(overrideCount = null, notifyUser = false) {
    const desktopBadge = document.getElementById('nav-notifications-badge');
    const mobileBadge = document.getElementById('mobile-top-notifications-badge');
    const unreadPill = document.getElementById('notifications-unread-pill');

    let count = overrideCount;
    if (count === null) {
        try {
            const res = await apiRequest('/api/notifications/unread-count/');
            count = res ? (res.unread_count || 0) : 0;
        } catch (err) {
            return;
        }
    }

    [desktopBadge, mobileBadge].forEach(badge => {
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    });

    if (unreadPill) {
        if (count > 0) {
            unreadPill.textContent = `${count} unread`;
            unreadPill.style.display = 'inline-block';
        } else {
            unreadPill.style.display = 'none';
        }
    }

    // Trigger toast notification if unread count increased during active session
    if (notifyUser && _prevUnreadNotifsCount >= 0 && count > _prevUnreadNotifsCount) {
        const diff = count - _prevUnreadNotifsCount;
        showToast(`🔔 You have ${diff} new notification${diff > 1 ? 's' : ''}!`, 'info');
    }

    _prevUnreadNotifsCount = count;
}

function toggleNotificationsDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;

    const isVisible = dropdown.style.display === 'flex' || dropdown.style.display === 'block';
    if (isVisible) {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'flex';
        loadNotificationsList();
    }
}

async function loadNotificationsList() {
    const listContainer = document.getElementById('notifications-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="notifications-loading">
            <div class="notif-spinner"></div>
            <span>Loading notifications...</span>
        </div>
    `;

    try {
        const res = await apiRequest('/api/notifications/');
        if (!res || !res.notifications || res.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="notifications-empty">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <h4>No notifications yet</h4>
                    <p>When someone mentions you, likes, comments, or posts, you'll see it here in real time.</p>
                </div>
            `;
            updateNotificationsBadges(0);
            return;
        }

        updateNotificationsBadges(res.unread_count || 0);

        const html = res.notifications.map(notif => {
            let iconHtml = '';
            if (notif.notification_type === 'mention') {
                iconHtml = `<span class="notif-type-icon notif-mention">@</span>`;
            } else if (notif.notification_type === 'like') {
                iconHtml = `<span class="notif-type-icon notif-like"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span>`;
            } else if (notif.notification_type === 'comment') {
                iconHtml = `<span class="notif-type-icon notif-comment"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>`;
            } else if (notif.notification_type === 'follow') {
                iconHtml = `<span class="notif-type-icon notif-follow"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg></span>`;
            } else {
                iconHtml = `<span class="notif-type-icon notif-post"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span>`;
            }

            const avatarHtml = renderAvatarHtml(notif.sender_avatar, notif.sender_username, 'notif-avatar');
            const relativeTime = formatTimestamp(notif.created_at);
            const targetUrl = notif.target_url || '#';
            const unreadClass = notif.is_read ? '' : 'unread';

            return `
                <div class="notification-item ${unreadClass}" onclick="handleNotificationItemClick(${notif.id}, '${targetUrl}', ${notif.is_read})" data-notif-id="${notif.id}">
                    <div class="notif-avatar-col">
                        ${avatarHtml}
                        ${iconHtml}
                    </div>
                    <div class="notif-content-col">
                        <div class="notif-text">${escapeHtml(notif.text)}</div>
                        <div class="notif-time">${relativeTime}</div>
                    </div>
                    ${!notif.is_read ? '<span class="notif-unread-dot"></span>' : ''}
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
    } catch (err) {
        listContainer.innerHTML = `
            <div class="notifications-error">
                <p>Failed to load notifications.</p>
                <button type="button" class="btn btn-sm btn-outline" onclick="loadNotificationsList()">Try again</button>
            </div>
        `;
    }
}

async function handleNotificationItemClick(notifId, targetUrl, isRead) {
    if (!isRead) {
        try {
            await apiRequest('/api/notifications/read/', {
                method: 'POST',
                body: JSON.stringify({ notification_ids: [notifId] })
            });
            const item = document.querySelector(`.notification-item[data-notif-id="${notifId}"]`);
            if (item) {
                item.classList.remove('unread');
                const dot = item.querySelector('.notif-unread-dot');
                if (dot) dot.remove();
            }
            updateNotificationsBadges();
        } catch (e) {}
    }

    if (targetUrl && targetUrl !== '#') {
        window.location.href = targetUrl;
    }
}

async function markAllNotificationsRead(event) {
    if (event) event.stopPropagation();

    try {
        await apiRequest('/api/notifications/read/', { method: 'POST', body: JSON.stringify({}) });
        updateNotificationsBadges(0);

        document.querySelectorAll('.notification-item.unread').forEach(el => {
            el.classList.remove('unread');
            const dot = el.querySelector('.notif-unread-dot');
            if (dot) dot.remove();
        });

        showToast('All notifications marked as read.', 'success');
    } catch (err) {
        showToast('Failed to mark notifications as read.', 'error');
    }
}

// Format @mentions and #hashtags in text as clickable links
function formatMentions(text) {
    if (!text) return '';
    // 1. Mentions @username -> <a href="/profile/username/" class="mention-tag" onclick="event.stopPropagation()">@username</a>
    let formatted = text.replace(/(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]+)/g, '$1<a href="/profile/$2/" class="mention-tag" onclick="event.stopPropagation()">@$2</a>');
    // 2. Hashtags #hashtag -> <a href="/explore/?q=%23$2" class="hashtag-tag" onclick="event.stopPropagation()">#$2</a>
    formatted = formatted.replace(/(^|[^a-zA-Z0-9_])#([a-zA-Z0-9_\u00C0-\u017F]+)/g, '$1<a href="/explore/?q=%23$2" class="hashtag-tag" onclick="event.stopPropagation()">#$2</a>');
    return formatted;
}

// Toggle like on a comment
async function toggleCommentLike(commentId) {
    const btn = document.getElementById(`comment-like-btn-${commentId}`);
    const countSpan = document.getElementById(`comment-like-count-${commentId}`);
    if (!btn) return;

    btn.disabled = true;
    try {
        const data = await apiRequest(`/api/comments/${commentId}/like/`, { method: 'POST' });
        const svg = btn.querySelector('svg');
        if (data.liked) {
            btn.classList.add('liked');
            if (svg) svg.setAttribute('fill', '#f43f5e');
        } else {
            btn.classList.remove('liked');
            if (svg) svg.setAttribute('fill', 'none');
        }
        if (countSpan) {
            countSpan.textContent = data.like_count > 0 ? data.like_count : '';
        }
    } catch (err) {
        if (err.status === 401) {
            showToast('Please log in to like comments.', 'info');
            setTimeout(() => { window.location.href = '/login/'; }, 600);
        } else {
            showToast(err.message || 'Could not like comment.', 'error');
        }
    } finally {
        btn.disabled = false;
    }
}

// Insert mention into the target comment input box
function mentionUserInComment(username, postId) {
    const input = document.getElementById(`comment-input-${postId}`) || document.getElementById('new-comment-text');
    if (!input) return;
    const mentionTag = `@${username} `;
    if (!input.value.includes(mentionTag)) {
        input.value = mentionTag + input.value;
    }
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

// ==========================================
// MENTION AUTOCOMPLETE ENGINE
// ==========================================
let _mentionDropdownEl = null;
let _mentionTargetInput = null;
let _mentionMatchInfo = null;
let _mentionSuggestions = [];
let _mentionSelectedIndex = 0;
let _mentionDebounceTimer = null;
const _mentionCache = new Map();

function getOrCreateMentionDropdown() {
    if (!_mentionDropdownEl) {
        _mentionDropdownEl = document.createElement('div');
        _mentionDropdownEl.id = 'global-mention-dropdown';
        _mentionDropdownEl.className = 'mention-autocomplete-dropdown';
        _mentionDropdownEl.style.display = 'none';
        document.body.appendChild(_mentionDropdownEl);

        // Prevent clicking inside dropdown from blurring the input
        _mentionDropdownEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
    }
    return _mentionDropdownEl;
}

function closeMentionDropdown() {
    if (_mentionDropdownEl) {
        _mentionDropdownEl.style.display = 'none';
    }
    _mentionTargetInput = null;
    _mentionMatchInfo = null;
    _mentionSuggestions = [];
    _mentionSelectedIndex = 0;
}

function insertSelectedMention(username) {
    if (!_mentionTargetInput || !_mentionMatchInfo) return;
    const input = _mentionTargetInput;
    const { startPos, query } = _mentionMatchInfo;
    const original = input.value;
    const endPos = startPos + query.length + 1; // +1 for '@'

    const before = original.slice(0, startPos);
    const after = original.slice(endPos);
    const insertion = `@${username} `;

    input.value = before + insertion + after;
    const newCursor = before.length + insertion.length;
    input.focus();
    input.setSelectionRange(newCursor, newCursor);

    // Dispatch input event so character counters and auto-resize react
    input.dispatchEvent(new Event('input', { bubbles: true }));
    closeMentionDropdown();
}

function renderMentionDropdownItems() {
    if (!_mentionDropdownEl || _mentionSuggestions.length === 0) {
        closeMentionDropdown();
        return;
    }

    _mentionDropdownEl.innerHTML = _mentionSuggestions.map((user, idx) => {
        const isSelected = idx === _mentionSelectedIndex;
        const avatarLetter = (user.username || '?').charAt(0).toUpperCase();
        return `
            <div class="mention-autocomplete-item ${isSelected ? 'active' : ''}" data-index="${idx}" onclick="insertSelectedMention('${escapeHtml(user.username)}')">
                ${user.avatar ? `
                    <img src="${user.avatar}" class="mention-item-avatar" alt="${escapeHtml(user.username)}">
                ` : `
                    <div class="mention-item-avatar">${avatarLetter}</div>
                `}
                <div class="mention-item-info">
                    <div class="mention-item-username">@${escapeHtml(user.username)}</div>
                    ${user.bio ? `<div class="mention-item-bio">${escapeHtml(user.bio)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    _mentionDropdownEl.style.display = 'block';
    positionMentionDropdown();
}

function positionMentionDropdown() {
    if (!_mentionDropdownEl || !_mentionTargetInput) return;
    const rect = _mentionTargetInput.getBoundingClientRect();
    const dropdownHeight = Math.min(_mentionSuggestions.length * 44 + 10, 230);
    const viewportHeight = window.innerHeight;

    // Center horizontally aligned with input, keeping within screen bounds
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 270));
    _mentionDropdownEl.style.left = `${left}px`;

    // Position above if not enough space below
    if (viewportHeight - rect.bottom < dropdownHeight + 10 && rect.top > dropdownHeight + 10) {
        _mentionDropdownEl.style.top = 'auto';
        _mentionDropdownEl.style.bottom = `${viewportHeight - rect.top + 6}px`;
    } else {
        _mentionDropdownEl.style.bottom = 'auto';
        _mentionDropdownEl.style.top = `${rect.bottom + 6}px`;
    }
}

async function handleMentionInput(target) {
    const val = target.value || '';
    const caret = target.selectionStart;
    if (typeof caret !== 'number') {
        closeMentionDropdown();
        return;
    }

    const textBeforeCaret = val.slice(0, caret);
    // Matches @query at end of string or after whitespace
    const match = textBeforeCaret.match(/(^|\s)@([a-zA-Z0-9_]*)$/);

    if (!match) {
        closeMentionDropdown();
        return;
    }

    const query = match[2];
    const matchLength = match[0].length;
    const leadingSpace = match[1];
    const startPos = caret - matchLength + leadingSpace.length;

    _mentionTargetInput = target;
    _mentionMatchInfo = { startPos, query };
    getOrCreateMentionDropdown();

    clearTimeout(_mentionDebounceTimer);
    _mentionDebounceTimer = setTimeout(async () => {
        try {
            let users = [];
            const cacheKey = query.toLowerCase();
            if (_mentionCache.has(cacheKey)) {
                users = _mentionCache.get(cacheKey);
            } else {
                const res = await apiRequest(`/api/search/?q=${encodeURIComponent(query)}`);
                users = Array.isArray(res) ? res : (res.users || []);
                _mentionCache.set(cacheKey, users);
            }

            if (users && users.length > 0) {
                _mentionSuggestions = users.slice(0, 6);
                _mentionSelectedIndex = 0;
                renderMentionDropdownItems();
            } else {
                closeMentionDropdown();
            }
        } catch (err) {
            closeMentionDropdown();
        }
    }, 120);
}

/* ==========================================================================
   Real-Time Hashtag Autocomplete System (A to Z suggestions)
   ========================================================================== */
let _hashtagBarEl = null;
let _hashtagTargetInput = null;
let _hashtagMatchInfo = null;
let _hashtagSuggestions = [];
let _hashtagSelectedIndex = 0;
let _hashtagDebounceTimer = null;
const _hashtagCache = new Map();

function getOrCreateHashtagBar() {
    if (!_hashtagBarEl) {
        _hashtagBarEl = document.createElement('div');
        _hashtagBarEl.id = 'global-hashtag-suggestions';
        _hashtagBarEl.className = 'hashtag-autocomplete-bar';
        _hashtagBarEl.style.display = 'none';
        document.body.appendChild(_hashtagBarEl);

        // Prevent clicking inside bar from blurring the input
        _hashtagBarEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        _hashtagBarEl.addEventListener('touchstart', (e) => {
            // allow native touch scrolling inside track
        }, { passive: true });
    }
    return _hashtagBarEl;
}

function closeHashtagBar() {
    if (_hashtagBarEl) {
        _hashtagBarEl.style.display = 'none';
    }
    _hashtagTargetInput = null;
    _hashtagMatchInfo = null;
    _hashtagSuggestions = [];
    _hashtagSelectedIndex = 0;
}

function insertSelectedHashtag(tag) {
    if (!_hashtagTargetInput || !_hashtagMatchInfo) return;
    const input = _hashtagTargetInput;
    const { startPos, query } = _hashtagMatchInfo;
    const original = input.value;
    const endPos = startPos + query.length + 1; // +1 for '#'

    const before = original.slice(0, startPos);
    const after = original.slice(endPos);
    const cleanTag = tag.replace(/^#/, '').trim();
    const insertion = `#${cleanTag} `;

    input.value = before + insertion + after;
    const newCursor = before.length + insertion.length;
    input.focus();
    input.setSelectionRange(newCursor, newCursor);

    // Dispatch input event so character counters, previewers, and auto-resize react
    input.dispatchEvent(new Event('input', { bubbles: true }));
    closeHashtagBar();
}

function renderHashtagBarItems() {
    if (!_hashtagBarEl || _hashtagSuggestions.length === 0) {
        closeHashtagBar();
        return;
    }

    const chipsHtml = _hashtagSuggestions.map((item, idx) => {
        const isSelected = idx === _hashtagSelectedIndex;
        const displayTag = (item.tag || '').toUpperCase();
        return `
            <button type="button" 
                class="hashtag-chip ${isSelected ? 'active' : ''}" 
                data-index="${idx}" 
                title="#${item.tag}${item.count > 1 ? ` (${item.count} posts)` : ''}"
                onclick="insertSelectedHashtag('${escapeHtml(item.tag)}'); event.preventDefault(); event.stopPropagation();">
                <span class="hashtag-hash">#</span><span class="hashtag-name">${escapeHtml(displayTag)}</span>
            </button>
        `;
    }).join('');

    _hashtagBarEl.innerHTML = `
        <div class="hashtag-bar-inner">
            <div class="hashtag-bar-header">
                <span class="hashtag-bar-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
                    Suggested Hashtags
                </span>
                <span class="hashtag-bar-hint">Tap or click to add</span>
            </div>
            <div class="hashtag-chips-track">
                ${chipsHtml}
            </div>
        </div>
    `;

    _hashtagBarEl.style.display = 'block';
    positionHashtagBar();

    // Auto-scroll selected chip into view in track
    const activeChip = _hashtagBarEl.querySelector('.hashtag-chip.active');
    if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function positionHashtagBar() {
    if (!_hashtagBarEl || !_hashtagTargetInput) return;
    const rect = _hashtagTargetInput.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    const barWidth = isMobile
        ? Math.min(window.innerWidth - 20, Math.max(300, rect.width || window.innerWidth - 20))
        : Math.min(window.innerWidth - 24, Math.max(340, rect.width));

    let left = rect.left;
    if (left + barWidth > window.innerWidth - 10) {
        left = window.innerWidth - barWidth - 10;
    }
    if (left < 10) left = 10;

    const barHeight = 82;
    const vpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const vpTop = window.visualViewport ? window.visualViewport.offsetTop : 0;

    // Check if space below input or above
    let top;
    if (rect.bottom + barHeight + 8 > vpTop + vpHeight && rect.top - barHeight > vpTop + 8) {
        top = Math.max(vpTop + 8, rect.top - barHeight - 6);
    } else {
        top = Math.min(vpTop + vpHeight - barHeight - 8, rect.bottom + 6);
    }

    _hashtagBarEl.style.position = 'fixed';
    _hashtagBarEl.style.left = `${Math.round(left)}px`;
    _hashtagBarEl.style.top = `${Math.round(top)}px`;
    _hashtagBarEl.style.width = `${Math.round(barWidth)}px`;
}

async function handleHashtagInput(target) {
    const val = target.value || '';
    const caret = target.selectionStart;
    if (typeof caret !== 'number') {
        closeHashtagBar();
        return;
    }

    const textBeforeCaret = val.slice(0, caret);
    // Matches #query at end of string or after whitespace / start of line
    const match = textBeforeCaret.match(/(^|\s)#([a-zA-Z0-9_\u00C0-\u017F]*)$/);

    if (!match) {
        closeHashtagBar();
        return;
    }

    // If mention dropdown is currently visible, suppress hashtags
    if (_mentionDropdownEl && _mentionDropdownEl.style.display !== 'none') {
        closeHashtagBar();
        return;
    }

    const query = match[2];
    const matchLength = match[0].length;
    const leadingSpace = match[1];
    const startPos = caret - matchLength + leadingSpace.length;

    _hashtagTargetInput = target;
    _hashtagMatchInfo = { startPos, query };
    getOrCreateHashtagBar();

    clearTimeout(_hashtagDebounceTimer);
    _hashtagDebounceTimer = setTimeout(async () => {
        try {
            let tags = [];
            const cacheKey = query.toLowerCase();
            if (_hashtagCache.has(cacheKey)) {
                tags = _hashtagCache.get(cacheKey);
            } else {
                const res = await apiRequest(`/api/hashtags/?q=${encodeURIComponent(query)}`);
                tags = Array.isArray(res) ? res : [];
                _hashtagCache.set(cacheKey, tags);
            }

            if (tags && tags.length > 0) {
                _hashtagSuggestions = tags;
                _hashtagSelectedIndex = 0;
                renderHashtagBarItems();
            } else {
                closeHashtagBar();
            }
        } catch (err) {
            closeHashtagBar();
        }
    }, 60);
}

function setupGlobalAutocompleteListeners() {
    // Listen for input on text inputs & textareas
    document.addEventListener('input', (e) => {
        const target = e.target;
        if (!target) return;
        const tag = target.tagName;
        const isTextInput = tag === 'TEXTAREA' || (tag === 'INPUT' && (target.type === 'text' || !target.type));
        if (isTextInput) {
            handleMentionInput(target);
            handleHashtagInput(target);
        }
    });

    // Keyboard navigation when dropdowns are open
    document.addEventListener('keydown', (e) => {
        // 1. Hashtag bar keyboard navigation
        if (_hashtagBarEl && _hashtagBarEl.style.display !== 'none' && _hashtagSuggestions.length > 0) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                _hashtagSelectedIndex = (_hashtagSelectedIndex + 1) % _hashtagSuggestions.length;
                renderHashtagBarItems();
                return;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                _hashtagSelectedIndex = (_hashtagSelectedIndex - 1 + _hashtagSuggestions.length) % _hashtagSuggestions.length;
                renderHashtagBarItems();
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                const selected = _hashtagSuggestions[_hashtagSelectedIndex];
                if (selected) {
                    insertSelectedHashtag(selected.tag);
                }
                return;
            } else if (e.key === 'Escape') {
                closeHashtagBar();
                return;
            }
        }

        // 2. Mention dropdown keyboard navigation
        if (_mentionDropdownEl && _mentionDropdownEl.style.display !== 'none' && _mentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                _mentionSelectedIndex = (_mentionSelectedIndex + 1) % _mentionSuggestions.length;
                renderMentionDropdownItems();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                _mentionSelectedIndex = (_mentionSelectedIndex - 1 + _mentionSuggestions.length) % _mentionSuggestions.length;
                renderMentionDropdownItems();
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                const selected = _mentionSuggestions[_mentionSelectedIndex];
                if (selected) {
                    insertSelectedMention(selected.username);
                }
            } else if (e.key === 'Escape') {
                closeMentionDropdown();
            }
        }
    }, true);

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (_hashtagBarEl && _hashtagBarEl.style.display !== 'none') {
            if (!_hashtagBarEl.contains(e.target) && e.target !== _hashtagTargetInput) {
                closeHashtagBar();
            }
        }
        if (_mentionDropdownEl && _mentionDropdownEl.style.display !== 'none') {
            if (!_mentionDropdownEl.contains(e.target) && e.target !== _mentionTargetInput) {
                closeMentionDropdown();
            }
        }
    });

    // Reposition on resize/scroll
    window.addEventListener('resize', () => {
        if (_hashtagBarEl && _hashtagBarEl.style.display !== 'none') {
            positionHashtagBar();
        }
        if (_mentionDropdownEl && _mentionDropdownEl.style.display !== 'none') {
            positionMentionDropdown();
        }
    });
    window.addEventListener('scroll', () => {
        if (_hashtagBarEl && _hashtagBarEl.style.display !== 'none') {
            positionHashtagBar();
        }
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
    updateUnreadMessagesBadges();
    updateNotificationsBadges(null, false);
    setupGlobalAutocompleteListeners();

    // Close notifications dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown || dropdown.style.display === 'none') return;
        const btnDesktop = document.getElementById('nav-notifications-btn');
        const btnMobile = document.getElementById('mobile-header-notifications-btn');
        if (!dropdown.contains(e.target) && !btnDesktop?.contains(e.target) && !btnMobile?.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Start background activity heartbeat (every 20s while tab is active)
    if (!window._heartbeatStarted) {
        window._heartbeatStarted = true;
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                const token = getCsrfToken();
                fetch('/api/heartbeat/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': token || '',
                        'Content-Type': 'application/json'
                    }
                })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data) {
                        if (typeof data.unread_notifications_count !== 'undefined') {
                            updateNotificationsBadges(data.unread_notifications_count, true);
                        }
                        if (typeof data.unread_messages_count !== 'undefined') {
                            const desktopBadge = document.getElementById('nav-messages-badge');
                            const mobileTopBadge = document.getElementById('mobile-top-messages-badge');
                            const mobileBottomBadge = document.getElementById('mobile-bottom-messages-badge');
                            const count = data.unread_messages_count;
                            [desktopBadge, mobileTopBadge, mobileBottomBadge].forEach(badge => {
                                if (!badge) return;
                                if (count > 0) {
                                    badge.textContent = count > 99 ? '99+' : count;
                                    badge.style.display = 'inline-block';
                                } else {
                                    badge.style.display = 'none';
                                }
                            });
                        }
                    }
                })
                .catch(() => {});
            }
        }, 20000);
    }
});

// ==========================================
// HTML ESCAPE HELPER
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// UNIVERSAL FOLLOWERS & FOLLOWING MODAL SYSTEM
// ==========================================
let currentFollowTab = 'followers'; // 'followers' | 'following'
let currentFollowTarget = null;
let loadedFollowList = [];

async function openFollowListModal(initialTab = 'followers', username = null) {
    const modal = document.getElementById('follow-list-modal');
    if (!modal) return;

    // Determine target username
    currentFollowTarget = username || 
        window.TARGET_USERNAME || 
        window.CURRENT_USER_USERNAME || 
        (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : null) ||
        (document.getElementById('sidebar-username')?.textContent?.trim()) ||
        (document.getElementById('profile-display-name')?.textContent?.trim());

    if (!currentFollowTarget || currentFollowTarget === 'Loading...') {
        console.error('No valid user found to load follow list.');
        return;
    }

    modal.classList.add('active');

    // Sync modal tab counts with page stats if present
    const followerCountEl = document.getElementById('profile-followers-count') || document.getElementById('sidebar-follower-count');
    const followingCountEl = document.getElementById('profile-following-count') || document.getElementById('sidebar-following-count');
    const tabFollowerCount = document.getElementById('modal-followers-tab-count');
    const tabFollowingCount = document.getElementById('modal-following-tab-count');

    if (tabFollowerCount && followerCountEl) tabFollowerCount.textContent = followerCountEl.textContent;
    if (tabFollowingCount && followingCountEl) tabFollowingCount.textContent = followingCountEl.textContent;

    await switchFollowListTab(initialTab);
}

function closeFollowListModal() {
    const modal = document.getElementById('follow-list-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    const searchInput = document.getElementById('follow-modal-search-input');
    if (searchInput) searchInput.value = '';
}

async function switchFollowListTab(tab) {
    currentFollowTab = tab;

    const tabFollowers = document.getElementById('modal-tab-followers');
    const tabFollowing = document.getElementById('modal-tab-following');
    const searchInput = document.getElementById('follow-modal-search-input');
    if (searchInput) searchInput.value = '';

    if (tab === 'followers') {
        tabFollowers?.classList.add('active');
        tabFollowing?.classList.remove('active');
    } else {
        tabFollowing?.classList.add('active');
        tabFollowers?.classList.remove('active');
    }

    const bodyContainer = document.getElementById('follow-list-body');
    if (!bodyContainer) return;

    bodyContainer.innerHTML = `
        <div class="follow-list-loading">
            <div class="notif-spinner"></div>
            <span>Loading ${tab}...</span>
        </div>
    `;

    try {
        const endpoint = `/api/users/${encodeURIComponent(currentFollowTarget)}/${tab}/`;
        const data = await apiRequest(endpoint);
        loadedFollowList = (data && data.results) ? data.results : [];

        // Update tab count
        if (tab === 'followers') {
            const countEl = document.getElementById('modal-followers-tab-count');
            if (countEl) countEl.textContent = data.count ?? loadedFollowList.length;
        } else {
            const countEl = document.getElementById('modal-following-tab-count');
            if (countEl) countEl.textContent = data.count ?? loadedFollowList.length;
        }

        renderFollowList(loadedFollowList);
    } catch (err) {
        bodyContainer.innerHTML = `
            <div class="follow-list-empty">
                <div class="empty-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                <p>Failed to load ${tab}.</p>
                <button type="button" class="btn btn-outline btn-xs" onclick="switchFollowListTab('${tab}')" style="margin-top: 0.5rem;">Try again</button>
            </div>
        `;
    }
}

function filterFollowList() {
    const query = (document.getElementById('follow-modal-search-input')?.value || '').trim().toLowerCase();
    if (!query) {
        renderFollowList(loadedFollowList);
        return;
    }

    const filtered = loadedFollowList.filter(user => {
        const usernameMatch = user.username && user.username.toLowerCase().includes(query);
        const bioMatch = user.bio && user.bio.toLowerCase().includes(query);
        return usernameMatch || bioMatch;
    });

    renderFollowList(filtered, true);
}

function renderFollowList(users, isFiltered = false) {
    const bodyContainer = document.getElementById('follow-list-body');
    if (!bodyContainer) return;

    if (!users || users.length === 0) {
        if (isFiltered) {
            bodyContainer.innerHTML = `
                <div class="follow-list-empty">
                    <p>No matching members found.</p>
                </div>
            `;
        } else {
            const label = currentFollowTab === 'followers' ? 'followers' : 'following';
            bodyContainer.innerHTML = `
                <div class="follow-list-empty">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin-bottom: 0.6rem;">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h4 style="margin: 0 0 0.3rem 0; font-size: 0.95rem; color: #ffffff;">No ${label} yet</h4>
                    <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">${currentFollowTab === 'followers' ? `@${escapeHtml(currentFollowTarget)} does not have any followers yet.` : `@${escapeHtml(currentFollowTarget)} is not following anyone yet.`}</p>
                </div>
            `;
        }
        return;
    }

    const myUsername = (window.CURRENT_USER_USERNAME || (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : '')).toLowerCase();

    const html = users.map(user => {
        const isSelf = myUsername && myUsername === user.username.toLowerCase();
        const avatarHtml = renderAvatarHtml(user.profile_picture, user.username, 'follow-user-avatar');

        let badgeHtml = '';
        if (user.is_mutual_following) {
            badgeHtml = `<span class="follow-user-badge mutual-badge">Mutual</span>`;
        } else if (user.is_followed_by) {
            badgeHtml = `<span class="follow-user-badge follows-you-badge">Follows you</span>`;
        }

        let actionBtnHtml = '';
        if (myUsername && !isSelf) {
            const isFollowing = !!user.is_following;
            actionBtnHtml = `
                <button type="button" class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'} btn-xs follow-item-action-btn"
                    id="modal-follow-btn-${user.username}"
                    onclick="toggleFollowInModal('${user.username}')">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>
            `;
        }

        return `
            <div class="follow-user-item" data-username="${escapeHtml(user.username)}">
                <a href="/profile/${encodeURIComponent(user.username)}/" class="follow-user-link">
                    ${avatarHtml}
                    <div class="follow-user-info">
                        <div class="follow-user-name-row">
                            <span class="follow-user-username">@${escapeHtml(user.username)}</span>
                            ${badgeHtml}
                        </div>
                        ${user.bio ? `<div class="follow-user-bio">${escapeHtml(user.bio)}</div>` : ''}
                    </div>
                </a>
                <div class="follow-user-action">
                    ${actionBtnHtml}
                </div>
            </div>
        `;
    }).join('');

    bodyContainer.innerHTML = html;
}

async function toggleFollowInModal(username) {
    const btn = document.getElementById(`modal-follow-btn-${username}`);
    if (!btn) return;

    try {
        btn.disabled = true;
        const res = await apiRequest(`/api/users/${encodeURIComponent(username)}/follow/`, { method: 'POST' });

        const isFollowing = res.following;
        if (isFollowing) {
            btn.className = 'btn btn-outline btn-xs follow-item-action-btn';
            btn.textContent = 'Following';
            showToast(`Following @${username}`, 'success');
        } else {
            btn.className = 'btn btn-primary btn-xs follow-item-action-btn';
            btn.textContent = 'Follow';
            showToast(`Unfollowed @${username}`, 'info');
        }

        // Update in-memory user object
        const userObj = loadedFollowList.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (userObj) {
            userObj.is_following = isFollowing;
        }

        // 1. Sync following count on home page sidebar if present
        const sidebarFollowingCount = document.getElementById('sidebar-following-count');
        if (sidebarFollowingCount) {
            let count = parseInt(sidebarFollowingCount.textContent || '0', 10);
            sidebarFollowingCount.textContent = isFollowing ? (count + 1) : Math.max(0, count - 1);
        }

        // 2. If on profile page and the target user is the one followed/unfollowed:
        if (window.TARGET_USERNAME && window.TARGET_USERNAME.toLowerCase() === username.toLowerCase()) {
            const mainFollowBtn = document.getElementById('follow-toggle-btn');
            const followerCountEl = document.getElementById('profile-followers-count');
            const tabFollowerCount = document.getElementById('modal-followers-tab-count');
            if (mainFollowBtn) {
                mainFollowBtn.className = isFollowing ? 'btn btn-outline' : 'btn btn-primary';
                mainFollowBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
            }
            if (followerCountEl && res.follower_count !== undefined) followerCountEl.textContent = res.follower_count;
            if (tabFollowerCount && res.follower_count !== undefined) tabFollowerCount.textContent = res.follower_count;
        }

        // 3. If viewing own profile and in following tab:
        const myUsername = (window.CURRENT_USER_USERNAME || '').toLowerCase();
        if (window.TARGET_USERNAME && window.TARGET_USERNAME.toLowerCase() === myUsername) {
            const followingCountEl = document.getElementById('profile-following-count');
            const tabFollowingCount = document.getElementById('modal-following-tab-count');
            let currentCount = parseInt(followingCountEl?.textContent || '0', 10);
            currentCount = isFollowing ? (currentCount + 1) : Math.max(0, currentCount - 1);
            if (followingCountEl) followingCountEl.textContent = currentCount;
            if (tabFollowingCount) tabFollowingCount.textContent = currentCount;
        }

    } catch (err) {
        showToast(err.message || 'Follow action failed.', 'error');
    } finally {
        btn.disabled = false;
    }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeFollowListModal();
    }
});

