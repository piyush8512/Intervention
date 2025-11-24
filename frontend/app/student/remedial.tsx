
import { useLocalSearchParams, useRouter } from "expo-router"; // <--- 1. Import useRouter
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useStudent, completeIntervention } from "@/hooks/useStudent";
import { useEffect } from "react";

export default function Remedial() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(); // <--- 2. Initialize router
  const { student, task, loadStatus } = useStudent(id);

  // --- 3. AUTO-REDIRECT: Watch for status change ---
  // If the status becomes 'normal' (via Socket or API), go to the Normal screen automatically
  useEffect(() => {
    if (student?.status === "normal") {
      // Use 'replace' so the user can't swipe back to this remedial screen
      router.replace(`/student/normal?id=${id}`);
    }
  }, [student?.status]);

  async function handleComplete() {
    try {
      const res = await completeIntervention(id!);

      // Optional: Show success briefly
      Alert.alert("Great Job!", "Intervention marked as complete.");

      // Force a status refresh just in case socket is slow
      await loadStatus();

      // The useEffect above will handle the navigation when status changes,
      // but we can also force it here to be instant:
      router.replace(`/student/normal?id=${id}`);
    } catch (error) {
      Alert.alert("Error", "Failed to complete intervention");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Remedial Task Assigned</Text>
        <Text style={styles.subtitle}>Complete the task below to continue</Text>

        <View style={styles.taskContainer}>
          <Text style={styles.taskLabel}>Your Task:</Text>
          <Text style={styles.taskText}>
            {task || "Loading task details..."}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>✓ Mark as Complete</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  taskContainer: {
    backgroundColor: "#E3F2FD",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976D2",
    marginBottom: 8,
  },
  taskText: {
    fontSize: 18,
    color: "#333",
    lineHeight: 26,
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
});
