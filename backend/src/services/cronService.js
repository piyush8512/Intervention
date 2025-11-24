import pool from '../config/db.js';
import { getIO } from './socketService.js';

export async function failSafeCheck() {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const stuckRes = await pool.query(
      `SELECT id, name, email, updated_at FROM students WHERE status = 'needs_intervention' AND updated_at < $1`,
      [twelveHoursAgo]
    );

    for (const s of stuckRes.rows) {
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

        const io = getIO();
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