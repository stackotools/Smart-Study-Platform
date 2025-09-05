import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isValidEmail, isStrongPassword } from '../../utils/helpers';
import "../../index.css"

const RegisterForm = ({ onSwitchToLogin }) => {
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    grade: '',
    interests: '',
    subject: '',
    qualification: '',
    experience: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isStrongPassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (formData.role === 'student') {
      if (!formData.grade.trim()) {
        newErrors.grade = 'Grade is required for students';
      }
    } else if (formData.role === 'teacher') {
      if (!formData.subject.trim()) newErrors.subject = 'Subject is required for teachers';
      if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required for teachers';
      if (formData.experience === '' || isNaN(formData.experience)) newErrors.experience = 'Experience (years) is required for teachers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      };

      if (formData.role === 'student') {
        payload.grade = formData.grade.trim();
        if (formData.interests?.trim()) {
          payload.interests = formData.interests.split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (formData.role === 'teacher') {
        payload.subject = formData.subject.trim();
        payload.qualification = formData.qualification.trim();
        payload.experience = parseInt(formData.experience, 10) || 0;
      }

      await register(payload);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          name="name"
          type="text"
          className={`form-control ${errors.name ? 'has-error' : ''}`}
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
        />
        {errors.name && <p className="error-text">{errors.name}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          className={`form-control ${errors.email ? 'has-error' : ''}`}
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
        />
        {errors.email && <p className="error-text">{errors.email}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="role">Role</label>
        <select
          id="role"
          name="role"
          className={`form-control ${errors.role ? 'has-error' : ''}`}
          value={formData.role}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="">Select your role</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {errors.role && <p className="error-text">{errors.role}</p>}
      </div>

      {formData.role === 'student' && (
        <>
          <div className="form-group">
            <label htmlFor="grade">Grade</label>
            <input
              id="grade"
              name="grade"
              type="text"
              className={`form-control ${errors.grade ? 'has-error' : ''}`}
              placeholder="e.g. 10th, 12th"
              value={formData.grade}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.grade && <p className="error-text">{errors.grade}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="interests">Interests (comma separated)</label>
            <input
              id="interests"
              name="interests"
              type="text"
              className="form-control"
              placeholder="e.g. Math, Science"
              value={formData.interests}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </>
      )}

      {formData.role === 'teacher' && (
        <>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              name="subject"
              type="text"
              className={`form-control ${errors.subject ? 'has-error' : ''}`}
              value={formData.subject}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.subject && <p className="error-text">{errors.subject}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="qualification">Qualification</label>
            <input
              id="qualification"
              name="qualification"
              type="text"
              className={`form-control ${errors.qualification ? 'has-error' : ''}`}
              value={formData.qualification}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.qualification && <p className="error-text">{errors.qualification}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="experience">Experience (in years)</label>
            <input
              id="experience"
              name="experience"
              type="number"
              className={`form-control ${errors.experience ? 'has-error' : ''}`}
              value={formData.experience}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.experience && <p className="error-text">{errors.experience}</p>}
          </div>
        </>
      )}

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <div className="password-wrapper">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className={`form-control ${errors.password ? 'has-error' : ''}`}
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && <p className="error-text">{errors.password}</p>}
        <p className="hint-text">
          Must include uppercase, lowercase, number, and special character
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className={`form-control ${errors.confirmPassword ? 'has-error' : ''}`}
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={loading}
        />
        {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
      </div>

      <div className="form-group">
        <button
          type="submit"
          className="btn-submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </div>

      <div className="form-footer">
        <button type="button" onClick={onSwitchToLogin} className="link-button" disabled={loading}>
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
