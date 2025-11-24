import * as interventionService from '../services/interventionService.js';

export const assignIntervention = async (req, res) => {
  try {
    const { student_id, task_description, assigned_by = 'mentor' } = req.body;
    if (!student_id || !task_description) return res.status(400).json({ error: 'student_id and task_description are required' });

    try {
      const result = await interventionService.assignIntervention(student_id, task_description, assigned_by);
      return res.status(result.status).json(result.data);
    } catch (err) {
      if (err.message === 'Student not found') return res.status(404).json({ error: 'Student not found' });
      throw err;
    }
  } catch (err) {
    console.error('Error in /api/assign-intervention:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const completeIntervention = async (req, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });

    try {
      const completed = await interventionService.completeIntervention(student_id);
      return res.json({ success: true, message: 'Intervention completed successfully', completed });
    } catch (err) {
      if (err.message === 'No active intervention found for this student') {
        return res.status(400).json({ error: 'No active intervention found for this student' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Error in /api/complete-intervention:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};