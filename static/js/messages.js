/**
 * ConnectSphere - Direct Messages (DM) Page Logic
 */

let activePartner = window.TARGET_USERNAME || null;
let conversations = [];
let contacts = [];
let messages = [];
let partnerInfo = null;
let currentTab = 'chats'; // 'chats' | 'contacts'
let pollingInterval = null;
let isSending = false;

document.addEventListener('DOMContentLoaded', async () => {
    await loadConversations();
    await loadContacts();

    // If a target user was passed via URL (e.g. /messages/Karthik/), select them immediately
    if (activePartner) {
        selectConversation(activePartner);
    }

    // Search filter listener
    const searchInput = document.getElementById('dm-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (currentTab === 'chats') {
                renderConversations();
            } else {
                renderContacts();
            }
        });
    }

    // Real-time polling every 2.5 seconds
    pollingInterval = setInterval(async () => {
        if (activePartner) {
            await pollActiveChat(activePartner);
        }
        await loadConversations(true);
    }, 2500);
});

// Switch tabs between "Chats" and "Friends & Following"
function switchDmTab(tab) {
    currentTab = tab;
    const btnChats = document.getElementById('tab-btn-chats');
    const btnContacts = document.getElementById('tab-btn-contacts');
    const listChats = document.getElementById('dm-conversations-list');
    const listContacts = document.getElementById('dm-contacts-list');

    if (tab === 'chats') {
        btnChats.classList.add('active');
        btnContacts.classList.remove('active');
        listChats.style.display = 'block';
        listContacts.style.display = 'none';
        renderConversations();
    } else {
        btnContacts.classList.add('active');
        btnChats.classList.remove('active');
        listContacts.style.display = 'block';
        listChats.style.display = 'none';
        renderContacts();
    }
}

// Fetch all conversation threads
async function loadConversations(isBackground = false) {
    try {
        const data = await apiRequest('/api/conversations/');
        conversations = data.conversations || [];
        if (!isBackground) {
            renderConversations();
        }
    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

// Fetch connected contacts (mutual followers and following)
async function loadContacts() {
    try {
        const data = await apiRequest('/api/messages/contacts/');
        contacts = data.contacts || [];
        renderContacts();
    } catch (err) {
        console.error('Failed to load contacts:', err);
    }
}

// Render Conversation Threads
function renderConversations() {
    const container = document.getElementById('dm-conversations-list');
    if (!container) return;

    const query = (document.getElementById('dm-search-input')?.value || '').toLowerCase().trim();
    const filtered = conversations.filter(c => c.partner.username.toLowerCase().includes(query));

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">💬</div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff; margin-bottom: 0.25rem;">No active chats</div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                    People you follow can be messaged directly!
                </p>
                <button class="btn btn-primary btn-sm" onclick="switchDmTab('contacts')">
                    Browse Friends
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(c => {
        const isSelected = activePartner && activePartner.toLowerCase() === c.partner.username.toLowerCase();
        const hasUnread = c.unread_count > 0;
        const lastMsg = c.last_message;
        const isOnline = !!c.partner.is_online;

        return `
            <div class="dm-item ${isSelected ? 'active' : ''}" onclick="selectConversation('${escapeHtml(c.partner.username)}')">
                <div class="dm-avatar-wrapper">
                    ${c.partner.avatar ? `
                        <img src="${c.partner.avatar}" class="avatar avatar-md" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
                    ` : `
                        <div class="avatar avatar-md" style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 0.9rem;">
                            ${escapeHtml(c.partner.username.charAt(0).toUpperCase())}
                        </div>
                    `}
                    <span class="dm-status-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Active now' : (c.partner.status_text || 'Offline')}"></span>
                    ${hasUnread ? `
                        <span style="position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 6px #ef4444;"></span>
                    ` : ''}
                </div>

                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-weight: ${hasUnread ? '700' : '600'}; color: #fff; font-size: 0.88rem;">
                                @${escapeHtml(c.partner.username)}
                            </span>
                            ${c.partner.is_mutual ? `
                                <span style="font-size: 0.65rem; padding: 1px 5px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700;">Mutual</span>
                            ` : ''}
                        </div>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">
                            ${lastMsg ? formatDmTime(lastMsg.created_at) : ''}
                        </span>
                    </div>

                    <div style="font-size: 0.78rem; color: ${hasUnread ? '#fff' : 'var(--text-muted)'}; font-weight: ${hasUnread ? '600' : '400'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${lastMsg ? (lastMsg.is_mine ? 'You: ' : '') + escapeHtml(lastMsg.content) : 'Started a conversation'}
                    </div>
                </div>

                ${hasUnread ? `
                    <span style="background: var(--primary); color: #fff; border-radius: 10px; padding: 1px 6px; font-size: 0.7rem; font-weight: 700;">
                        ${c.unread_count}
                    </span>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Render Connected Contacts (Mutual followers & Following)
function renderContacts() {
    const container = document.getElementById('dm-contacts-list');
    if (!container) return;

    const query = (document.getElementById('dm-search-input')?.value || '').toLowerCase().trim();
    const filtered = contacts.filter(c => c.username.toLowerCase().includes(query));

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">👥</div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff; margin-bottom: 0.25rem;">No connections found</div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                    Follow users to connect and exchange direct messages.
                </p>
                <a href="/explore/" class="btn btn-primary btn-sm">Find People</a>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(contact => {
        const isSelected = activePartner && activePartner.toLowerCase() === contact.username.toLowerCase();
        const isOnline = !!contact.is_online;

        return `
            <div class="dm-item ${isSelected ? 'active' : ''}" onclick="selectConversation('${escapeHtml(contact.username)}')">
                <div class="dm-avatar-wrapper">
                    ${contact.avatar ? `
                        <img src="${contact.avatar}" class="avatar avatar-md" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
                    ` : `
                        <div class="avatar avatar-md" style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 0.9rem;">
                            ${escapeHtml(contact.username.charAt(0).toUpperCase())}
                        </div>
                    `}
                    <span class="dm-status-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Active now' : (contact.status_text || 'Offline')}"></span>
                </div>

                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-weight: 700; color: #fff; font-size: 0.88rem;">
                            @${escapeHtml(contact.username)}
                        </span>
                        ${contact.is_mutual ? `
                            <span style="font-size: 0.65rem; padding: 1px 6px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700;">Mutual Follower</span>
                        ` : `
                            <span style="font-size: 0.65rem; padding: 1px 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.08); color: var(--text-muted);">Following</span>
                        `}
                    </div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${contact.bio ? escapeHtml(contact.bio) : 'Click to send a message'}
                    </div>
                </div>

                <button class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 0.3rem 0.65rem;" onclick="event.stopPropagation(); selectConversation('${escapeHtml(contact.username)}')">
                    Chat
                </button>
            </div>
        `;
    }).join('');
}

// Select and open chat room with target username
async function selectConversation(username) {
    activePartner = username;

    const layout = document.querySelector('.dm-layout');
    if (layout) layout.classList.add('chat-open');

    // Show chat room, hide empty state
    const room = document.getElementById('dm-chat-room');
    const emptyState = document.getElementById('dm-empty-state');
    if (room) room.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    // Update active highlight in left list
    renderConversations();
    renderContacts();

    // Update browser URL silently
    window.history.replaceState(null, '', `/messages/${encodeURIComponent(username)}/`);

    // Load messages
    await loadMessagesForUser(username);

    // Focus input
    const input = document.getElementById('dm-message-input');
    if (input) input.focus();
}

function closeChatMobile() {
    activePartner = null;
    const layout = document.querySelector('.dm-layout');
    if (layout) layout.classList.remove('chat-open');
    const room = document.getElementById('dm-chat-room');
    const emptyState = document.getElementById('dm-empty-state');
    if (room) room.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    window.history.replaceState(null, '', '/messages/');
    renderConversations();
    renderContacts();
}

// Load message history for a user
async function loadMessagesForUser(username) {
    const container = document.getElementById('dm-messages-container');
    if (container && messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); margin: auto; padding: 2rem;">
                Loading chat...
            </div>
        `;
    }

    try {
        const data = await apiRequest(`/api/messages/${encodeURIComponent(username)}/`);
        messages = data.messages || [];
        partnerInfo = data.partner || {};
        partnerInfo.can_message = data.can_message ?? true;
        partnerInfo.is_mutual = data.is_mutual ?? false;
        partnerInfo.user_follows_partner = data.user_follows_partner ?? false;
        partnerInfo.partner_follows_user = data.partner_follows_user ?? false;

        updateChatHeader(username, partnerInfo);
        renderMessages();
        scrollToBottom();
    } catch (err) {
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--danger); margin: auto; padding: 2rem;">
                    ${err.message || 'Could not load chat history.'}
                </div>
            `;
        }
    }
}

// Polling background update for active chat
async function pollActiveChat(username) {
    try {
        const data = await apiRequest(`/api/messages/${encodeURIComponent(username)}/`);
        if (data.partner) {
            partnerInfo = { ...partnerInfo, ...data.partner };
            updateChatHeader(username, partnerInfo);
        }
        const newMessages = data.messages || [];
        // Only re-render if message count or last message ID changed
        if (newMessages.length !== messages.length || 
            (newMessages.length > 0 && newMessages[newMessages.length - 1].id !== (messages[messages.length - 1]?.id))) {
            messages = newMessages;
            renderMessages();
            scrollToBottom();
        }
    } catch (err) {
        // silent fail on polling
    }
}

// Update Top Chat Header details
function updateChatHeader(username, info) {
    const nameEl = document.getElementById('dm-partner-name');
    const handleEl = document.getElementById('dm-partner-handle');
    const avatarEl = document.getElementById('dm-partner-avatar');
    const linkEl = document.getElementById('dm-partner-profile-link');
    const viewBtn = document.getElementById('dm-view-profile-btn');
    const mutualBadge = document.getElementById('dm-mutual-badge');
    const followAlert = document.getElementById('dm-follow-alert');
    const followAlertText = document.getElementById('dm-follow-alert-text');
    const followBtn = document.getElementById('dm-follow-btn');
    const statusDot = document.getElementById('dm-partner-status-dot');
    const statusPill = document.getElementById('dm-partner-status-pill');
    const statusLabel = document.getElementById('dm-partner-status-label');

    if (nameEl) nameEl.textContent = username;
    if (handleEl) handleEl.textContent = `@${username}`;
    if (linkEl) linkEl.href = `/profile/${encodeURIComponent(username)}/`;
    if (viewBtn) viewBtn.href = `/profile/${encodeURIComponent(username)}/`;

    if (avatarEl) {
        if (info && info.avatar) {
            avatarEl.innerHTML = `<img src="${info.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarEl.textContent = username.charAt(0).toUpperCase();
        }
    }

    // Active status updates
    const isOnline = !!(info && info.is_online);
    const statusText = (info && info.status_text) ? info.status_text : 'Offline';

    if (statusDot) {
        statusDot.className = `dm-status-dot ${isOnline ? 'online' : 'offline'}`;
        statusDot.title = isOnline ? 'Active now' : statusText;
    }

    if (statusPill && statusLabel) {
        statusPill.className = `dm-status-pill ${isOnline ? 'online' : 'offline'}`;
        statusLabel.textContent = isOnline ? 'Active now' : statusText;
    }

    if (mutualBadge) {
        mutualBadge.style.display = info.is_mutual ? 'inline-block' : 'none';
    }

    // Follow notice
    if (followAlert) {
        if (info.can_message === false) {
            followAlert.style.display = 'flex';
            if (followAlertText) {
                followAlertText.textContent = `You must follow each other to exchange messages with @${username}.`;
            }
        } else {
            followAlert.style.display = 'none';
        }
    }

    if (followBtn) {
        followBtn.style.display = (!info.user_follows_partner) ? 'inline-block' : 'none';
    }
}

// Render Messages Bubbles
function renderMessages() {
    const container = document.getElementById('dm-messages-container');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div style="margin: auto; text-align: center; color: var(--text-muted); max-width: 360px; padding: 2rem 1rem;">
                <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">✨</div>
                <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 0.4rem; font-weight: 700;">
                    Chat with @${escapeHtml(activePartner)}
                </h4>
                <p style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.25rem;">
                    ${partnerInfo?.is_mutual ? 'You both follow each other! Say hello to kick off the conversation.' : 'Send a personal message below.'}
                </p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="setIcebreaker('👋 Hey there!')" style="border-radius: var(--radius-full); font-size: 0.78rem;">
                        👋 Hey there!
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="setIcebreaker('Loved your recent post!')" style="border-radius: var(--radius-full); font-size: 0.78rem;">
                        Loved your post!
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="setIcebreaker('How are you doing?')" style="border-radius: var(--radius-full); font-size: 0.78rem;">
                        How are you doing?
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(m => {
        const isMine = m.is_mine;

        return `
            <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'};">
                <div class="dm-bubble ${isMine ? 'dm-bubble-mine' : 'dm-bubble-theirs'}">
                    ${escapeHtml(m.content)}
                </div>
                <div class="dm-time">
                    ${formatDmTime(m.created_at)}
                    ${isMine ? (m.is_read ? ' ✓✓' : ' ✓') : ''}
                </div>
            </div>
        `;
    }).join('');
}

function setIcebreaker(text) {
    const input = document.getElementById('dm-message-input');
    if (input) {
        input.value = text;
        input.focus();
    }
}

// Send Direct Message
async function handleSendDmMessage(e) {
    if (e) e.preventDefault();
    if (!activePartner || isSending) return;

    const input = document.getElementById('dm-message-input');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    isSending = true;

    // Optimistic Bubble
    const optimistic = {
        id: Date.now(),
        sender_username: 'me',
        recipient_username: activePartner,
        content: content,
        created_at: new Date().toISOString(),
        is_read: false,
        is_mine: true
    };
    messages.push(optimistic);
    renderMessages();
    scrollToBottom();

    try {
        const res = await apiRequest(`/api/messages/${encodeURIComponent(activePartner)}/send/`, {
            method: 'POST',
            body: { content }
        });

        // Replace optimistic message with saved message
        const idx = messages.findIndex(m => m.id === optimistic.id);
        if (idx !== -1 && res.message) {
            messages[idx] = res.message;
        }
        await loadConversations(true);
    } catch (err) {
        showToast(err.message || 'Failed to send message.', 'error');
        // Remove optimistic bubble on error
        messages = messages.filter(m => m.id !== optimistic.id);
        renderMessages();
        input.value = content;
    } finally {
        isSending = false;
    }
}

// Follow active partner directly from DM header
async function handleFollowActivePartner() {
    if (!activePartner) return;
    try {
        const res = await apiRequest(`/api/users/${encodeURIComponent(activePartner)}/follow/`, {
            method: 'POST'
        });
        showToast(res.message, 'success');
        await loadMessagesForUser(activePartner);
        await loadContacts();
    } catch (err) {
        showToast(err.message || 'Could not update follow status.', 'error');
    }
}

function scrollToBottom() {
    const container = document.getElementById('dm-messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function formatDmTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
