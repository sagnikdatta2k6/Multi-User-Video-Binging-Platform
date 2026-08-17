import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:3001/api',
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
