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
let activeReplyMessage = null;
let activeEditingMessage = null;

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

                <div style="flex: 1; min-width: 0; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; margin-bottom: 2px;">
                        <span style="font-weight: 700; color: #fff; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;">
                            @${escapeHtml(contact.username)}
                        </span>
                        <span class="dm-contact-badge ${contact.is_mutual ? 'mutual' : 'following'}">
                            ${contact.is_mutual ? 'Mutual' : 'Following'}
                        </span>
                    </div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${contact.bio ? escapeHtml(contact.bio) : 'Click to send a message'}
                    </div>
                </div>

                <button class="btn btn-outline btn-sm dm-chat-btn" onclick="event.stopPropagation(); selectConversation('${escapeHtml(contact.username)}')">
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

    // Optimistically pre-populate partner info from loaded contacts or conversations
    const existingContact = (contacts || []).find(c => c.username && c.username.toLowerCase() === username.toLowerCase()) 
        || (conversations || []).find(c => c.partner && c.partner.username && c.partner.username.toLowerCase() === username.toLowerCase())?.partner;
    if (existingContact) {
        partnerInfo = {
            ...existingContact,
            is_following: Boolean(existingContact.is_following ?? existingContact.user_follows_partner),
            user_follows_partner: Boolean(existingContact.user_follows_partner ?? existingContact.is_following),
            partner_follows_user: Boolean(existingContact.partner_follows_user ?? existingContact.is_followed_by),
            is_mutual: Boolean(existingContact.is_mutual),
        };
        updateChatHeader(username, partnerInfo);
    }

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

        const isFollowed = data.partner?.is_following !== undefined
            ? Boolean(data.partner.is_following)
            : Boolean(data.partner?.user_follows_partner ?? data.user_follows_partner);
        const isMutual = data.partner?.is_mutual !== undefined
            ? Boolean(data.partner.is_mutual)
            : Boolean(data.is_mutual);

        partnerInfo = {
            ...(data.partner || {}),
            can_message: data.can_message ?? true,
            is_mutual: isMutual,
            user_follows_partner: isFollowed,
            is_following: isFollowed,
            partner_follows_user: Boolean(data.partner?.partner_follows_user ?? data.partner_follows_user),
        };

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
            const isFollowed = data.partner.is_following !== undefined
                ? Boolean(data.partner.is_following)
                : Boolean(data.partner.user_follows_partner ?? data.user_follows_partner ?? partnerInfo?.is_following);
            const isMutual = data.partner.is_mutual !== undefined
                ? Boolean(data.partner.is_mutual)
                : Boolean(data.is_mutual ?? partnerInfo?.is_mutual);

            partnerInfo = {
                ...partnerInfo,
                ...data.partner,
                user_follows_partner: isFollowed,
                is_following: isFollowed,
                partner_follows_user: Boolean(data.partner.partner_follows_user ?? partnerInfo?.partner_follows_user),
                is_mutual: isMutual,
                can_message: data.can_message ?? partnerInfo?.can_message ?? true,
            };
            updateChatHeader(username, partnerInfo);
        }
        const newMessages = data.messages || [];
        let hasChanges = newMessages.length !== messages.length;
        if (!hasChanges && newMessages.length > 0) {
            for (let i = 0; i < newMessages.length; i++) {
                if (newMessages[i].id !== messages[i]?.id || 
                    newMessages[i].content !== messages[i]?.content ||
                    newMessages[i].is_edited !== messages[i]?.is_edited) {
                    hasChanges = true;
                    break;
                }
            }
        }
        if (hasChanges) {
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
        mutualBadge.style.display = info && info.is_mutual ? 'inline-block' : 'none';
    }

    // Follow notice
    if (followAlert) {
        const canMessage = info ? (info.can_message !== false) : true;
        followAlert.style.display = canMessage ? 'none' : 'flex';
        if (!canMessage && followAlertText) {
            followAlertText.textContent = `You must follow each other to exchange messages with @${username}.`;
        }
    }

    // Follow button: When following that particular user, shows as "Following", if not following shows as "Follow"
    if (followBtn) {
        const isSelf = Boolean(
            window.CURRENT_USERNAME &&
            username.toLowerCase() === window.CURRENT_USERNAME.toLowerCase()
        );

        if (isSelf) {
            followBtn.style.display = 'none';
        } else {
            followBtn.style.display = 'inline-flex';
            const isFollowing = Boolean(info && (info.user_follows_partner || info.is_following));

            if (isFollowing) {
                followBtn.className = 'btn btn-outline btn-sm dm-action-btn dm-follow-btn following';
                followBtn.textContent = 'Following';
                followBtn.title = `Following @${username} (click to unfollow)`;
            } else {
                followBtn.className = 'btn btn-primary btn-sm dm-action-btn dm-follow-btn';
                followBtn.textContent = 'Follow';
                followBtn.title = `Follow @${username}`;
            }
        }
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
        const rawContent = m.content || '';

        return `
            <div class="dm-msg-row ${isMine ? 'mine' : 'theirs'}" id="dm-msg-${m.id}" data-id="${m.id}">
                <div class="dm-drag-reply-icon" id="dm-drag-icon-${m.id}">↩</div>
                <div class="dm-bubble-wrapper" id="dm-wrapper-${m.id}" data-id="${m.id}">
                    <!-- Floating Actions Bar -->
                    <div class="dm-msg-actions">
                        <button type="button" class="dm-msg-action-btn" title="Reply (or drag bubble)" onclick="event.stopPropagation(); startReplyToMessage(${m.id})">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                        </button>
                        <button type="button" class="dm-msg-action-btn" title="Copy text" onclick="event.stopPropagation(); copyMessageText('${escapeJsString(rawContent)}')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        ${isMine ? `
                            <button type="button" class="dm-msg-action-btn" title="Edit message" onclick="event.stopPropagation(); startEditMessage(${m.id})">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        ` : ''}
                    </div>

                    <!-- Bubble -->
                    <div class="dm-bubble ${isMine ? 'dm-bubble-mine' : 'dm-bubble-theirs'}">
                        ${m.reply_to_id ? `
                            <div class="dm-reply-quote" onclick="event.stopPropagation(); scrollToRepliedMessage(${m.reply_to_id})">
                                <div class="dm-reply-quote-sender">↩ @${escapeHtml(m.reply_to_sender || 'User')}</div>
                                <div class="dm-reply-quote-text">${escapeHtml(m.reply_to_content || 'Quoted message')}</div>
                            </div>
                        ` : ''}
                        <div>${formatMessageContent(rawContent)}</div>
                    </div>
                </div>
                <div class="dm-time">
                    ${formatDmTime(m.created_at)}
                    ${m.is_edited ? '<span class="dm-edited-tag">(edited)</span>' : ''}
                    ${isMine ? (m.is_read ? ' ✓✓' : ' ✓') : ''}
                </div>
            </div>
        `;
    }).join('');

    setupDragToReplyListeners();
}

// Auto-link URLs, @mentions, and #hashtags inside message text
function formatMessageContent(rawText) {
    if (!rawText) return '';
    const escaped = escapeHtml(rawText);
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;
    const withLinks = escaped.replace(urlRegex, (matched) => {
        const href = (matched.startsWith('http://') || matched.startsWith('https://'))
            ? matched
            : `https://${matched}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="dm-link" onclick="event.stopPropagation()">${matched}</a>`;
    });
    return (typeof formatMentions === 'function') ? formatMentions(withLinks) : withLinks;
}

// Copy message text
async function copyMessageText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Message copied to clipboard!', 'success');
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('Message copied to clipboard!', 'success');
        } catch (err) {
            showToast('Could not copy message.', 'error');
        }
        document.body.removeChild(ta);
    }
}

// Start reply to a message
function startReplyToMessage(msgId) {
    const target = messages.find(m => m.id === msgId);
    if (!target) return;

    if (activeEditingMessage) {
        cancelContextAction(false);
    }

    activeReplyMessage = {
        id: target.id,
        sender: target.sender_username,
        snippet: (target.content || '').slice(0, 75)
    };

    const banner = document.getElementById('dm-context-banner');
    const icon = document.getElementById('dm-context-icon');
    const title = document.getElementById('dm-context-title');
    const snippet = document.getElementById('dm-context-snippet');

    if (banner && icon && title && snippet) {
        icon.textContent = '↩';
        title.textContent = `Replying to @${activeReplyMessage.sender}`;
        snippet.textContent = `"${activeReplyMessage.snippet}"`;
        banner.style.display = 'flex';
    }

    const input = document.getElementById('dm-message-input');
    if (input) input.focus();
}

// Start editing own message
function startEditMessage(msgId) {
    const target = messages.find(m => m.id === msgId);
    if (!target || !target.is_mine) return;

    if (activeReplyMessage) {
        cancelContextAction(false);
    }

    activeEditingMessage = {
        id: target.id,
        content: target.content
    };

    const banner = document.getElementById('dm-context-banner');
    const icon = document.getElementById('dm-context-icon');
    const title = document.getElementById('dm-context-title');
    const snippet = document.getElementById('dm-context-snippet');

    if (banner && icon && title && snippet) {
        icon.textContent = '✏️';
        title.textContent = 'Editing message';
        snippet.textContent = `"${target.content.slice(0, 75)}"`;
        banner.style.display = 'flex';
    }

    const input = document.getElementById('dm-message-input');
    if (input) {
        input.value = target.content;
        input.focus();
    }
}

// Cancel active reply or edit
function cancelContextAction(clearInput = true) {
    const wasEditing = Boolean(activeEditingMessage);
    activeReplyMessage = null;
    activeEditingMessage = null;

    const banner = document.getElementById('dm-context-banner');
    if (banner) banner.style.display = 'none';

    if (clearInput && wasEditing) {
        const input = document.getElementById('dm-message-input');
        if (input) input.value = '';
    }
}

// Smooth scroll to replied message
function scrollToRepliedMessage(msgId) {
    const row = document.getElementById(`dm-msg-${msgId}`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('dm-msg-highlight');
        setTimeout(() => row.classList.remove('dm-msg-highlight'), 1800);
    } else {
        showToast('Original message not found in recent history.', 'info');
    }
}

// Drag / Swipe to reply on message bubbles
function setupDragToReplyListeners() {
    const wrappers = document.querySelectorAll('.dm-bubble-wrapper');
    wrappers.forEach(wrapper => {
        const msgId = parseInt(wrapper.getAttribute('data-id'), 10);
        if (!msgId) return;

        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        const icon = document.getElementById(`dm-drag-icon-${msgId}`);
        const isMine = wrapper.closest('.dm-msg-row')?.classList.contains('mine');

        function onTouchStart(e) {
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            currentX = startX;
            isDragging = true;
            wrapper.style.transition = 'none';
        }

        function onTouchMove(e) {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const diffX = clientX - startX;

            // Determine drag direction towards opposite edge (theirs: swipe right > 0; mine: swipe left < 0)
            const validDrag = isMine ? (diffX < 0) : (diffX > 0);
            if (!validDrag) return;

            const pullDist = Math.min(Math.abs(diffX), 70);
            wrapper.style.transform = `translateX(${isMine ? -pullDist : pullDist}px)`;

            if (icon) {
                const ratio = Math.min(pullDist / 38, 1);
                icon.style.opacity = ratio;
                icon.style.transform = `translateY(-50%) scale(${ratio})`;
            }
        }

        function onTouchEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            wrapper.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
            wrapper.style.transform = 'translateX(0)';

            if (icon) {
                icon.style.opacity = 0;
                icon.style.transform = 'translateY(-50%) scale(0)';
            }

            const clientX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : currentX;
            const diffX = clientX - startX;
            const validDrag = isMine ? (diffX < -38) : (diffX > 38);

            if (validDrag) {
                startReplyToMessage(msgId);
            }
        }

        wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
        wrapper.addEventListener('touchmove', onTouchMove, { passive: true });
        wrapper.addEventListener('touchend', onTouchEnd);
        wrapper.addEventListener('touchcancel', onTouchEnd);
    });
}

function setIcebreaker(text) {
    const input = document.getElementById('dm-message-input');
    if (input) {
        input.value = text;
        input.focus();
    }
}

// Send or Edit Direct Message
async function handleSendDmMessage(e) {
    if (e) e.preventDefault();
    if (!activePartner || isSending) return;

    const input = document.getElementById('dm-message-input');
    const content = input.value.trim();
    if (!content) return;

    // IF EDITING:
    if (activeEditingMessage) {
        const editId = activeEditingMessage.id;
        isSending = true;
        try {
            const res = await apiRequest(`/api/messages/${editId}/edit/`, {
                method: 'PATCH',
                body: { content }
            });

            if (res.message) {
                const idx = messages.findIndex(m => m.id === editId);
                if (idx !== -1) {
                    messages[idx] = res.message;
                }
                showToast('Message edited successfully.', 'success');
            }
            cancelContextAction(true);
            renderMessages();
            await loadConversations(true);
        } catch (err) {
            showToast(err.message || 'Could not edit message.', 'error');
        } finally {
            isSending = false;
        }
        return;
    }

    // IF SENDING NEW MESSAGE (regular or reply):
    input.value = '';
    isSending = true;
    const replyTarget = activeReplyMessage;
    cancelContextAction(false);

    // Optimistic Bubble
    const optimistic = {
        id: Date.now(),
        sender_username: window.CURRENT_USERNAME || 'me',
        recipient_username: activePartner,
        content: content,
        created_at: new Date().toISOString(),
        is_read: false,
        is_mine: true,
        reply_to_id: replyTarget ? replyTarget.id : null,
        reply_to_sender: replyTarget ? replyTarget.sender : null,
        reply_to_content: replyTarget ? replyTarget.snippet : null,
    };
    messages.push(optimistic);
    renderMessages();
    scrollToBottom();

    try {
        const payload = { content };
        if (replyTarget) {
            payload.reply_to_id = replyTarget.id;
        }
        const res = await apiRequest(`/api/messages/${encodeURIComponent(activePartner)}/send/`, {
            method: 'POST',
            body: payload
        });

        // Replace optimistic message with saved message
        const idx = messages.findIndex(m => m.id === optimistic.id);
        if (idx !== -1 && res.message) {
            messages[idx] = res.message;
            renderMessages();
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
    const followBtn = document.getElementById('dm-follow-btn');
    try {
        if (followBtn) followBtn.disabled = true;
        const res = await apiRequest(`/api/users/${encodeURIComponent(activePartner)}/follow/`, {
            method: 'POST'
        });
        const isFollowing = !!res.following;
        showToast(isFollowing ? `You are now following @${activePartner}` : `Unfollowed @${activePartner}`, isFollowing ? 'success' : 'info');
        if (partnerInfo) {
            partnerInfo.user_follows_partner = isFollowing;
            partnerInfo.is_following = isFollowing;
            if (!isFollowing) {
                partnerInfo.is_mutual = false;
            } else if (partnerInfo.partner_follows_user) {
                partnerInfo.is_mutual = true;
            }
            updateChatHeader(activePartner, partnerInfo);
        }
        await loadContacts();
    } catch (err) {
        showToast(err.message || 'Could not update follow status.', 'error');
    } finally {
        if (followBtn) followBtn.disabled = false;
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

function escapeJsString(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}
