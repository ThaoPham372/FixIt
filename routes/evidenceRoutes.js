const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/orderController');
const router = express.Router();
router.get('/:id/file', asyncHandler(controller.streamEvidence));
module.exports = router;
