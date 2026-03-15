import axios from 'axios';

const PROD_API_FALLBACK = 'https://hospital-management-api-avaechaue2fdghdk.southeastasia-01.azurewebsites.net';
const DEV_API_FALLBACK = 'http://localhost:5041';
const baseURL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? PROD_API_FALLBACK : DEV_API_FALLBACK);

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
