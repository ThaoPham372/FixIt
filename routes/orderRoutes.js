const express = require('express');
const controller = require('../controllers/orderController');
const asyncHandler = require('../middleware/asyncHandler');
const { upload } = require('../services/mediaStorage');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:code', asyncHandler(controller.getOne));
router.patch('/:code/status', asyncHandler(controller.updateStatus));
router.get('/:code/evidence', asyncHandler(controller.listEvidence));
router.post('/:code/analyze', asyncHandler(controller.analyzeReturn));
router.post('/:code/dismiss-return', asyncHandler(controller.dismissReturn));
router.post('/:code/evidence', upload.single('file'), asyncHandler(controller.uploadEvidence));
router.post('/:code/claims', asyncHandler(controller.createClaim));

module.exports = router;
