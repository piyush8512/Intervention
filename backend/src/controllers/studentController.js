import * as studentService from '../services/studentService.js';

function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

export const dailyCheckIn = async (req, res) => {
  try {
    const { student_id, quiz_score, focus_minutes } = req.body;

    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    if (!isNumber(quiz_score)) return res.status(400).json({ error: 'quiz_score must be a number' });
    if (!isNumber(focus_minutes)) return res.status(400).json({ error: 'focus_minutes must be a number' });

    try {
      const result = await studentService.processDailyCheckin(student_id, quiz_score, focus_minutes);
      return res.json(result);
    } catch (err) {
      if (err.message === 'Student not found') return res.status(404).json({ error: 'Student not found' });
      throw err;
    }
  } catch (err) {
    console.error('Error in /api/daily-checkin:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'student id required' });

    const status = await studentService.getFullStudentStatus(id);
    if (!status) return res.status(404).json({ error: 'Student not found' });

    return res.json(status);
  } catch (err) {
    console.error('Error in /api/student-status/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStudent = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });

    const student = await studentService.createStudent(name, email);
    console.log(`✓ Created student: ${student.id}`);
    return res.status(201).json(student);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('Error in /api/students:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const students = await studentService.getAllStudents();
    return res.json(students);
  } catch (err) {
    console.error('Error in GET /api/students:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};