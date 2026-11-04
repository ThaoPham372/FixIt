const express = require('express');
const controller = require('../controllers/reportController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.get('/', asyncHandler(controller.getReports));

module.exports = router;

