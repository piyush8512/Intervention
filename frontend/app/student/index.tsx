// frontend/app/student/index.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  SafeAreaView,
  Alert,
} from "react-native";
import { BACKEND } from "@/hooks/hooks";

export default function StudentHome() {
  const [studentId, setStudentId] = useState("");
  const router = useRouter();

  async function load() {
    if (!studentId) {
      Alert.alert("Enter a student ID");
      return;
    }
    router.push(`/student/${studentId}`);
  }

  async function createStudent() {
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
      Alert.alert("Created student", json.id);
    } catch (e) {
      Alert.alert("Error", "Unable to create student");
    }
  }

  return (
    <SafeAreaView style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Student Login</Text>

      <TextInput
        placeholder="Enter student ID"
        value={studentId}
        onChangeText={setStudentId}
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 6,
          marginVertical: 15,
        }}
      />

      <Button title="Load Student" onPress={load} />

      <View style={{ height: 20 }} />
      <Button title="Create Demo Student" onPress={createStudent} />
    </SafeAreaView>
  );
}
