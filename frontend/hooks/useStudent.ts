import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Student {
  id: string;
  name: string;
  email: string;
  status: 'normal' | 'needs_intervention' | 'remedial';
  current_task: string | null;
}

export function useStudent(studentId: string | undefined) {
  const [student, setStudent] = useState<Student | null>(null);
  const [task, setTask] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  async function loadStatus() {
    if (!studentId) return;
    try {
      const res = await fetch(`${BACKEND}/api/student-status/${studentId}`);
      const json = await res.json();
      setStudent(json);
      setTask(json.current_task);
    } catch (err) {
      console.error('Status error:', err);
    }
  }

  useEffect(() => {
    if (!studentId) return;

    socketRef.current = io(BACKEND, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join', studentId);
      console.log('Socket connected');
    });

    socketRef.current.on('intervention_assigned', (data: any) => {
      setStudent(prev => prev ? { ...prev, status: 'remedial' } : null);
      setTask(data.intervention.task);
    });

    socketRef.current.on('status_update', (data: any) => {
      setStudent(prev => prev ? { ...prev, status: data.status } : null);
    });

    socketRef.current.on('intervention_completed', () => {
      setStudent(prev => prev ? { ...prev, status: 'normal' } : null);
      setTask(null);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [studentId]);

  return { student, loadStatus, task };
}

export async function submitCheckin(payload: any) {
  const res = await fetch(`${BACKEND}/api/daily-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function completeIntervention(studentId: string) {
  const res = await fetch(`${BACKEND}/api/complete-intervention`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId }),
  });
  return res.json();
}