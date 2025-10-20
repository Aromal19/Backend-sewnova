const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, webhook } = require('../controllers/paymentController');
const getRazorpay = require('../config/razorpay');

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/webhook', express.json({ type: '*/*' }), webhook);

// Diagnostics: verify env keys are loaded
router.get('/config-check', (req, res) => {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  res.json({
    ok: Boolean(id && secret),
    keyIdPresent: Boolean(id),
    keySecretPresent: Boolean(secret),
    port: process.env.PORT || 3010,
    frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  });
});

// Active Razorpay API self-test (does a tiny order attempt and returns SDK error if any)
router.get('/self-test', async (req, res) => {
  try {
    const razorpay = getRazorpay();
    const testOrder = await razorpay.orders.create({ amount: 100, currency: 'INR', receipt: `selftest_${Date.now()}` });
    return res.json({ ok: true, testOrderId: testOrder.id });
  } catch (err) {
    const message = err?.error?.description || err?.message || 'Unknown error';
    return res.status(500).json({ ok: false, message });
  }
});

module.exports = router;


