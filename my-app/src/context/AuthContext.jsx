import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = authService.getUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          
          // Optionally refresh user data from server
          try {
            const freshUserData = await authService.getCurrentUser();
            setUser(freshUserData);
          } catch (error) {
            // If refresh fails, user stored data but clear auth if token is invalid
            if (error.response?.status === 401) {
              await logout();
            }
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const { user: userData } = await authService.login(credentials);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const { user: newUser } = await authService.register(userData);
      setUser(newUser);
      setIsAuthenticated(true);
      return newUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await authService.changePassword(passwordData);
    } catch (error) {
      throw error;
    }
  };

  // Role-based helper functions
  const isTeacher = () => user?.role === 'teacher';
  const isStudent = () => user?.role === 'student';
  const getUserRole = () => user?.role;

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    
    switch (permission) {
      case 'upload_notes':
      case 'edit_notes':
      case 'delete_notes':
      case 'manage_uploads':
        return user.role === 'teacher';
      case 'create_reviews':
      case 'edit_reviews':
      case 'delete_reviews':
        return user.role === 'student';
      case 'download_notes':
      case 'view_notes':
        return true; // Both roles can view and download
      default:
        return false;
    }
  };

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    
    // Role helpers
    isTeacher,
    isStudent,
    getUserRole,
    hasPermission,
    
    // Utilities
    refreshUser: initializeAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
