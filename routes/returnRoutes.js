const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/orderController');
const router = express.Router();
router.post('/scan', asyncHandler(controller.scanReturn));
module.exports = router;
