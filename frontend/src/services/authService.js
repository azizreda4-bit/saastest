// Mock authentication service for testing
const API_BASE_URL = 'http://localhost:3000/api/v1';

class AuthService {
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      
      // In a real app, you might call a logout endpoint
      // await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      const tenant = localStorage.getItem('tenant');

      if (!token || !user) {
        return null;
      }

      return {
        user: JSON.parse(user),
        tenant: JSON.parse(tenant),
        token
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async refreshToken() {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No token available');
      }

      // In a real app, you would call a refresh endpoint
      // For now, just return the existing token
      return { token };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  getUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  }

  getTenant() {
    try {
      const tenant = localStorage.getItem('tenant');
      return tenant ? JSON.parse(tenant) : null;
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService();