import { useToastStore } from '../store/toastStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getToken = () => sessionStorage.getItem('lifeos_session_token');

// Fired when the server rejects our session token; the auth store listens for it
// and drops back to the lock screen.
export const SESSION_EXPIRED_EVENT = 'lifeos:session-expired';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function fetchApi(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // A 401 from /auth/* just means a wrong password; anywhere else the session is gone
      if (response.status === 401 && token && !endpoint.startsWith('/auth/')) {
        sessionStorage.removeItem('lifeos_session_token');
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        throw new ApiError('Session expired — please unlock LifeOS again.', 401);
      }
      throw new ApiError(data.error || 'API Error', response.status);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      useToastStore.getState().addToast('Could not connect to LifeOS server — make sure the backend is running.', 'error');
    } else {
      useToastStore.getState().addToast(error.message, 'error');
    }
    throw error;
  }
}

export const api = {
  get: (endpoint) => fetchApi(endpoint, { method: 'GET' }),
  post: (endpoint, body) => fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => fetchApi(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => fetchApi(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => fetchApi(endpoint, { method: 'DELETE' }),
};
