import express from 'express';
import judgeController from '../controllers/judgeController.js';

const router = express.Router();

/**
 * @route   POST /api/judge
 * @desc    Judge responses to a question using AI
 * @access  Public (no authentication required)
 */
router.post('/', judgeController.judgeResponses);

/**
 * @route   GET /api/judge/health
 * @desc    Get judge service health status
 * @access  Public (no authentication required)
 */
router.get('/health', judgeController.getHealth);

export default router;