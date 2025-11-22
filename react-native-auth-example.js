/**
 * React Native Authentication Example
 * 
 * This file contains example functions for integrating with the Bizzness API
 * 
 * Installation required:
 * npm install @react-native-async-storage/async-storage
 * 
 * For Axios (optional):
 * npm install axios
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:4000'  // Development
  : 'https://your-api-domain.com';  // Production

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, accessToken: string}>}
 */
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token and user data
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Sign up new user
 * @param {string} name - User full name
 * @param {string} email - User email
 * @param {string} password - User password (min 8 characters)
 * @returns {Promise<{user: Object, accessToken: string}>}
 */
export async function signup(name, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    // Store token and user data
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object>} User object
 */
export async function getCurrentUser() {
  try {
    const token = await AsyncStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No token found. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        await logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(data.message || 'Failed to get user');
    }

    // Update stored user data
    await AsyncStorage.setItem('user', JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

/**
 * Reset password
 * @param {string} currentPassword - Current password (required for self)
 * @param {string} newPassword - New password (min 8 characters)
 * @param {string} userId - Optional: User ID (admin only)
 * @returns {Promise<boolean>}
 */
export async function resetPassword(currentPassword, newPassword, userId = null) {
  try {
    const token = await AsyncStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No token found. Please login.');
    }

    const body = { newPassword };
    if (currentPassword) {
      body.currentPassword = currentPassword;
    }
    if (userId) {
      body.userId = userId;
    }

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset failed');
    }

    return true;
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}

/**
 * Logout user
 * Clears stored token and user data
 */
export async function logout() {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('user');
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const token = await AsyncStorage.getItem('accessToken');
  return !!token;
}

/**
 * Get stored token
 * @returns {Promise<string|null>}
 */
export async function getToken() {
  return await AsyncStorage.getItem('accessToken');
}

/**
 * Get stored user
 * @returns {Promise<Object|null>}
 */
export async function getStoredUser() {
  const userString = await AsyncStorage.getItem('user');
  return userString ? JSON.parse(userString) : null;
}

// ============================================
// API CLIENT HELPER
// ============================================

/**
 * Make authenticated API request
 * Automatically adds Authorization header
 * 
 * @param {string} endpoint - API endpoint (e.g., '/products')
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('accessToken');

  if (!token) {
    throw new Error('No token found. Please login.');
  }

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle token expiration
  if (response.status === 401) {
    await logout();
    throw new Error('Session expired. Please login again.');
  }

  return response;
}

// ============================================
// USAGE EXAMPLE IN COMPONENT
// ============================================

/*
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { login, signup, getCurrentUser, logout } from './auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const data = await login(email, password);
      Alert.alert('Success', `Welcome ${data.user.name}!`);
      // Navigate to home screen
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
*/

// ============================================
// AXIOS ALTERNATIVE (if you prefer Axios)
// ============================================

/*
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expiration)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('user');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

// Login with Axios
export async function loginAxios(email, password) {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    
    await AsyncStorage.setItem('accessToken', response.data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
}
*/

