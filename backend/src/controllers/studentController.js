import * as studentService from '../services/studentService.js';

const isNumber = (val) => typeof val === 'number' && !Number.isNaN(val);

export const dailyCheckIn = async (req, res) => {
  try {
    const { student_id, quiz_score, focus_minutes } = req.body;

    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    if (!isNumber(quiz_score) || !isNumber(focus_minutes)) {
      return res.status(400).json({ error: 'Scores must be numbers' });
    }

    try {
      const result = await studentService.processDailyCheckin(student_id, quiz_score, focus_minutes);
      
      if (result.passed) {
        return res.json({ status: 'On Track', message: 'Great job!', passed: true });
      } else {
        return res.json({ status: 'Pending Mentor Review', message: 'Mentor notified.', passed: false });
      }
    } catch (err) {
        if(err.message === 'Student not found') return res.status(404).json({ error: err.message });
        throw err;
    }

  } catch (err) {
    console.error('Error in dailyCheckIn:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentStatus = async (req, res) => {
    // ... Logic extracted from original app.get('/api/student-status/:id')
    // You would call a service method here similar to above
    return res.json({ message: "Status endpoint placeholder"}); 
};