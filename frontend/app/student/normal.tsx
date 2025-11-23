// ============================================
// 4. frontend/app/student/normal.tsx
// ============================================
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useStudent, submitCheckin } from '@/hooks/useStudent';

export default function Normal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { student, loadStatus } = useStudent(id);

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [quiz, setQuiz] = useState('');

  useEffect(() => {
    let interval: any;
    if (running) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running]);

  async function handleSubmit() {
    if (!quiz || isNaN(Number(quiz))) {
      Alert.alert('Error', 'Please enter a valid quiz score (0-10)');
      return;
    }

    const payload = {
      student_id: id,
      quiz_score: Number(quiz),
      focus_minutes: Math.floor(seconds / 60),
    };

    try {
      const res = await submitCheckin(payload);
      Alert.alert(res.status, res.message);
      
      // Reset form
      setQuiz('');
      setSeconds(0);
      setRunning(false);
      
      // Reload status
      setTimeout(() => loadStatus(), 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit check-in');
    }
  }

  const formatTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        <TouchableOpacity
          style={[styles.button, running && styles.stopButton]}
          onPress={() => setRunning(!running)}
        >
          <Text style={styles.buttonText}>
            {running ? 'Stop Timer' : 'Start Focus Session'}
          </Text>
        </TouchableOpacity>

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
          onPress={handleSubmit}
          disabled={running}
        >
          <Text style={styles.buttonText}>Submit Daily Check-in</Text>
        </TouchableOpacity>

        {running && (
          <Text style={styles.warning}>
            Stop the timer before submitting
          </Text>
        )}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  timerContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  warning: {
    textAlign: 'center',
    color: '#FF9500',
    marginTop: 10,
    fontSize: 14,
  },
});