import express from 'express';
import { protect } from '../middlewares/auth.js';
import pipelineController from '../controllers/pipelineController.js';

const router = express.Router();

// POST /api/pipeline - execute two-step pipeline, returns a single assistant message
router.post('/', protect, pipelineController.runPipeline);

export default router;