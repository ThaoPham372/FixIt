const express = require('express');
const controller = require('../controllers/simulatorController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/claims', asyncHandler(controller.getSimulatorClaims));
router.post('/resolve', asyncHandler(controller.resolveClaim));
router.get('/wallet', asyncHandler(controller.getWallet));

module.exports = router;

