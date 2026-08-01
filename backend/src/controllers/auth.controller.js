const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertValidCredentials({ email, password, name }) {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new AppError('A valid email is required', 400);
  }
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }
  if (name !== undefined && (!name || !name.trim())) {
    throw new AppError('Name is required', 400);
  }
}

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  assertValidCredentials({ email, password, name });

  const result = await authService.registerUser(email.trim().toLowerCase(), password, name.trim());
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const result = await authService.loginUser(email.trim().toLowerCase(), password);
  res.json({ success: true, data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: result });
});

module.exports = { register, login, refresh };
