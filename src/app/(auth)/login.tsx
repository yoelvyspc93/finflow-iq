import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Feather } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Link, Redirect, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DecorativeBackground } from '@/components/ui/decorative-background'
import { getPendingMfaFactorId, toUserFriendlyMfaError } from '@/lib/auth/mfa'
import {
  signInWithPassword,
  toUserFriendlyAuthError,
} from '@/lib/auth/session'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const authError = useAuthStore((state) => state.error)
  const isReady = useAuthStore((state) => state.isReady)
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId)
  const setError = useAuthStore((state) => state.setError)
  const setPendingMfaFactorId = useAuthStore((state) => state.setPendingMfaFactorId)
  const status = useAuthStore((state) => state.status)

  const inlineValidation = useMemo(() => {
    if (!isSupabaseConfigured || isSubmitting) {
      return null
    }

    if (!email.trim() && !password) {
      return null
    }

    if (!isValidEmail(email)) {
      return 'Escribe un correo válido.'
    }

    if (password.length > 0 && password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.'
    }

    return null
  }, [email, isSubmitting, password])

  const canSubmit = useMemo(
    () =>
      isSupabaseConfigured &&
      isValidEmail(email) &&
      password.length >= 8 &&
      !isSubmitting,
    [email, isSubmitting, password.length],
  )

  if (isReady && status === 'authenticated') {
    return <Redirect href={pendingMfaFactorId ? '/mfa' : '/'} />
  }

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setFeedback('Escribe un correo válido.')
      return
    }

    if (password.length < 8) {
      setFeedback('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setFeedback(null)

    const { error } = await signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      setFeedback(
        toUserFriendlyAuthError(error, 'No se pudo iniciar sesión. Intenta de nuevo.'),
      )
      setIsSubmitting(false)
      return
    }

    try {
      const factorId = await getPendingMfaFactorId()
      setPendingMfaFactorId(factorId)
      router.replace(factorId ? '/mfa' : '/')
    } catch (mfaError) {
      setFeedback(
        toUserFriendlyMfaError(
          mfaError,
          'No se pudo validar la verificación en dos pasos.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const helperMessage = feedback ?? inlineValidation

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Image
              contentFit="contain"
              source={require('../../../assets/logo.png')}
              style={styles.badgeImage}
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              FinFlow <Text style={styles.titleAccent}>IQ</Text>
            </Text>
            <Text style={styles.subtitle}>Accede con tu cuenta</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputShell}>
              <Feather color="#95A1BD" name="mail" size={17} />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor="#65728E"
                style={styles.input}
                value={email}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputShell}>
              <Feather color="#95A1BD" name="lock" size={17} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#65728E"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>
          </View>

          {!isSupabaseConfigured ? (
            <Text style={styles.errorText}>
              Falta configurar `EXPO_PUBLIC_SUPABASE_URL` y
              `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
            </Text>
          ) : null}

          {helperMessage ? <Text style={styles.helperText}>{helperMessage}</Text> : null}
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          <Pressable
            accessibilityLabel="Entrar a tu cuenta"
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => {
              void handleSubmit()
            }}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#F8FAFC" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
            {!isSubmitting ? (
              <Feather color="#F8FAFC" name="arrow-right" size={16} />
            ) : null}
          </Pressable>

          <Link accessibilityRole="link" href="/signup" style={styles.signUpLink}>
            Crear cuenta nueva
          </Link>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 344,
    alignSelf: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(72, 97, 173, 0.16)',
    backgroundColor: 'rgba(21, 28, 47, 0.90)',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(43, 61, 136, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  badgeImage: {
    width: 21,
    height: 21,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  titleAccent: {
    color: '#4B69FF',
  },
  subtitle: {
    color: '#7F8AA6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    color: '#D7E0F3',
    fontSize: 14,
    fontWeight: '700',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(115, 128, 167, 0.18)',
    backgroundColor: 'rgba(17, 22, 39, 0.92)',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingVertical: 13,
  },
  helperText: {
    color: '#BFD4FF',
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: '#F6A6A8',
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#4A66FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  signUpLink: {
    color: '#CBD6F7',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    height: 44,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
