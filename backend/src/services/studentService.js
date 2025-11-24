import * as db from '../config/db.js';
import axios from 'axios';
import { config } from '../config/env.js';
import { getIO } from './socketService.js';

export const findStudentById = async (id) => {
  const { rows } = await db.query('SELECT * FROM students WHERE id = $1', [id]);
  return rows[0];
};

export const processDailyCheckin = async (studentId, quizScore, focusMinutes) => {
  const student = await findStudentById(studentId);
  if (!student) throw new Error('Student not found');

  // Log entry
  await db.query(
    'INSERT INTO daily_logs (student_id, quiz_score, focus_minutes) VALUES ($1, $2, $3)',
    [studentId, quizScore, focusMinutes]
  );

  // Update last checkin
  await db.query('UPDATE students SET last_checkin = NOW() WHERE id = $1', [studentId]);

  const passed = (quizScore > 7 && focusMinutes > 60);
  const newStatus = passed ? 'normal' : 'needs_intervention';

  // Update Status
  await db.query('UPDATE students SET status = $1 WHERE id = $2', [newStatus, studentId]);
  
  // Emit Socket Event
  getIO().to(studentId).emit('status_update', { status: newStatus });

  // Handle External Webhook (Business Logic)
  if (!passed && config.n8nWebhookUrl) {
    triggerWebhook(student, quizScore, focusMinutes);
  }

  return { passed, status: newStatus };
};

const triggerWebhook = async (student, score, minutes) => {
  try {
    await axios.post(config.n8nWebhookUrl, {
      student_id: student.id,
      student_name: student.name,
      student_email: student.email,
      quiz_score: score,
      focus_minutes: minutes,
      timestamp: new Date().toISOString()
    }, { timeout: 5000 });
    console.log(`✓ n8n webhook triggered for student ${student.id}`);
  } catch (err) {
    console.error('✗ n8n webhook error:', err.message);
  }
};