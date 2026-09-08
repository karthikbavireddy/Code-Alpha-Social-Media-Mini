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

function setupGlobalMentionListener() {
    // Listen for input on text inputs & textareas
    document.addEventListener('input', (e) => {
        const target = e.target;
        if (!target) return;
        const tag = target.tagName;
        const isTextInput = tag === 'TEXTAREA' || (tag === 'INPUT' && (target.type === 'text' || !target.type));
        if (isTextInput) {
            handleMentionInput(target);
        }
    });

    // Keyboard navigation when mention dropdown is open
    document.addEventListener('keydown', (e) => {
        if (!_mentionDropdownEl || _mentionDropdownEl.style.display === 'none' || _mentionSuggestions.length === 0) {
            return;
        }

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
    }, true);

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (_mentionDropdownEl && _mentionDropdownEl.style.display !== 'none') {
            if (!_mentionDropdownEl.contains(e.target) && e.target !== _mentionTargetInput) {
                closeMentionDropdown();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateUnreadMessagesBadges();
    setupGlobalMentionListener();

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
                }).catch(() => {});
            }
        }, 20000);
    }
});
