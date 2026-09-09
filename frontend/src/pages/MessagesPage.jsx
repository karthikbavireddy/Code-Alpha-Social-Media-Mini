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
  Circle,
  Users,
  UserPlus,
  Plus
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
  const { user, isAuthenticated, addToast, refreshUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activePartner, setActivePartner] = useState(targetUser || null);
  const [messages, setMessages] = useState([]);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [leftTab, setLeftTab] = useState('chats'); // 'chats' | 'contacts'
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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

  // Fetch contacts (mutual followers and following)
  const loadContacts = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingContacts(true);
    try {
      const data = await api.getMessageContacts();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
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
        setPartnerInfo({
          ...data.partner,
          can_message: data.can_message ?? true,
          is_mutual: data.is_mutual ?? false,
          user_follows_partner: data.user_follows_partner ?? false,
          partner_follows_user: data.partner_follows_user ?? false,
        });
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
    loadContacts();
  }, [loadConversations, loadContacts]);

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

  // Real-time polling timer (every 2.5s for chat, every 6s for conversations list)
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

  // Follow partner directly from chat if needed
  const handleFollowPartner = async () => {
    if (!activePartner || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(activePartner);
      addToast(res.message, 'info');
      await loadMessages(activePartner);
      await loadContacts();
      refreshUser();
    } catch (err) {
      addToast(err.message || 'Could not update follow status.', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.partner.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div
      className="glass-card"
      style={{
        width: '100%',
        height: 'calc(100vh - 120px)',
        minHeight: '560px',
        display: 'grid',
        gridTemplateColumns: activePartner ? '340px 1fr' : '1fr',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* ========================================================
          LEFT PANE: CONVERSATIONS & CONTACTS
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-primary">Following Chat</span>
            </div>
          </div>

          {/* Navigation Tabs (Chats vs Contacts) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={() => setLeftTab('chats')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: leftTab === 'chats' ? 'var(--gradient-brand)' : 'transparent',
                color: leftTab === 'chats' ? '#fff' : 'var(--text-muted)',
                fontWeight: leftTab === 'chats' ? '700' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'var(--transition-fast)',
              }}
            >
              <MessageSquare size={14} />
              Chats
              {totalUnread > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                  }}
                >
                  {totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => setLeftTab('contacts')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: leftTab === 'contacts' ? 'var(--gradient-brand)' : 'transparent',
                color: leftTab === 'contacts' ? '#fff' : 'var(--text-muted)',
                fontWeight: leftTab === 'contacts' ? '700' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'var(--transition-fast)',
              }}
            >
              <Users size={14} />
              Friends ({contacts.length})
            </button>
          </div>

          {/* Search Input */}
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
              placeholder={leftTab === 'chats' ? 'Search conversations...' : 'Search connected users...'}
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

        {/* Tab 1: Ongoing Chats */}
        {leftTab === 'chats' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {loadingConversations ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ fontSize: '0.88rem', fontWeight: '600', color: '#fff' }}>No active chats yet</p>
                <p style={{ fontSize: '0.8rem', marginTop: '6px', marginBottom: '14px' }}>
                  Two people following each other can message directly!
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setLeftTab('contacts')}
                  style={{ gap: '6px' }}
                >
                  <Users size={14} /> View Connected Friends
                </button>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: hasUnread ? '800' : '600', color: '#fff', fontSize: '0.9rem' }}>
                            {c.partner.username}
                          </span>
                          {c.partner.is_mutual && (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: 'rgba(99, 102, 241, 0.25)',
                                color: 'var(--accent-cyan)',
                                fontWeight: '700',
                              }}
                            >
                              Mutual
                            </span>
                          )}
                        </div>
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
        )}

        {/* Tab 2: Connected Friends (Mutual followers & Following) */}
        {leftTab === 'contacts' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            <div style={{ padding: '6px 8px', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              PEOPLE YOU FOLLOW / MUTUAL CONNECTIONS
            </div>

            {loadingContacts ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                Loading friends...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ fontSize: '0.88rem', fontWeight: '600', color: '#fff' }}>No connections yet</p>
                <p style={{ fontSize: '0.78rem', marginTop: '6px' }}>
                  Follow creators from the Feed or Explore page to connect and chat!
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = activePartner === contact.username;

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setActivePartner(contact.username);
                      setLeftTab('chats');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
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
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.username} className="avatar avatar-md" />
                    ) : (
                      <div className="avatar avatar-md">
                        {contact.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>
                          @{contact.username}
                        </span>
                        {contact.is_mutual ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#34d399',
                              fontWeight: '700',
                            }}
                          >
                            Mutual Follow
                          </span>
                        ) : contact.is_following ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Following
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Follows you
                          </span>
                        )}
                      </div>

                      {contact.bio ? (
                        <div
                          style={{
                            fontSize: '0.76rem',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px',
                          }}
                        >
                          {contact.bio}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Click to message
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px', fontSize: '0.74rem', flexShrink: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePartner(contact.username);
                        setLeftTab('chats');
                      }}
                    >
                      Chat
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    onClick={() => onOpenProfile && onOpenProfile(activePartner)}
                    style={{ fontWeight: '800', fontSize: '1rem', color: '#fff', cursor: 'pointer' }}
                  >
                    @{activePartner}
                  </span>
                  {partnerInfo?.is_mutual && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={11} /> Mutual Followers
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Circle size={8} fill="currentColor" /> Connected on ConnectSphere
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {partnerInfo && !partnerInfo.user_follows_partner && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleFollowPartner}
                  disabled={followLoading}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px' }}
                >
                  <UserPlus size={14} /> Follow
                </button>
              )}

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenProfile && onOpenProfile(activePartner)}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <UserIcon size={14} /> Profile
              </button>
            </div>
          </div>

          {/* Follow Status Banner if not connected */}
          {partnerInfo && partnerInfo.can_message === false && (
            <div
              style={{
                padding: '10px 16px',
                background: 'rgba(99, 102, 241, 0.12)',
                borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#c7d2fe',
                fontSize: '0.82rem',
              }}
            >
              <span>Follow each other to unlock direct messaging.</span>
              {!partnerInfo.user_follows_partner && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleFollowPartner}
                  disabled={followLoading}
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                >
                  Follow @{activePartner}
                </button>
              )}
            </div>
          )}

          {/* Messages Scroll View */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                Loading chat...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', maxWidth: '380px' }}>
                <Sparkles size={36} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>
                  Chat with @{activePartner}
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: '1.45', marginBottom: '16px' }}>
                  {partnerInfo?.is_mutual
                    ? "You both follow each other! Say hello to kick off your conversation."
                    : "You are connected! Send your first message below."}
                </p>

                {/* Quick Icebreakers */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {['👋 Hey there!', 'Loved your recent post!', 'How are you doing?'].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInputText(prompt)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-full)',
                        color: '#fff',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
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
                        width: 'fit-content',
                        maxWidth: '85%',
                        padding: '10px 16px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMine ? 'var(--gradient-brand)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        fontSize: '0.92rem',
                        lineHeight: '1.45',
                        overflowWrap: 'break-word',
                        wordBreak: 'normal',
                        whiteSpace: 'pre-wrap',
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
            Direct Messaging
          </h2>
          <p style={{ fontSize: '0.88rem', maxWidth: '380px', lineHeight: '1.5', marginBottom: '18px' }}>
            Two users following each other can chat directly in real-time. Select a friend from the left to begin!
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setLeftTab('contacts')}
            style={{ gap: '6px' }}
          >
            <Users size={14} /> Browse Connected Friends
          </button>
        </div>
      )}
    </div>
  );
}
