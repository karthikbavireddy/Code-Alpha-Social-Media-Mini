import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Sparkles,
  User as UserIcon,
  Circle
} from 'lucide-react';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessagesPage({ targetUser, onOpenProfile }) {
  const { user, isAuthenticated, addToast } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(targetUser || null);
  const [messages, setMessages] = useState([]);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch all conversation threads
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated]);

  // Fetch message history for active conversation
  const loadMessages = useCallback(async (partnerUsername, isPolling = false) => {
    if (!partnerUsername || !isAuthenticated) return;
    if (!isPolling) setLoadingMessages(true);

    try {
      const data = await api.getMessages(partnerUsername);
      setMessages(data.messages || []);
      if (data.partner) {
        setPartnerInfo(data.partner);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // If targetUser prop changes (e.g. clicked "Message" on profile)
  useEffect(() => {
    if (targetUser) {
      setActivePartner(targetUser);
    }
  }, [targetUser]);

  // Load messages whenever activePartner changes
  useEffect(() => {
    if (activePartner) {
      loadMessages(activePartner);
      window.location.hash = `messages-${activePartner}`;
    }
  }, [activePartner, loadMessages]);

  // Scroll to bottom on initial message load or new message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time polling timer (every 2.5s for chat, every 5s for conversations list)
  useEffect(() => {
    if (!isAuthenticated) return;

    pollingRef.current = setInterval(() => {
      if (activePartner) {
        loadMessages(activePartner, true);
      }
      loadConversations();
    }, 2500);

    return () => clearInterval(pollingRef.current);
  }, [activePartner, isAuthenticated, loadMessages, loadConversations]);

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activePartner || isSending) return;

    const contentToSend = inputText.trim();
    setInputText('');

    // Optimistic UI update
    const optimisticMsg = {
      id: Date.now(),
      sender_username: user.username,
      recipient_username: activePartner,
      content: contentToSend,
      created_at: new Date().toISOString(),
      is_read: false,
      is_mine: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    try {
      const response = await api.sendMessage(activePartner, contentToSend);
      // Replace optimistic message with confirmed server message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? response.message : m))
      );
      loadConversations();
    } catch (err) {
      addToast(err.message || 'Failed to send message.', 'error');
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(contentToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.partner.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="glass-card"
      style={{
        width: '100%',
        height: 'calc(100vh - 120px)',
        minHeight: '560px',
        display: 'grid',
        gridTemplateColumns: activePartner ? '320px 1fr' : '1fr',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* ========================================================
          LEFT PANE: CONVERSATION THREADS LIST
          ======================================================== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: activePartner ? '1px solid var(--border-subtle)' : 'none',
          background: 'rgba(12, 14, 24, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Pane Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>Direct Messages</h2>
            </div>
            <span className="badge badge-primary">Real-time</span>
          </div>

          {/* Search Contacts */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loadingConversations ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              Loading messages...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '0.88rem' }}>No conversations yet.</p>
              <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>
                Visit a user's profile and click "Message" to start a chat!
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activePartner === c.partner.username;
              const hasUnread = c.unread_count > 0;

              return (
                <div
                  key={c.partner.id}
                  onClick={() => setActivePartner(c.partner.username)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    marginBottom: '6px',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    {c.partner.avatar ? (
                      <img src={c.partner.avatar} alt={c.partner.username} className="avatar avatar-md" />
                    ) : (
                      <div className="avatar avatar-md">
                        {c.partner.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {hasUnread && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: 'var(--accent-pink)',
                          boxShadow: '0 0 6px var(--accent-pink)',
                        }}
                      />
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: hasUnread ? '800' : '600', color: '#fff', fontSize: '0.9rem' }}>
                        {c.partner.username}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.last_message?.created_at ? timeAgo(c.last_message.created_at) : ''}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: hasUnread ? '#fff' : 'var(--text-muted)',
                        fontWeight: hasUnread ? '600' : '400',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.last_message?.is_mine ? 'You: ' : ''}
                      {c.last_message?.content || 'Started a conversation'}
                    </div>
                  </div>

                  {hasUnread && (
                    <span
                      style={{
                        background: 'var(--gradient-brand)',
                        color: '#fff',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                      }}
                    >
                      {c.unread_count}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT PANE: ACTIVE CHAT ROOM
          ======================================================== */}
      {activePartner ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(8, 9, 15, 0.9)' }}>
          {/* Chat Room Top Bar */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 18, 29, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                onClick={() => onOpenProfile && onOpenProfile(activePartner)}
                style={{ cursor: 'pointer' }}
              >
                {partnerInfo?.avatar ? (
                  <img src={partnerInfo.avatar} alt={activePartner} className="avatar avatar-md" />
                ) : (
                  <div className="avatar avatar-md">
                    {activePartner.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div
                  onClick={() => onOpenProfile && onOpenProfile(activePartner)}
                  style={{ fontWeight: '800', fontSize: '1rem', color: '#fff', cursor: 'pointer' }}
                >
                  @{activePartner}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Circle size={8} fill="currentColor" /> Active in ConnectSphere
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenProfile && onOpenProfile(activePartner)}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <UserIcon size={14} /> Profile
            </button>
          </div>

          {/* Messages Scroll View */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                Loading chat...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                <Sparkles size={36} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '4px' }}>Say hello to @{activePartner}!</h3>
                <p style={{ fontSize: '0.84rem' }}>Start your conversation by sending your first message.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.is_mine;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '72%',
                        padding: '10px 16px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMine ? 'var(--gradient-brand)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        fontSize: '0.92rem',
                        lineHeight: '1.45',
                        wordBreak: 'break-word',
                        boxShadow: isMine ? '0 4px 14px rgba(99, 102, 241, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {m.content}
                    </div>

                    {/* Timestamp & Status */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginTop: '3px',
                        padding: '0 4px',
                      }}
                    >
                      <span>{timeAgo(m.created_at)}</span>
                      {isMine && (
                        m.is_read ? (
                          <CheckCheck size={12} color="var(--accent-cyan)" />
                        ) : (
                          <Check size={12} />
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Field */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(16, 18, 29, 0.95)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              className="input-field"
              placeholder={`Message @${activePartner}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '12px 18px',
                fontSize: '0.92rem',
              }}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inputText.trim() || isSending}
              style={{
                borderRadius: 'var(--radius-full)',
                width: '46px',
                height: '46px',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        /* Empty state when no chat is selected on desktop */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-muted)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <MessageSquare size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            Your Messages
          </h2>
          <p style={{ fontSize: '0.88rem', maxWidth: '360px', lineHeight: '1.5' }}>
            Select a conversation on the left or search for a creator to start chatting in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
