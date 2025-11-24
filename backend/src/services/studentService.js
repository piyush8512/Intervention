import pool from '../config/db.js';
import axios from 'axios';
import { config } from '../config/env.js';
import { getIO } from './socketService.js';

export const createStudent = async (name, email) => {
  const insert = await pool.query(
    'INSERT INTO students (name, email) VALUES ($1, $2) RETURNING id, name, email, status, created_at',
    [name, email]
  );
  return insert.rows[0];
};

export const getAllStudents = async () => {
  const result = await pool.query(
    `SELECT s.id, s.name, s.email, s.status, s.created_at, s.last_checkin,
      COUNT(dl.id) as total_checkins,
      COALESCE((SELECT COUNT(*) FROM interventions i WHERE i.student_id = s.id), 0) as total_interventions
     FROM students s
     LEFT JOIN daily_logs dl ON s.id = dl.student_id
     GROUP BY s.id
     ORDER BY s.created_at DESC`
  );
  return result.rows;
};

export const getStudentById = async (id) => {
  const { rows } = await pool.query('SELECT id, name, email, status FROM students WHERE id = $1', [id]);
  return rows[0];
};

export const getFullStudentStatus = async (id) => {
  const studentRes = await pool.query(
    'SELECT id, name, email, status, last_checkin, created_at, updated_at FROM students WHERE id = $1',
    [id]
  );

  if (studentRes.rows.length === 0) return null;
  const student = studentRes.rows[0];

  const interventionRes = await pool.query(
    `SELECT id, task, assigned_by, assigned_at, completed, completed_at
     FROM interventions
     WHERE student_id = $1 AND completed = false
     ORDER BY assigned_at DESC LIMIT 1`,
    [id]
  );

  let current_task = interventionRes.rows.length ? interventionRes.rows[0].task : null;
  const current_intervention = interventionRes.rows.length ? interventionRes.rows[0] : null;

  if (student.status === 'remedial' && !current_task) {
    console.log(`⚠️ Zombie remedial state detected for student ${id}`);
    current_task = "Waiting for mentor to assign specific task...";
  }
  console.log(`📊 Student ${id} - Status: ${student.status}, Task: ${current_task}`);
  
  return { ...student, current_task, current_intervention };
};

export const processDailyCheckin = async (student_id, quiz_score, focus_minutes) => {
  const student = await getStudentById(student_id);
  if (!student) throw new Error('Student not found');

  await pool.query(
    'INSERT INTO daily_logs (student_id, quiz_score, focus_minutes) VALUES ($1, $2, $3)',
    [student_id, quiz_score, focus_minutes]
  );

  await pool.query('UPDATE students SET last_checkin = NOW() WHERE id = $1', [student_id]);

  const passed = (quiz_score > 7 && focus_minutes > 60);
  const io = getIO();

  if (passed) {
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['normal', student_id]);
    io.to(student_id).emit('status_update', { status: 'normal' });
    return { passed: true, message: 'Great job! Keep up the good work.', status: 'On Track' };
  } else {
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['needs_intervention', student_id]);

    if (config.N8N_WEBHOOK_URL) {
      try {
        await axios.post(config.N8N_WEBHOOK_URL, {
          student_id: student.id,
          student_name: student.name,
          student_email: student.email,
          quiz_score,
          focus_minutes,
          timestamp: new Date().toISOString()
        }, { timeout: 5000 });
        console.log(`✓ n8n webhook triggered for student ${student.id}`);
      } catch (err) {
        console.error('✗ n8n webhook error:', err.message);
      }
    } else {
      console.warn('⚠ N8N_WEBHOOK_URL not configured; skipping webhook call.');
    }

    io.to(student_id).emit('status_update', { status: 'needs_intervention' });
    return { passed: false, message: 'Your mentor has been notified and will review your progress.', status: 'Pending Mentor Review' };
  }
};