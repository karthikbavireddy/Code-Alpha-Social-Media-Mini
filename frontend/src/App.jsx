import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import MobileNav from './components/MobileNav';
import Toast from './components/Toast';
import PostComposer from './components/PostComposer';
import FeedPage from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import PostDetailPage from './pages/PostDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MessagesPage from './pages/MessagesPage';
import { X } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('feed');
  const [targetUsername, setTargetUsername] = useState(null);
  const [targetPostId, setTargetPostId] = useState(null);
  const [targetChatUser, setTargetChatUser] = useState(null);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  // Sync with URL Hash for natural navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('profile-')) {
        setTargetUsername(hash.replace('profile-', ''));
        setCurrentTab('profile');
      } else if (hash.startsWith('messages-')) {
        setTargetChatUser(hash.replace('messages-', ''));
        setCurrentTab('messages');
      } else if (hash === 'messages') {
        setTargetChatUser(null);
        setCurrentTab('messages');
      } else if (hash.startsWith('post-')) {
        setTargetPostId(parseInt(hash.replace('post-', ''), 10));
        setCurrentTab('post_detail');
      } else if (hash === 'explore') {
        setCurrentTab('explore');
      } else if (hash === 'login') {
        setCurrentTab('login');
      } else if (hash === 'register') {
        setCurrentTab('register');
      } else if (hash === 'feed' || !hash) {
        setCurrentTab('feed');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToTab = (tab) => {
    setCurrentTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProfile = (username) => {
    setTargetUsername(username);
    setCurrentTab('profile');
    window.location.hash = `profile-${username}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPostDetail = (postId) => {
    setTargetPostId(postId);
    setCurrentTab('post_detail');
    window.location.hash = `post-${postId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMessages = (username) => {
    setTargetChatUser(username || null);
    setCurrentTab('messages');
    window.location.hash = username ? `messages-${username}` : 'messages';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-dark)',
          color: '#fff',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 32px rgba(99, 102, 241, 0.6)',
            marginBottom: '16px',
            animation: 'pulseGlow 1.8s infinite ease-in-out',
          }}
        />
        <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>ConnectSphere</div>
        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Initializing social environment...
        </div>
      </div>
    );
  }

  const isAuthPage = currentTab === 'login' || currentTab === 'register';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notifications */}
      <Toast />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={navigateToTab}
        onOpenNewPost={() => setIsNewPostModalOpen(true)}
        onOpenProfile={openProfile}
      />

      {/* Main Grid Layout */}
      <main className="app-container">
        {isAuthPage ? (
          <div style={{ width: '100%', padding: '20px' }}>
            {currentTab === 'login' ? (
              <LoginPage
                onSwitchToRegister={() => navigateToTab('register')}
                onSuccess={() => navigateToTab('feed')}
              />
            ) : (
              <RegisterPage
                onSwitchToLogin={() => navigateToTab('login')}
                onSuccess={() => navigateToTab('feed')}
              />
            )}
          </div>
        ) : (
          <div className="app-layout">
            {/* Left Sidebar */}
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={navigateToTab}
              onOpenNewPost={() => setIsNewPostModalOpen(true)}
              onOpenProfile={openProfile}
            />

            {/* Center Content Stream */}
            <section style={{ minWidth: 0, width: '100%' }}>
              {currentTab === 'feed' && (
                <FeedPage
                  onOpenProfile={openProfile}
                  onOpenDetail={openPostDetail}
                />
              )}

              {currentTab === 'explore' && (
                <ExplorePage
                  onOpenProfile={openProfile}
                />
              )}

              {currentTab === 'profile' && (
                <ProfilePage
                  username={targetUsername || user?.username}
                  onBack={() => navigateToTab('feed')}
                  onOpenProfile={openProfile}
                  onOpenDetail={openPostDetail}
                  onOpenMessages={openMessages}
                />
              )}

              {currentTab === 'messages' && (
                <MessagesPage
                  targetUser={targetChatUser}
                  onOpenProfile={openProfile}
                />
              )}

              {currentTab === 'post_detail' && (
                <PostDetailPage
                  postId={targetPostId}
                  onBack={() => navigateToTab('feed')}
                  onOpenProfile={openProfile}
                />
              )}
            </section>

            {/* Right Sidebar */}
            {currentTab !== 'messages' && (
              <RightSidebar
                onOpenProfile={openProfile}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Floating Navigation */}
      <MobileNav
        currentTab={currentTab}
        setCurrentTab={navigateToTab}
        onOpenNewPost={() => setIsNewPostModalOpen(true)}
        onOpenProfile={openProfile}
      />

      {/* Quick Post Creation Modal */}
      {isNewPostModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewPostModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Compose Post</h2>
              <button
                onClick={() => setIsNewPostModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <PostComposer
                onPostCreated={() => {
                  setIsNewPostModalOpen(false);
                  navigateToTab('feed');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
