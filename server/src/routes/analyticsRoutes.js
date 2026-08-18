import express from 'express';
import { getStudentAnalytics, getSessionDetails, getHostHistory } from '../controllers/analyticsController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected routes for authenticated users
router.use(verifyToken);

router.get('/student', getStudentAnalytics);
router.get('/session/:sessionId', getSessionDetails);
router.get('/host-history', getHostHistory);

export default router;

