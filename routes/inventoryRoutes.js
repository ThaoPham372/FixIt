const express = require('express');
const controller = require('../controllers/inventoryController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.get('/', asyncHandler(controller.getStats));

module.exports = router;

