import { useLocalSearchParams } from 'expo-router';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { useStudent, completeIntervention } from '@/hooks/useStudent';

export default function Remedial() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { student, task, loadStatus } = useStudent(id);

  async function handleComplete() {
    try {
      const res = await completeIntervention(id!);
      Alert.alert('Success', res.message);
      setTimeout(() => loadStatus(), 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to complete intervention');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Remedial Task Assigned</Text>
        <Text style={styles.subtitle}>Complete the task below to continue</Text>

        <View style={styles.taskContainer}>
          <Text style={styles.taskLabel}>Your Task:</Text>
          <Text style={styles.taskText}>{task || 'No task assigned'}</Text>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  taskContainer: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  taskText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
  },
  button: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});