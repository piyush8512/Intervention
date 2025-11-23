import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Validate required env
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env file');
  console.error('Please add it to your .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || null;

// Create HTTP + Socket.io server
const server = createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// --- Socket.io connection handling ---
io.on('connection', (socket) => {
  console.log('✓ Socket connected:', socket.id);

  socket.on('join', (studentId) => {
    if (!studentId) return;
    socket.join(studentId);
    console.log(`✓ Socket ${socket.id} joined room ${studentId}`);
  });

  socket.on('disconnect', () => {
    console.log('✗ Socket disconnected:', socket.id);
  });
});

// Utility functions
function isValidUUID(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

// --- Endpoints ---

// POST /api/daily-checkin
app.post('/api/daily-checkin', async (req, res) => {
  try {
    const { student_id, quiz_score, focus_minutes } = req.body;

    // Basic validation
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    if (!isNumber(quiz_score)) return res.status(400).json({ error: 'quiz_score must be a number' });
    if (!isNumber(focus_minutes)) return res.status(400).json({ error: 'focus_minutes must be a number' });

    // Confirm student exists
    const { rows: students } = await pool.query(
      'SELECT id, name, email, status FROM students WHERE id = $1',
      [student_id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = students[0];

    // Insert daily log
    await pool.query(
      'INSERT INTO daily_logs (student_id, quiz_score, focus_minutes) VALUES ($1, $2, $3)',
      [student_id, quiz_score, focus_minutes]
    );

    // Update last_checkin
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

      // Notify socket
      io.to(student_id).emit('status_update', { status: 'normal' });

      return res.json({
        status: 'On Track',
        message: 'Great job! Keep up the good work.',
        passed: true
      });
    } else {
      // Set student status to needs_intervention
      await pool.query(
        'UPDATE students SET status = $1 WHERE id = $2',
        ['needs_intervention', student_id]
      );

      // Trigger n8n webhook (if configured)
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

      // Notify socket
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
});

// POST /api/assign-intervention
app.post('/api/assign-intervention', async (req, res) => {
  try {
    const { student_id, task_description, assigned_by = 'mentor' } = req.body;

    if (!student_id || !task_description) {
      return res.status(400).json({ error: 'student_id and task_description are required' });
    }

    // Ensure student exists
    const { rows: students } = await pool.query(
      'SELECT id, name, email FROM students WHERE id = $1',
      [student_id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check for existing active intervention
    const { rows: active } = await pool.query(
      'SELECT id, task, assigned_by, assigned_at FROM interventions WHERE student_id = $1 AND completed = false LIMIT 1',
      [student_id]
    );

    if (active.length > 0) {
      console.log(`⚠ Student ${student_id} already has active intervention`);
      
      // Still ensure status is remedial
      await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', student_id]);

      // Emit event
      io.to(student_id).emit('intervention_assigned', {
        intervention: active[0]
      });

      return res.status(200).json({
        success: true,
        message: 'Student already had an active intervention',
        intervention: active[0]
      });
    }

    // Insert new intervention
    const insertRes = await pool.query(
      'INSERT INTO interventions (student_id, task, assigned_by) VALUES ($1, $2, $3) RETURNING id, task, assigned_by, assigned_at',
      [student_id, task_description, assigned_by]
    );

    const intervention = insertRes.rows[0];

    // Update student status to remedial
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', student_id]);

    // Emit socket event for real-time update
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
});

// GET /api/student-status/:id
app.get('/api/student-status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: 'student id required' });

    // Get student row
    const studentRes = await pool.query(
      'SELECT id, name, email, status, last_checkin, created_at, updated_at FROM students WHERE id = $1',
      [id]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentRes.rows[0];

    // Find latest active intervention
    const interventionRes = await pool.query(
      `SELECT id, task, assigned_by, assigned_at, completed, completed_at
       FROM interventions
       WHERE student_id = $1 AND completed = false
       ORDER BY assigned_at DESC
       LIMIT 1`,
      [id]
    );

    const current_task = interventionRes.rows.length ? interventionRes.rows[0].task : null;
    const current_intervention = interventionRes.rows.length ? interventionRes.rows[0] : null;

    return res.json({
      ...student,
      current_task, // For backward compatibility
      current_intervention
    });
  } catch (err) {
    console.error('Error in /api/student-status/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/complete-intervention
app.post('/api/complete-intervention', async (req, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });

    // Complete active interventions
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

    // Update student status to normal
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['normal', student_id]);

    // Emit socket event
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
});

// POST /api/students (create student)
app.post('/api/students', async (req, res) => {
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
});

// GET /api/students (list all students)
app.get('/api/students', async (req, res) => {
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
});

// Fail-safe: auto-assign intervention after 12 hours
async function failSafeCheck() {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const stuckRes = await pool.query(
      `SELECT id, name, email, updated_at
       FROM students
       WHERE status = 'needs_intervention'
       AND updated_at < $1`,
      [twelveHoursAgo]
    );

    for (const s of stuckRes.rows) {
      // Check for existing active intervention
      const { rows: active } = await pool.query(
        'SELECT id FROM interventions WHERE student_id = $1 AND completed = false LIMIT 1',
        [s.id]
      );
      
      if (active.length === 0) {
        const task = 'Review previous material and prepare for catch-up session';
        const insert = await pool.query(
          'INSERT INTO interventions (student_id, task, assigned_by) VALUES ($1, $2, $3) RETURNING id, assigned_at',
          [s.id, task, 'system_failsafe']
        );

        await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', s.id]);

        io.to(s.id).emit('intervention_assigned', {
          intervention: {
            id: insert.rows[0].id,
            task,
            assigned_by: 'system_failsafe',
            assigned_at: insert.rows[0].assigned_at
          }
        });

        console.log(`[FAIL-SAFE] Auto-assigned intervention to student ${s.id}`);
      } else {
        await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', s.id]);
        console.log(`[FAIL-SAFE] Student ${s.id} already has active intervention`);
      }
    }

    if (stuckRes.rows.length > 0) {
      console.log(`[FAIL-SAFE] Processed ${stuckRes.rows.length} stuck students`);
    }
  } catch (err) {
    console.error('[FAIL-SAFE] Error:', err);
  }
}

// Run fail-safe every hour
setInterval(failSafeCheck, 60 * 60 * 1000);
failSafeCheck();

// Health check
app.get('/health', async (req, res) => {
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
});

// Start server
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');
    
    server.listen(PORT, () => {
      console.log('✓ Server running on port', PORT);
      console.log(`✓ Health: http://localhost:${PORT}/health`);
      console.log('✓ WebSocket enabled');
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('Closed connections');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('Closed connections');
    process.exit(0);
  });
});