import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import axios from 'axios';

// Global Axios Interceptor to attach Authorization header
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Global Axios Interceptor for handling 401s
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401 && !error.config._retry) {
            console.warn('Session expired or unauthorized. Clearing token and reloading...');
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.reload();
            }
        }
        return Promise.reject(error);
    }
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Auto-login utility for development to avoid manual authentication
async function initializeAuth() {
    if (!localStorage.getItem('token')) {
        try {
            console.log('No token found, attempting auto-login for dev environment...');
            let res = await axios.post(`${API_URL}/auth/login`, { email: 'dev@test.com', password: 'password123' }, { validateStatus: () => true });
            
            if (res.status !== 200) {
                // If login fails, try to register the dev account
                res = await axios.post(`${API_URL}/auth/register`, { email: 'dev@test.com', password: 'password123' });
            }

            if (res.data?.token) {
                localStorage.setItem('token', res.data.token);
                console.log('Auto-login successful.');
            }
        } catch (err) {
            console.error('Initialization/Auto-login failed', err);
        }
    }
}

// Ensure auth is initialized before rendering the app
initializeAuth().finally(() => {
    createRoot(document.getElementById('root')).render(
        <App />
    );
});
