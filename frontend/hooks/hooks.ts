import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

export const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export function useStudent(studentId: string | undefined) {
  const [student, setStudent] = useState<any>(null);
  const [task, setTask] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  // --- Fetch Student Status ---
  async function loadStatus() {
    if (!studentId) return;
    try {
      const res = await fetch(`${BACKEND}/api/student-status/${studentId}`);
      const json = await res.json();
      setStudent(json);

      if (json.current_task) {
        setTask(json.current_task);
      } else {
        setTask(null);
      }
    } catch (err) {
      console.error("Status error", err);
    }
  }

  // --- Connect Socket ---
  useEffect(() => {
    if (!studentId) return;

    socketRef.current = io(BACKEND, { transports: ["websocket"],forceNew: true, });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join", studentId);
    });

    socketRef.current.on("intervention_assigned", (data) => {
      setStudent((prev: any) => ({ ...prev, status: "remedial" }));
      setTask(data.task);
    });

    socketRef.current.on("status_update", (data) => {
      setStudent((prev: any) => ({ ...prev, status: data.status }));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [studentId]);

  return { student, loadStatus, task };
}

// --- SUBMIT DAILY CHECKIN ---
export async function submitCheckin(payload: any) {
  const res = await fetch(`${BACKEND}/api/daily-checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// --- COMPLETE INTERVENTION ---
export async function completeIntervention(studentId: string) {
  const res = await fetch(`${BACKEND}/api/complete-intervention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId }),
  });
  return res.json();
}
