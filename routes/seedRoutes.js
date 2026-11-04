const express = require('express');
const controller = require('../controllers/seedController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.post('/reset', asyncHandler(controller.reset));

module.exports = router;

