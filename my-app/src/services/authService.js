import api, { endpoints } from './api';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

class AuthService {
  // Login user
  async login(credentials) {
    try {
      const response = await api.post(endpoints.auth.login, credentials);
      const { token, user } = response.data;
      
      // Store token and user in cookies
      Cookies.set('token', token, { expires: 7 }); // 7 days
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      
      toast.success(`Welcome back, ${user.name}!`);
      return { token, user };
    } catch (error) {
      throw error;
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await api.post(endpoints.auth.register, userData);
      const { token, user } = response.data;
      
      // Store token and user in cookies
      Cookies.set('token', token, { expires: 7 });
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      
      toast.success(`Registration successful! Welcome, ${user.name}!`);
      return { token, user };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await api.post(endpoints.auth.logout);
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      Cookies.remove('token');
      Cookies.remove('user');
      toast.success('Logged out successfully');
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await api.get(endpoints.auth.me);
      const user = response.data.data;
      
      // Update user in cookies
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      
      return user;
    } catch (error) {
      // If token is invalid, clear auth data
      this.clearAuthData();
      throw error;
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await api.put(endpoints.auth.updateProfile, profileData);
      const user = response.data.data;
      
      // Update user in cookies
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      
      toast.success('Profile updated successfully!');
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(passwordData) {
    try {
      await api.put(endpoints.auth.changePassword, passwordData);
      toast.success('Password changed successfully!');
    } catch (error) {
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = Cookies.get('token');
    return !!token;
  }

  // Get stored user data
  getUser() {
    const userData = Cookies.get('user');
    return userData ? JSON.parse(userData) : null;
  }

  // Get stored token
  getToken() {
    return Cookies.get('token');
  }

  // Clear authentication data
  clearAuthData() {
    Cookies.remove('token');
    Cookies.remove('user');
  }

  // Check user role
  isTeacher() {
    const user = this.getUser();
    return user?.role === 'teacher';
  }

  isStudent() {
    const user = this.getUser();
    return user?.role === 'student';
  }

  // Get user role
  getUserRole() {
    const user = this.getUser();
    return user?.role;
  }
}

export default new AuthService();
