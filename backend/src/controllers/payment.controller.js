const paymentService = require('../services/payment.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const getPackages = asyncHandler(async (req, res) => {
  const packages = await paymentService.getActivePackages();
  res.json({ success: true, data: packages });
});

const createCheckout = asyncHandler(async (req, res) => {
  const { packageId } = req.body;
  if (!packageId) {
    throw new AppError('packageId is required', 400);
  }

  const { checkoutUrl } = await paymentService.createCheckoutSession(req.user.id, packageId);
  res.json({ success: true, data: { checkoutUrl } });
});

module.exports = { getPackages, createCheckout };
