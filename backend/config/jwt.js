const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate token response with user data
const generateTokenResponse = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    success: true,
    token,
    user: user.getPublicData(),
    expiresIn: process.env.JWT_EXPIRE || '7d'
  };
};

module.exports = {
  generateToken,
  verifyToken,
  generateTokenResponse,
};
