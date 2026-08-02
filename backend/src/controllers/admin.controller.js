const adminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  res.json({ success: true, data: stats });
});

const getUsers = asyncHandler(async (req, res) => {
  const { items, pagination } = await adminService.listUsers(req.query);
  res.json({ success: true, data: items, pagination });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user = await adminService.getUserDetail(req.params.id);
  res.json({ success: true, data: user });
});

const adjustCredits = asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  const parsedAmount = Number(amount);
  if (!Number.isInteger(parsedAmount)) {
    throw new AppError('amount must be an integer', 400);
  }

  const credits = await adminService.adjustUserCredits(req.params.id, parsedAmount, description);
  res.json({ success: true, data: { credits } });
});

const setActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    throw new AppError('isActive must be a boolean', 400);
  }
  const user = await adminService.setUserActive(req.params.id, isActive);
  res.json({ success: true, data: user });
});

const setRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await adminService.setUserRole(req.params.id, role);
  res.json({ success: true, data: user });
});

const getGenerations = asyncHandler(async (req, res) => {
  const { items, pagination } = await adminService.listGenerations(req.query);
  res.json({ success: true, data: items, pagination });
});

const getPackages = asyncHandler(async (req, res) => {
  const packages = await adminService.listPackages();
  res.json({ success: true, data: packages });
});

const createPackage = asyncHandler(async (req, res) => {
  const pkg = await adminService.createPackage(req.body);
  res.status(201).json({ success: true, data: pkg });
});

const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await adminService.updatePackage(req.params.id, req.body);
  res.json({ success: true, data: pkg });
});

const getAnnouncements = asyncHandler(async (req, res) => {
  const items = await adminService.listAnnouncements();
  res.json({ success: true, data: items });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const item = await adminService.createAnnouncement(req.body.message);
  res.status(201).json({ success: true, data: item });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const item = await adminService.updateAnnouncement(req.params.id, req.body);
  res.json({ success: true, data: item });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  await adminService.deleteAnnouncement(req.params.id);
  res.json({ success: true, data: { id: req.params.id, deleted: true } });
});

module.exports = {
  getStats,
  getUsers,
  getUserDetail,
  adjustCredits,
  setActive,
  setRole,
  getGenerations,
  getPackages,
  createPackage,
  updatePackage,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
