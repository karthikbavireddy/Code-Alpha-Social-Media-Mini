/**
 * ConnectSphere API Client
 * Centralized HTTP communications with Django REST Framework backend.
 */

const TOKEN_KEY = 'connectsphere_token';
const USER_KEY = 'connectsphere_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },
  getUser: () => {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

async function request(endpoint, options = {}) {
  const token = authStorage.getToken();
  const csrfToken = getCookie('csrftoken');
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  // If body is not FormData and not already specified, set JSON header
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // send session cookie if available
  };

  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, config);

  // Handle No Content
  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || (data?.errors ? Object.values(data.errors).flat().join(' ') : 'Something went wrong');
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (endpoint, body) => request(endpoint, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  // Auth
  login: (credentials) => api.post('/login/', credentials),
  register: (userData) => api.post('/register/', userData),
  logout: () => api.post('/logout/', {}),
  getMe: () => api.get('/me/'),

  // Profiles
  getUserProfile: (username) => api.get(`/users/${encodeURIComponent(username)}/`),
  updateProfile: (formData) => api.put('/profile/', formData),

  // Posts
  getFeed: () => api.get('/feed/'),
  getPost: (id) => api.get(`/posts/${id}/`),
  createPost: (formData) => api.post('/posts/create/', formData),
  updatePost: (id, data) => api.put(`/posts/${id}/update/`, data),
  deletePost: (id) => api.delete(`/posts/${id}/delete/`),

  // Interactions
  toggleLike: (id) => api.post(`/posts/${id}/like/`, {}),
  getComments: (id) => api.get(`/posts/${id}/comments/`),
  createComment: (id, text) => api.post(`/posts/${id}/comments/`, { text }),
  toggleFollow: (username) => api.post(`/users/${encodeURIComponent(username)}/follow/`, {}),
  getUserFollowers: (username) => api.get(`/users/${encodeURIComponent(username)}/followers/`),
  getUserFollowing: (username) => api.get(`/users/${encodeURIComponent(username)}/following/`),

  // Search
  searchUsers: (query) => api.get(`/search/?q=${encodeURIComponent(query || '')}`),

  // Direct Messaging
  getConversations: () => api.get('/conversations/'),
  getMessageContacts: () => api.get('/messages/contacts/'),
  getMessages: (username) => api.get(`/messages/${encodeURIComponent(username)}/`),
  sendMessage: (username, content) => api.post(`/messages/${encodeURIComponent(username)}/send/`, { content }),
  getUnreadCount: () => api.get('/messages/unread-count/'),
};
