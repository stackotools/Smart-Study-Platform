import React, { useState } from 'react';
import { isValidEmail } from '../../utils/helpers';
import api, { endpoints } from '../../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      toast.success('If an account exists, reset instructions have been sent.');
      setEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container d-flex justify-content-center align-items-center">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <h2 className="text-center">Forgot Password</h2>
        <p className="text-center login-subtitle">We'll send a reset link to your email</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-control-custom"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-custom" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;


