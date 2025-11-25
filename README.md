# Student Intervention System

### Full-Stack Real-Time Mentorship Loop

## 🚀 Live Demo

- **Frontend (Student App)**: https://intervention-gamma.vercel.app/
- **Backend API**: https://intervention-production.up.railway.app

## 📹 Video Walkthrough

🎥 **[Watch Demo Video (5 min)](https://loom.com/share/your-video-id)**

Shows complete flow: Student fails → App locks → Mentor notified → Task assigned → App unlocks in real-time

---

## 🎯 Project Overview

An intelligent intervention system that creates a **closed-loop between students, mentors, and automation**. When a student falls behind, the system automatically:

1. **Detects** poor performance (quiz score ≤ 7 OR focus time ≤ 60 min)
2. **Locks** the student interface
3. **Notifies** a mentor via email
4. **Waits** for human intervention
5. **Assigns** remedial task from mentor
6. **Unlocks** student app in real-time with WebSockets
7. **Tracks** completion and returns to normal state

---

## 🛠️ Tech Stack

| Layer                   | Technology              | Purpose                           |
| ----------------------- | ----------------------- | --------------------------------- |
| **Frontend**            | React Native (Expo Web) | Cross-platform student interface  |
| **Backend**             | Node.js + Express       | API server & state management     |
| **Database**            | PostgreSQL (Supabase)   | Student data, logs, interventions |
| **Automation**          | n8n.cloud               | Human-in-loop mentor workflow     |
| **Real-time**           | Socket.io               | WebSocket for instant updates     |
| **Backend Deployment**  | Railway                 | Production hosting                |
| **Frontend Deployment** | Vercel                  | Production hosting                |

---

## ✨ Key Features

### Core Requirements ✅

- ✅ **State Machine**: `normal` → `needs_intervention` → `remedial` → `normal`
- ✅ **SQL Database**: UUID-based schema with proper relationships
- ✅ **Logic Gate**: Automatic status changes based on performance
- ✅ **Human-in-Loop**: Mentor approval required for unlock
- ✅ **Three-State UI**: Dynamic interface based on student status

### Bonus Features ✅

- ✅ **Real-Time WebSockets**: Instant unlock without page refresh
- ✅ **Tab-Switch Detection**: Cheater prevention during focus sessions
- ✅ **Fail-Safe Mechanism**: Auto-unlock after 12 hours (see below)

---

## 🔌 API Endpoints

### Student Endpoints

**POST** `/api/daily-checkin`

```json
Request:
{
  "student_id": "uuid",
  "quiz_score": 4,
  "focus_minutes": 30
}

Response (Failure):
{
  "status": "Pending Mentor Review",
  "message": "Your mentor has been notified",
  "passed": false
}
```

**GET** `/api/student-status/:id`

```json
Response:
{
  "id": "uuid",
  "name": "John Doe",
  "status": "remedial",
  "current_task": "Read Chapter 4",
  "last_checkin": "2024-01-20T10:00:00Z"
}
```

**POST** `/api/complete-intervention`

```json
Request:
{
  "student_id": "uuid"
}

Response:
{
  "success": true,
  "message": "Intervention completed"
}
```

### Mentor Endpoints

**POST** `/api/assign-intervention`

```json
Request:
{
  "student_id": "uuid",
  "task_description": "Read Chapter 4",
  "assigned_by": "mentor"
}
```

---

## 🔄 Data Flow (Complete Loop)

1. **Student submits check-in**

   ```
   POST /api/daily-checkin
   → quiz_score: 4, focus_minutes: 30
   ```

2. **Backend processes**

   ```
   IF score ≤ 7 OR focus ≤ 60:
     → UPDATE status = 'needs_intervention'
     → TRIGGER n8n webhook
     → EMIT socket event 'status_update'
   ```

3. **n8n automation**

   ```
   Webhook → Email → Wait → HTTP Request
   ```

4. **Mentor receives email**

   ```
   Subject: 🚨 Student Intervention Required
   Body: [Student stats + Approval link]
   ```

5. **Mentor clicks approval**

   ```
   Resume URL → POST /assign-intervention
   → task: "Read Chapter 4"
   → UPDATE status = 'remedial'
   → EMIT socket event 'intervention_assigned'
   ```

6. **Student app unlocks instantly**

   ```
   WebSocket receives event
   → Shows remedial task
   → Enables "Mark Complete" button
   ```

7. **Student completes task**
   ```
   POST /complete-intervention
   → UPDATE status = 'normal'
   → EMIT socket event 'intervention_completed'
   ```

---

## 🚀 Local Development

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Add DATABASE_URL and N8N_WEBHOOK_URL
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Add EXPO_PUBLIC_BACKEND_URL
npx expo start
# Press 'w' for web
```
