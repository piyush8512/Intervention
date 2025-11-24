import express from 'express';
import * as studentController from '../controllers/studentController.js';
import * as interventionController from '../controllers/interventionController.js';

const router = express.Router();

router.post('/daily-checkin', studentController.dailyCheckIn);
router.post('/assign-intervention', interventionController.assignIntervention);
router.get('/student-status/:id', studentController.getStudentStatus);
router.post('/complete-intervention', interventionController.completeIntervention);
router.post('/students', studentController.createStudent);
router.get('/students', studentController.getAllStudents);

export default router;