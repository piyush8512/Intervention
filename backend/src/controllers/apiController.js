import axios from 'axios';
import { pool } from '../config/db.js';
import { getIO } from '../services/socketService.js';
import { isNumber } from '../utils/helpers.js';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || null;


export const dailyCheckin = async (req, res) => {
  try {
    const { student_id, quiz_score, focus_minutes } = req.body;
    const io = getIO();

    
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    if (!isNumber(quiz_score)) return res.status(400).json({ error: 'quiz_score must be a number' });
    if (!isNumber(focus_minutes)) return res.status(400).json({ error: 'focus_minutes must be a number' });

    
    const { rows: students } = await pool.query(
      'SELECT id, name, email, status FROM students WHERE id = $1',
      [student_id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = students[0];

    
    await pool.query(
      'INSERT INTO daily_logs (student_id, quiz_score, focus_minutes) VALUES ($1, $2, $3)',
      [student_id, quiz_score, focus_minutes]
    );

    
    await pool.query(
      'UPDATE students SET last_checkin = NOW() WHERE id = $1',
      [student_id]
    );

    const passed = (quiz_score > 7 && focus_minutes > 60);

    if (passed) {
      await pool.query(
        'UPDATE students SET status = $1 WHERE id = $2',
        ['normal', student_id]
      );

      
      io.to(student_id).emit('status_update', { status: 'normal' });

      return res.json({
        status: 'On Track',
        message: 'Great job! Keep up the good work.',
        passed: true
      });
    } else {
      
      await pool.query(
        'UPDATE students SET status = $1 WHERE id = $2',
        ['needs_intervention', student_id]
      );

      
      if (N8N_WEBHOOK_URL) {
        try {
          await axios.post(N8N_WEBHOOK_URL, {
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

      return res.json({
        status: 'Pending Mentor Review',
        message: 'Your mentor has been notified and will review your progress.',
        passed: false
      });
    }
  } catch (err) {
    console.error('Error in /api/daily-checkin:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const assignIntervention = async (req, res) => {
  try {
    const { student_id, task_description, assigned_by = 'mentor' } = req.body;
    const io = getIO();

    if (!student_id || !task_description) {
      return res.status(400).json({ error: 'student_id and task_description are required' });
    }

    
    const { rows: students } = await pool.query(
      'SELECT id, name, email FROM students WHERE id = $1',
      [student_id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    
    const { rows: active } = await pool.query(
      'SELECT id, task, assigned_by, assigned_at FROM interventions WHERE student_id = $1 AND completed = false LIMIT 1',
      [student_id]
    );

    if (active.length > 0) {
      console.log(`⚠ Student ${student_id} already has active intervention`);
      
      
      await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', student_id]);

      
      io.to(student_id).emit('intervention_assigned', {
        intervention: active[0]
      });

      return res.status(200).json({
        success: true,
        message: 'Student already had an active intervention',
        intervention: active[0]
      });
    }

    
    const insertRes = await pool.query(
      'INSERT INTO interventions (student_id, task, assigned_by) VALUES ($1, $2, $3) RETURNING id, task, assigned_by, assigned_at',
      [student_id, task_description, assigned_by]
    );

    const intervention = insertRes.rows[0];

    
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', student_id]);

    
    io.to(student_id).emit('intervention_assigned', { intervention });

    console.log(`✓ Intervention assigned to student ${student_id}`);

    return res.status(201).json({
      success: true,
      message: 'Intervention assigned successfully',
      intervention
    });
  } catch (err) {
    console.error('Error in /api/assign-intervention:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const getStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: 'student id required' });

    
    const studentRes = await pool.query(
      'SELECT id, name, email, status, last_checkin, created_at, updated_at FROM students WHERE id = $1',
      [id]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentRes.rows[0];

    
    const interventionRes = await pool.query(
      `SELECT id, task, assigned_by, assigned_at, completed, completed_at
       FROM interventions
       WHERE student_id = $1 AND completed = false
       ORDER BY assigned_at DESC
       LIMIT 1`,
      [id]
    );

    let current_task = interventionRes.rows.length ? interventionRes.rows[0].task : null;
    const current_intervention = interventionRes.rows.length ? interventionRes.rows[0] : null;

    
    if (student.status === 'remedial' && !current_task) {
      console.log(`⚠️ Zombie remedial state detected for student ${id}`);
      current_task = "Waiting for mentor to assign specific task...";
    }

    console.log(`📊 Student ${id} - Status: ${student.status}, Task: ${current_task}`);

    return res.json({
      ...student,
      current_task, 
      current_intervention
    });
  } catch (err) {
    console.error('Error in /api/student-status/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const completeIntervention = async (req, res) => {
  try {
    const { student_id } = req.body;
    const io = getIO();
    
    if (!student_id) return res.status(400).json({ error: 'student_id required' });

    
    const completeRes = await pool.query(
      `UPDATE interventions
       SET completed = true, completed_at = NOW()
       WHERE student_id = $1 AND completed = false
       RETURNING id, task, assigned_by, completed_at`,
      [student_id]
    );

    if (completeRes.rows.length === 0) {
      return res.status(400).json({ error: 'No active intervention found for this student' });
    }

    
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['normal', student_id]);

    
    io.to(student_id).emit('intervention_completed', { 
      interventions: completeRes.rows 
    });

    console.log(`✓ Intervention completed for student ${student_id}`);

    return res.json({
      success: true,
      message: 'Intervention completed successfully',
      completed: completeRes.rows
    });
  } catch (err) {
    console.error('Error in /api/complete-intervention:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const createStudent = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' });
    }

    const insert = await pool.query(
      'INSERT INTO students (name, email) VALUES ($1, $2) RETURNING id, name, email, status, created_at',
      [name, email]
    );

    console.log(`✓ Created student: ${insert.rows[0].id}`);

    return res.status(201).json(insert.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error in /api/students:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const listStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.email, s.status, s.created_at, s.last_checkin,
        COUNT(dl.id) as total_checkins,
        COALESCE((SELECT COUNT(*) FROM interventions i WHERE i.student_id = s.id), 0) as total_interventions
       FROM students s
       LEFT JOIN daily_logs dl ON s.id = dl.student_id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Error in GET /api/students:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const healthCheck = async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket: 'active'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
};