import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";

export const BACKEND =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

interface Student {
  id: string;
  name: string;
  email: string;
  status: "normal" | "needs_intervention" | "remedial";
  current_task: string | null;
}

export function useStudent(studentId?: string) {
  const [student, setStudent] = useState<Student | null>(null);
  const [task, setTask] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // --------------------------------------------
  // 1. Load status via REST
  // --------------------------------------------
  const loadStatus = useCallback(async () => {
    if (!studentId) return;

    try {
      const res = await fetch(`${BACKEND}/api/student-status/${studentId}`);
      const json = await res.json();

      console.log("📥 REST API Status:", json);

      setStudent(json);

      if (json.current_task) setTask(json.current_task);
      else setTask(null);
    } catch (err) {
      console.error("❌ loadStatus() error:", err);
    }
  }, [studentId]);

  // --------------------------------------------
  // 2. WebSocket connection
  // --------------------------------------------
  useEffect(() => {
    if (!studentId) return;

    // Load initial status
    loadStatus();

    const socket = io(BACKEND, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 20,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);

      setTimeout(() => {
        console.log("📡 Joining room:", studentId);
        socket.emit("join", studentId);
      }, 200);
    });

    socket.on("intervention_assigned", (data: any) => {
      console.log("⚡ intervention_assigned:", data);

      setStudent((prev) =>
        prev ? { ...prev, status: "remedial" } : prev
      );

      setTask(data?.intervention?.task ?? null);

      loadStatus();
    });

    socket.on("status_update", (data: any) => {
      console.log("⚡ status_update:", data);

      setStudent((prev) =>
        prev ? { ...prev, status: data.status } : prev
      );

      if (data.status === "normal") setTask(null);

      loadStatus();
    });

    socket.on("intervention_completed", () => {
      console.log("⚡ intervention_completed");

      setStudent((prev) =>
        prev ? { ...prev, status: "normal" } : prev
      );

      setTask(null);

      loadStatus();
    });

    return () => {
      console.log("🔴 Socket disconnected");
      socket.disconnect();
    };
  }, [studentId, loadStatus]);

  // --------------------------------------------
  // RETURN HOOK VALUES
  // --------------------------------------------
  return { student, task, loadStatus };
}

// --------------------------------------------
// Extra API Calls
// --------------------------------------------
export async function submitCheckin(payload: any) {
  const res = await fetch(`${BACKEND}/api/daily-checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function completeIntervention(studentId: string) {
  const res = await fetch(`${BACKEND}/api/complete-intervention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId }),
  });
  return res.json();
}

