const express = require('express');
const controller = require('../controllers/storeController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));

module.exports = router;

