import { useToastStore } from '../store/toastStore';

const BASE_URL = 'http://localhost:3000/api';

const getToken = () => sessionStorage.getItem('lifeos_session_token');

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

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        sessionStorage.removeItem('lifeos_session_token');
        if (window.location.pathname !== '/') {
          window.location.reload();
        }
      }
      throw new Error(data.error || 'API Error');
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
