import pool from '../config/db.js';
import { getIO } from './socketService.js';

export const assignIntervention = async (student_id, task_description, assigned_by) => {
  const { rows: students } = await pool.query('SELECT id FROM students WHERE id = $1', [student_id]);
  if (students.length === 0) throw new Error('Student not found');

  const { rows: active } = await pool.query(
    'SELECT id, task, assigned_by, assigned_at FROM interventions WHERE student_id = $1 AND completed = false LIMIT 1',
    [student_id]
  );

  const io = getIO();

  if (active.length > 0) {
    console.log(`⚠ Student ${student_id} already has active intervention`);
    await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', student_id]);
    
    io.to(student_id).emit('intervention_assigned', { intervention: active[0] });

    return { 
      status: 200, 
      data: { success: true, message: 'Student already had an active intervention', intervention: active[0] } 
    };
  }

  const insertRes = await pool.query(
    'INSERT INTO interventions (student_id, task, assigned_by) VALUES ($1, $2, $3) RETURNING id, task, assigned_by, assigned_at',
    [student_id, task_description, assigned_by]
  );
  const intervention = insertRes.rows[0];

  await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['remedial', student_id]);

  io.to(student_id).emit('intervention_assigned', { intervention });
  console.log(`✓ Intervention assigned to student ${student_id}`);

  return { 
    status: 201, 
    data: { success: true, message: 'Intervention assigned successfully', intervention } 
  };
};

export const completeIntervention = async (student_id) => {
  const completeRes = await pool.query(
    `UPDATE interventions
     SET completed = true, completed_at = NOW()
     WHERE student_id = $1 AND completed = false
     RETURNING id, task, assigned_by, completed_at`,
    [student_id]
  );

  if (completeRes.rows.length === 0) throw new Error('No active intervention found for this student');

  await pool.query('UPDATE students SET status = $1 WHERE id = $2', ['normal', student_id]);

  const io = getIO();
  io.to(student_id).emit('intervention_completed', { interventions: completeRes.rows });

  console.log(`✓ Intervention completed for student ${student_id}`);
  return completeRes.rows;
};