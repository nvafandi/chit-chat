import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';

export default function AuthScreen() {
  const { login, register, isLoading, error, setError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit() {
    if (!username.trim() || !password) return;
    const ok = mode === 'login' ? await login(username, password) : await register(username, password);
    if (!ok && !error) setError('Terjadi kesalahan. Coba lagi.');
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>CHIT CHuT</Text>
        <Text style={styles.subtitle}>{mode === 'login' ? 'Masuk ke akunmu' : 'Buat akun baru'}</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#717171"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#717171"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitText}>
            {isLoading ? 'Memproses...' : mode === 'login' ? 'LOGIN' : 'REGISTER'}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'Belum punya akun? Register' : 'Sudah punya akun? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#282828',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#641efd',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b8b8b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#3f3f3f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: {
    color: '#d06262',
    fontSize: 13,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: '#641efd',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  switchRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    color: '#9358ff',
    fontSize: 13,
  },
});
