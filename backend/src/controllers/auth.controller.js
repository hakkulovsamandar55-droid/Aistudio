const authService = require('../services/auth.service');
const accountService = require('../services/account.service');
const emailService = require('../services/email.service');
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
  const { email, password, name, referralCode } = req.body;
  assertValidCredentials({ email, password, name });

  const result = await authService.registerUser(
    email.trim().toLowerCase(),
    password,
    name.trim(),
    referralCode
  );
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

const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const result = await authService.loginWithGoogle(idToken);
  res.json({ success: true, data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: result });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new AppError('A valid email is required', 400);
  }

  const { token } = await accountService.requestPasswordReset(email.trim().toLowerCase());

  // The response is intentionally identical whether or not the address exists.
  //
  // The token only ever comes back inline when there is no mail provider to
  // deliver it and we are not in production — otherwise anyone could reset
  // anyone's password straight from this response. With a provider
  // configured, the only way to the token is the user's inbox.
  const payload = { message: 'If that email is registered, a reset link has been sent.' };
  const canRevealToken =
    process.env.NODE_ENV !== 'production' && !emailService.isConfigured();
  if (token && canRevealToken) {
    payload.devResetToken = token;
  }

  res.json({ success: true, data: payload });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await accountService.resetPassword(token, newPassword);
  res.json({ success: true, data: { reset: true } });
});

module.exports = { register, login, googleLogin, refresh, forgotPassword, resetPassword };
