import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 
                   error.response?.data?.message || 
                   error.message || 
                   'An error occurred';

    // Handle different error types
    switch (error.response?.status) {
      case 401:
        // Unauthorized - clear token and redirect to login
        Cookies.remove('token');
        Cookies.remove('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
        break;
      case 403:
        toast.error('Access denied. You do not have permission to perform this action.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        if (error.response?.status >= 400) {
          toast.error(message);
        }
    }

    return Promise.reject(error);
  }
);

// Helper function for file uploads
export const createFormData = (data, fileField = 'file') => {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    if (key === fileField && data[key]) {
      formData.append(fileField, data[key]);
    } else if (data[key] !== null && data[key] !== undefined) {
      if (Array.isArray(data[key])) {
        formData.append(key, data[key].join(','));
      } else {
        formData.append(key, data[key]);
      }
    }
  });
  
  return formData;
};

// API endpoints
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    logout: '/auth/logout',
    updateProfile: '/auth/profile',
    changePassword: '/auth/password',
  },
  
  // Notes
  notes: {
    list: '/notes',
    create: '/notes',
    get: (id) => `/notes/${id}`,
    update: (id) => `/notes/${id}`,
    delete: (id) => `/notes/${id}`,
    download: (id) => `/notes/${id}/download`,
    myUploads: '/notes/my-uploads',
    stats: '/notes/stats',
  },
  
  // Reviews
  reviews: {
    list: (noteId) => `/reviews/note/${noteId}`,
    create: '/reviews',
    update: (id) => `/reviews/${id}`,
    delete: (id) => `/reviews/${id}`,
    myReviews: '/reviews/my-reviews',
    vote: (id) => `/reviews/${id}/vote`,
    report: (id) => `/reviews/${id}/report`,
    stats: (noteId) => `/reviews/stats/${noteId}`,
  },
  
  // Download History
  downloadHistory: {
    list: '/download-history',
    stats: '/download-history/stats',
    delete: (id) => `/download-history/${id}`,
  },
  
  // Analytics
  analytics: {
    studentProgress: '/analytics/student-progress',
    teacherAnalytics: '/analytics/teacher-analytics',
    platform: '/analytics/platform',
  },
  
  // System
  health: '/health',
  docs: '/',
};

export default api;
