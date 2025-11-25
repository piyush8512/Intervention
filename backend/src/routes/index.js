import express from 'express';
import * as apiController from '../controllers/apiController.js';

const router = express.Router();


router.post('/daily-checkin', apiController.dailyCheckin);
router.post('/assign-intervention', apiController.assignIntervention);
router.get('/student-status/:id', apiController.getStudentStatus);
router.post('/complete-intervention', apiController.completeIntervention);

router.post('/students', apiController.createStudent);
router.get('/students', apiController.listStudents);

export { router, apiController };