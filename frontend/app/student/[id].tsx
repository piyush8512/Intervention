// ============================================
// 3. frontend/app/student/[id].tsx
// ============================================
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useStudent } from "@/hooks/useStudent";

export default function StudentLoader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { student, loadStatus } = useStudent(id);

  useEffect(() => {
    loadStatus();
  }, [id]);

  useEffect(() => {
    if (!student) return;

    if (student.status === "normal") {
      router.replace(`/student/normal?id=${id}`);
    } else if (student.status === "needs_intervention") {
      router.replace(`/student/locked?id=${id}`);
    } else if (student.status === "remedial") {
      router.replace(`/student/remedial?id=${id}`);
    }
  }, [student]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
