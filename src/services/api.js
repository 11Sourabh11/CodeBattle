const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

// Authentication API calls
export const authAPI = {
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(response);
  },

  verifyToken: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Rooms API calls
export const roomsAPI = {
  getPublicRooms: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/rooms?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getRoomById: async (roomId) => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createRoom: async (roomData) => {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(roomData)
    });
    return handleResponse(response);
  },

  joinRoom: async (roomId, password = '') => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
    });
    return handleResponse(response);
  },

  leaveRoom: async (roomId) => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Problems API calls
export const problemsAPI = {
  getProblems: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/problems?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getProblemBySlug: async (slug) => {
    const response = await fetch(`${API_BASE_URL}/problems/${slug}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getRandomProblem: async (difficulty) => {
    const response = await fetch(`${API_BASE_URL}/problems/random/${difficulty}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Battles API calls
export const battlesAPI = {
  getMatches: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/battles?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getMyHistory: async (page = 1, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/battles/me/history?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  testCode: async (codeData) => {
    const response = await fetch(`${API_BASE_URL}/battles/test-code`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(codeData)
    });
    return handleResponse(response);
  },

  getActiveBattles: async () => {
    const response = await fetch(`${API_BASE_URL}/battles/active/list`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Leaderboard API calls
export const leaderboardAPI = {
  getGlobalLeaderboard: async (page = 1, limit = 50, timeframe = 'all') => {
    const response = await fetch(`${API_BASE_URL}/leaderboard?page=${page}&limit=${limit}&timeframe=${timeframe}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getUserPosition: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/leaderboard/position/${userId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Users API calls
export const usersAPI = {
  getUserStats: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  searchUsers: async (query) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export default {
  auth: authAPI,
  rooms: roomsAPI,
  problems: problemsAPI,
  battles: battlesAPI,
  leaderboard: leaderboardAPI,
  users: usersAPI
};