import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { isValidEmail } from "../../utils/helpers";
import "../../index.css"; // custom styles
import { Link, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

const LoginForm = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const user = await login({ email: formData.email, password: formData.password });
      
      // Redirect based on user role
      if (user.role === 'teacher') {
        navigate('/dashboard');
        toast.success(`Welcome back, ${user.name}! Redirecting to Teacher Dashboard...`);
      } else if (user.role === 'student') {
        navigate('/dashboard');
        toast.success(`Welcome back, ${user.name}! Redirecting to Student Dashboard...`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="login-container d-flex justify-content-center align-items-center">
      <div className="login-card">
        <h2 className="text-center">Login</h2>
        <p className="text-center login-subtitle">Welcome to Smart Study Platform</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-control-custom ${errors.email ? "is-invalid" : ""}`}
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.email && <div className="error-text">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-control-custom ${errors.password ? "is-invalid" : ""}`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.password && <div className="error-text">{errors.password}</div>}
            <div className="text-end mt-2">
              <Link to="/forgot-password" className="link-button">Forgot password?</Link>
            </div>
          </div>

          <button type="submit" className="btn-custom" disabled={loading}>
            {loading ? (
              <div className="spinner-container">
                <div className="spinner" />
                Logging in...
              </div>
            ) : (
              "Login"
            )}
          </button>

          <div className="text-center mt-3">
            <Link to="/register" className="link-button">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
