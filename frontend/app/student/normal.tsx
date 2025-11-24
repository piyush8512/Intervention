
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react"; // <--- Import useRef
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  StyleSheet,
  AppState, // <--- 1. Import AppState
} from "react-native";
import { useStudent, submitCheckin } from "@/hooks/useStudent";

export default function Normal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { student, loadStatus } = useStudent(id);

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [quiz, setQuiz] = useState("");

  // --- AUTO-NAVIGATION LOGIC ---
  useEffect(() => {
    if (!student) return;
    if (student.status === "needs_intervention") {
      router.replace(`/student/locked?id=${id}`);
    } else if (student.status === "remedial") {
      router.replace(`/student/remedial?id=${id}`);
    }
  }, [student?.status]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: any;
    if (running) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running]);

  // --- NEW: APP STATE LISTENER (Auto-Submit on Switch) ---
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // If app goes to background (user switches apps) AND timer is running
      if (nextAppState.match(/inactive|background/) && running) {
        console.log("User switched apps! Auto-submitting...");
        handleSubmit(true); // <--- Pass 'true' to force auto-submit
      }
    });

    return () => {
      subscription.remove();
    };
  }, [running, quiz, seconds]); // Dependencies ensure we submit current values

  // --- SUBMIT LOGIC ---
  // Modified to accept isAutoSubmit flag
  async function handleSubmit(isAutoSubmit = false) {
    let finalScore = quiz;

    // If auto-submitting (background switch) and box is empty, default to 0
    if (isAutoSubmit && !finalScore) {
      finalScore = "0";
    }

    if (!finalScore || isNaN(Number(finalScore))) {
      // Only show alert if user is actually looking at the screen (manual submit)
      if (!isAutoSubmit) {
        Alert.alert("Error", "Please enter a valid quiz score (0-10)");
      }
      return;
    }

    const payload = {
      student_id: id,
      quiz_score: Number(finalScore),
      focus_minutes: Math.floor(seconds / 60),
    };

    try {
      // Stop timer immediately to prevent duplicate submissions
      setRunning(false);

      const res = await submitCheckin(payload);

      if (res.passed) {
        // SUCCESS
        setSeconds(0);
        setQuiz("");
        if (!isAutoSubmit) Alert.alert("Great Job!", res.message);
        loadStatus();
      } else {
        // FAILURE
        if (!isAutoSubmit) Alert.alert("Check-in Complete", res.message);
        await loadStatus();
        router.replace(`/student/locked?id=${id}`);
      }
    } catch (error) {
      if (!isAutoSubmit) Alert.alert("Error", "Failed to submit check-in.");
    }
  }

  const formatTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Focus Mode</Text>
        <Text style={styles.subtitle}>Student: {student?.name}</Text>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime()}</Text>
          <Text style={styles.timerLabel}>
            {Math.floor(seconds / 60)} minutes logged
          </Text>
        </View>

        {!running && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setRunning(true)}
          >
            <Text style={styles.buttonText}>Start Focus Session</Text>
          </TouchableOpacity>
        )}

        {running && (
          <Text style={styles.activeText}>
            Session Active! Do not switch apps.
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.label}>Daily Quiz Score (0-10)</Text>
        <TextInput
          placeholder="Enter score"
          value={quiz}
          onChangeText={setQuiz}
          keyboardType="numeric"
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => handleSubmit(false)} // Manual click passes false
        >
          <Text style={styles.buttonText}>Submit & End Session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  timerContainer: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#007AFF",
  },
  timerLabel: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  button: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  activeText: {
    textAlign: "center",
    color: "#FF3B30", // Red text to warn them
    fontWeight: "600",
    fontSize: 16,
    padding: 10,
  },
  divider: {
    height: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,    
    alignItems: "center",
  },
});
