import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
} from "react-native";
import { BACKEND } from "@/hooks/useStudent";

export default function HomeScreen() {
  const [studentId, setStudentId] = useState("");
  const router = useRouter();

  async function loadStudent() {
    if (!studentId.trim()) {
      Alert.alert("Error", "Please enter a student ID");
      return;
    }
    router.push(`/student/${studentId}`);
  }

  async function createDemoStudent() {
    try {
      const res = await fetch(`${BACKEND}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Demo Student",
          email: `demo+${Date.now()}@example.com`,
        }),
      });

      const json = await res.json();
      setStudentId(json.id);
      Alert.alert("Student Created", `ID: ${json.id}`);
    } catch (e) {
      Alert.alert("Error", "Unable to create student");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Student </Text>
        <Text style={styles.subtitle}>Enter your Student ID to continue</Text>

        <TextInput
          placeholder="Student ID (UUID)"
          value={studentId}
          onChangeText={setStudentId}
          style={styles.input}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={loadStudent}>
          <Text style={styles.buttonText}>Load Student</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={createDemoStudent}
        >
          <Text style={styles.secondaryButtonText}>Create Demo Student</Text>
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
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
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
  button: {
    backgroundColor: "#000000ff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 20,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000000ff",
  },
  secondaryButtonText: {
    color: "#000000ff",
    fontSize: 16,
    fontWeight: "600",
  },
});
