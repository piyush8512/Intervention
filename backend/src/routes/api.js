import express from 'express';
import * as studentController from '../controllers/studentController.js';
// Import other controllers...

const router = express.Router();

// Student Routes
router.post('/daily-checkin', studentController.dailyCheckIn);
router.get('/student-status/:id', studentController.getStudentStatus);

// Intervention Routes (Placeholders for the refactoring)
// router.post('/assign-intervention', interventionController.assignIntervention);

export default router;