// ============================================
// 5. frontend/app/student/locked.tsx
// ============================================
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { useStudent } from '@/hooks/useStudent';

export default function Locked() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { student, loadStatus } = useStudent(id);

  useEffect(() => {
    // Poll every 10 seconds
    const interval = setInterval(() => {
      loadStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Analysis in Progress</Text>
        <Text style={styles.message}>
          Your mentor has been notified and is reviewing your progress.
          Please wait for their feedback.
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>Status: Waiting for Mentor</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={loadStatus}>
          <Text style={styles.buttonText}>Refresh Status</Text>
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
    alignItems: 'center',
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
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  statusBox: {
    backgroundColor: '#FFF3CD',
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    width: '100%',
  },
  statusText: {
    color: '#856404',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});