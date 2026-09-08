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

document.addEventListener('DOMContentLoaded', () => {
    updateUnreadMessagesBadges();
});
