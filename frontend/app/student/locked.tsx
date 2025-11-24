
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useStudent } from "@/hooks/useStudent";

export default function Locked() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // FIX: Bring back 'loadStatus' so we can use it for the manual button
  const { student, loadStatus } = useStudent(id);

  // --- AUTO-NAVIGATION LOGIC ---
  // Watch for status changes. If the mentor assigns a task, move immediately.
  useEffect(() => {
    if (!student) return;

    if (student.status === "remedial") {
      // Mentor assigned a task -> Move to Remedial Screen
      router.replace(`/student/remedial?id=${id}`);
    } else if (student.status === "normal") {
      // Mentor cleared the flag without a task -> Back to Normal
      router.replace(`/student/normal?id=${id}`);
    }
  }, [student?.status]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Analysis in Progress</Text>
        <Text style={styles.message}>
          Your mentor has been notified and is reviewing your progress. Please
          wait for their feedback.
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            Status:{" "}
            {student?.status === "needs_intervention"
              ? "Waiting for Mentor"
              : student?.status || "Loading..."}
          </Text>

          {/* Visual cue that the app is "Auto Refreshing" via Socket */}
          <View style={styles.liveIndicator}>
            <ActivityIndicator size="small" color="#856404" />
            <Text style={styles.liveText}> Live Connection Active</Text>
          </View>
        </View>

        {/* --- ADDED BACK: Manual Refresh Button (The "Fail-Safe") --- */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            console.log("Manual refresh triggered");
            loadStatus();
          }}
        >
          <Text style={styles.buttonText}>Tap to Refresh Status</Text>
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
    alignItems: "center",
  },
  iconContainer: {
    marginTop: 60,
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  statusBox: {
    backgroundColor: "#FFF3CD",
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    width: "100%",
    alignItems: "center",
  },
  statusText: {
    color: "#856404",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  liveText: {
    color: "#856404",
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.8,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
