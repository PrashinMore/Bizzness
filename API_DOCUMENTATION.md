# Authentication API Documentation for React Native

## Base URL
```
http://localhost:4000  (Development)
https://your-api-domain.com  (Production)
```

## Authentication Flow

The API uses **JWT (JSON Web Tokens)** for authentication. After successful login/signup, you'll receive an `accessToken` that must be included in the `Authorization` header for all protected endpoints.

---

## Endpoints

### 1. Sign Up (Create Account)

**Endpoint:** `POST /auth/signup`

**Description:** Creates a new user account. The first user created automatically becomes an admin.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `name`: Required, string
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "6095e6de-2862-4f2c-8f4c-8897807a9ba8",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "createdAt": "2025-11-22T08:00:00.000Z",
    "updatedAt": "2025-11-22T08:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Email already registered

**cURL Example:**
```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticates a user and returns an access token.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "6095e6de-2862-4f2c-8f4c-8897807a9ba8",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "createdAt": "2025-11-22T08:00:00.000Z",
    "updatedAt": "2025-11-22T08:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid credentials

**cURL Example:**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### 3. Get Current User Profile

**Endpoint:** `GET /users/me`

**Description:** Returns the currently authenticated user's profile.

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": "6095e6de-2862-4f2c-8f4c-8897807a9ba8",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "createdAt": "2025-11-22T08:00:00.000Z",
  "updatedAt": "2025-11-22T08:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

**cURL Example:**
```bash
curl -X GET http://localhost:4000/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Reset Password

**Endpoint:** `POST /auth/reset-password`

**Description:** Changes the password for the current user or another user (admin only).

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body (for self):**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Request Body (for admin resetting another user):**
```json
{
  "userId": "6095e6de-2862-4f2c-8f4c-8897807a9ba8",
  "newPassword": "newpassword123"
}
```

**Validation Rules:**
- `currentPassword`: Required when resetting own password
- `newPassword`: Required, minimum 8 characters
- `userId`: Optional, only for admins resetting other users' passwords

**Success Response (200 OK):**
```
(Empty response body)
```

**Error Responses:**
- `400 Bad Request`: Invalid input or user not found
- `401 Unauthorized`: Invalid token or incorrect current password
- `403 Forbidden`: Non-admin trying to reset another user's password

**cURL Example:**
```bash
curl -X POST http://localhost:4000/auth/reset-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }'
```

---

## JWT Token Details

### Token Structure
- **Algorithm:** HS256
- **Expiration:** 1 hour (3600 seconds)
- **Payload:**
  ```json
  {
    "sub": "user-id-uuid",
    "email": "user@example.com",
    "role": "admin" | "staff",
    "iat": 1733801566,
    "exp": 1733805166
  }
  ```

### Using the Token
Include the token in the `Authorization` header for all protected endpoints:
```
Authorization: Bearer <accessToken>
```

### Token Expiration
- Tokens expire after 1 hour
- When a token expires, you'll receive a `401 Unauthorized` response
- The user must log in again to get a new token

---

## User Roles

- **admin**: Full access to all features
- **staff**: Limited access (cannot manage users or certain settings)

---

## React Native Integration Example

### Using Fetch API

```javascript
const API_BASE_URL = 'http://localhost:4000'; // or your production URL

// Login function
async function login(email, password) {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store token securely (use AsyncStorage, SecureStore, or Keychain)
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Signup function
async function signup(name, email, password) {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    
    // Store token securely
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

// Get current user profile
async function getCurrentUser() {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('user');
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to get user');
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

// Reset password
async function resetPassword(currentPassword, newPassword) {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
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

// Logout function
async function logout() {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('user');
}
```

### Using Axios (Alternative)

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:4000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('user');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

// Login
async function login(email, password) {
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

// Signup
async function signup(name, email, password) {
  try {
    const response = await apiClient.post('/auth/signup', {
      name,
      email,
      password,
    });
    
    await AsyncStorage.setItem('accessToken', response.data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Signup failed');
  }
}

// Get current user
async function getCurrentUser() {
  try {
    const response = await apiClient.get('/users/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get user');
  }
}

// Reset password
async function resetPassword(currentPassword, newPassword) {
  try {
    await apiClient.post('/auth/reset-password', {
      currentPassword,
      newPassword,
    });
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Password reset failed');
  }
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

Common HTTP Status Codes:
- `200 OK`: Success
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid credentials or expired token
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Resource already exists (e.g., email already registered)
- `500 Internal Server Error`: Server error

---

## Security Best Practices

1. **Store tokens securely**: Use `@react-native-async-storage/async-storage` for basic storage or `react-native-keychain` for more secure storage
2. **Handle token expiration**: Check for 401 responses and redirect to login
3. **Validate inputs**: Always validate user inputs before sending to API
4. **Use HTTPS**: Always use HTTPS in production
5. **Refresh tokens**: Consider implementing token refresh if your backend supports it

---

## TypeScript Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  createdAt: string;
  updatedAt: string;
}

interface AuthTokenResponse {
  user: User;
  accessToken: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

interface ResetPasswordRequest {
  currentPassword?: string;
  newPassword: string;
  userId?: string;
}
```

---

## Testing with Postman/Insomnia

### Login Request
- **Method:** POST
- **URL:** `http://localhost:4000/auth/login`
- **Headers:**
  - `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```

### Authenticated Request Example
- **Method:** GET
- **URL:** `http://localhost:4000/users/me`
- **Headers:**
  - `Authorization: Bearer <your-token-here>`
  - `Content-Type: application/json`

---

## Notes

- The first user created automatically becomes an admin
- Tokens expire after 1 hour
- All protected endpoints require the `Authorization: Bearer <token>` header
- CORS is enabled, so cross-origin requests are allowed
- Password must be at least 8 characters long

