<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import {
  activateAccount,
  registerUser,
  RegisterError,
} from '@/services/registerService'

// Datos del formulario
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// Errores mostrados debajo de cada campo
const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// Estados de la pantalla
const loading = ref(false)
const errorMessage = ref('')
const activationToken = ref('')

const accountCreated = ref(false)
const accountActivated = ref(false)

// Estados para mostrar u ocultar las contraseñas
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Requisitos individuales de la contraseña
const passwordRequirements = computed(() => ({
  length: form.password.length >= 8,
  uppercase: /[A-Z]/.test(form.password),
  lowercase: /[a-z]/.test(form.password),
  number: /[0-9]/.test(form.password),
  special: /[^A-Za-z0-9\s]/.test(form.password),
}))

// Indica si la contraseña cumple todos los requisitos
const isPasswordValid = computed(() => {
  return Object.values(passwordRequirements.value).every(Boolean)
})

// Calcula visualmente la fortaleza de la contraseña
const passwordStrength = computed(() => {
  const requirements = passwordRequirements.value

  const score = Object.values(requirements).filter(Boolean).length

  if (score <= 2) {
    return {
      text: 'Débil',
      className: 'weak',
      width: '33%',
    }
  }

  if (score <= 4) {
    return {
      text: 'Media',
      className: 'medium',
      width: '66%',
    }
  }

  return {
    text: 'Fuerte',
    className: 'strong',
    width: '100%',
  }
})

// Limpia errores anteriores
const clearErrors = (): void => {
  errors.name = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errorMessage.value = ''
}

// Limpia el error del nombre cuando el dato ya es válido
watch(
  () => form.name,
  () => {
    if (form.name.trim().length >= 3) {
      errors.name = ''
    }
  },
)

// Limpia el error del correo cuando el dato ya es válido
watch(
  () => form.email,
  () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (emailPattern.test(form.email.trim())) {
      errors.email = ''
    }
  },
)

// Limpia el error de contraseña cuando cumple todos los requisitos
watch(
  () => form.password,
  () => {
    if (isPasswordValid.value) {
      errors.password = ''
    }

    if (
      form.confirmPassword &&
      form.confirmPassword === form.password
    ) {
      errors.confirmPassword = ''
    }
  },
)

// Limpia el error de confirmación cuando ambas contraseñas coinciden
watch(
  () => form.confirmPassword,
  () => {
    if (
      form.confirmPassword &&
      form.confirmPassword === form.password
    ) {
      errors.confirmPassword = ''
    }
  },
)

// Valida el formulario antes de enviarlo al API
const validateForm = (): boolean => {
  clearErrors()

  let valid = true

  if (form.name.trim().length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres.'
    valid = false
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Ingrese un correo electrónico válido.'
    valid = false
  }

  if (!isPasswordValid.value) {
    errors.password =
      'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
    valid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Debe confirmar la contraseña.'
    valid = false
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
    valid = false
  }

  return valid
}

// Registra al usuario usando el servicio del API
const handleRegister = async (): Promise<void> => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await registerUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    })

    activationToken.value = response.activationToken
    accountCreated.value = true
    } catch (error) {
      if (error instanceof RegisterError) {
        const apiFields =
          error.fieldErrors

        if (apiFields) {
          if (apiFields.name?.length) {
            errors.name =
              apiFields.name.join(' ')
          }

          if (apiFields.email?.length) {
            errors.email =
              apiFields.email.join(' ')
          }

          if (apiFields.password?.length) {
            errors.password =
              apiFields.password.join(' ')
          }
        }

        const hasFieldError =
          Boolean(errors.name) ||
          Boolean(errors.email) ||
          Boolean(errors.password)

        if (!hasFieldError) {
          errorMessage.value =
            error.message
        }

        return
      }

      if (error instanceof Error) {
        errorMessage.value =
          error.message
      } else {
        errorMessage.value =
          'Ocurrió un error inesperado.'
      }
    } finally {
      loading.value = false
    }
  }

// Activa la cuenta con el token devuelto por el registro
const handleActivation = async (): Promise<void> => {
  if (!activationToken.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await activateAccount(activationToken.value)
    accountActivated.value = true
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Ocurrió un error inesperado.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="register-page">
    <!-- Formas decorativas del fondo -->
    <div class="background-shape shape-one"></div>
    <div class="background-shape shape-two"></div>

    <section class="register-container">
      <!-- Sección izquierda -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="logo">
            <span class="face face-left">◐</span>
            <span class="face face-right">◑</span>
          </div>

          <h1>LasDosCaras</h1>

          <p class="brand-description">
            Comparte tu opinión, descubre otros puntos de vista
            y conoce las dos caras de cada historia.
          </p>

          <div class="brand-message">
            <span>●</span>
            <p>Tu opinión también cuenta.</p>
          </div>
        </div>
      </div>

      <!-- Sección derecha -->
      <div class="form-section">
        <!-- FORMULARIO DE REGISTRO -->
        <div
          v-if="!accountCreated"
          class="form-content"
        >
          <div class="mobile-logo">
            <span>◐◑</span>
            LasDosCaras
          </div>

          <div class="register-header">
            <span class="welcome-label">ÚNETE</span>

            <h2>Crea tu cuenta</h2>

            <p>
              Completa tus datos para comenzar.
            </p>
          </div>

          <form
            class="register-form"
            novalidate
            @submit.prevent="handleRegister"
          >
            <!-- Nombre -->
            <div class="form-group">
              <label for="name">
                Nombre completo
              </label>

              <div class="input-container">
                <span class="input-icon">●</span>

                <input
                  id="name"
                  v-model="form.name"
                  type="text"
                  placeholder="Tu nombre completo"
                  autocomplete="name"
                  :aria-invalid="Boolean(errors.name)"
                  aria-describedby="name-error"
                />
              </div>

              <p
                v-if="errors.name"
                id="name-error"
                class="field-error"
                role="alert"
              >
                {{ errors.name }}
              </p>
            </div>

            <!-- Correo -->
            <div class="form-group">
              <label for="email">
                Correo electrónico
              </label>

              <div class="input-container">
                <span class="input-icon">✉</span>

                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autocomplete="email"
                  :aria-invalid="Boolean(errors.email)"
                  aria-describedby="email-error"
                />
              </div>

              <p
                v-if="errors.email"
                id="email-error"
                class="field-error"
                role="alert"
              >
                {{ errors.email }}
              </p>
            </div>

            <!-- Contraseña -->
            <div class="form-group">
              <label for="password">
                Contraseña
              </label>

              <div class="input-container">
                <span class="input-icon">●</span>

                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="password-input"
                  placeholder="Crea una contraseña segura"
                  autocomplete="new-password"
                  :aria-invalid="Boolean(errors.password)"
                  aria-describedby="password-error password-requirements"
                />

                <button
                  class="toggle-password"
                  type="button"
                  :aria-label="
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  "
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>

              <!-- Indicador de fortaleza -->
              <div
                v-if="form.password"
                class="password-strength"
              >
                <div class="strength-track">
                  <div
                    class="strength-bar"
                    :class="passwordStrength.className"
                    :style="{ width: passwordStrength.width }"
                  ></div>
                </div>

                <span>
                  {{ passwordStrength.text }}
                </span>
              </div>

              <!-- Requisitos de contraseña -->
              <div
                v-if="form.password"
                id="password-requirements"
                class="password-requirements"
              >
                <span
                  :class="{ valid: passwordRequirements.length }"
                >
                  {{ passwordRequirements.length ? '✓' : '•' }}
                  Mínimo 8 caracteres
                </span>

                <span
                  :class="{ valid: passwordRequirements.uppercase }"
                >
                  {{ passwordRequirements.uppercase ? '✓' : '•' }}
                  Una mayúscula
                </span>

                <span
                  :class="{ valid: passwordRequirements.lowercase }"
                >
                  {{ passwordRequirements.lowercase ? '✓' : '•' }}
                  Una minúscula
                </span>

                <span
                  :class="{ valid: passwordRequirements.number }"
                >
                  {{ passwordRequirements.number ? '✓' : '•' }}
                  Un número
                </span>

                <span
                  :class="{ valid: passwordRequirements.special }"
                >
                  {{ passwordRequirements.special ? '✓' : '•' }}
                  Un carácter especial
                </span>
              </div>

              <p
                v-if="errors.password"
                id="password-error"
                class="field-error"
                role="alert"
              >
                {{ errors.password }}
              </p>
            </div>

            <!-- Confirmar contraseña -->
            <div class="form-group">
              <label for="confirm-password">
                Confirmar contraseña
              </label>

              <div class="input-container">
                <span class="input-icon">●</span>

                <input
                  id="confirm-password"
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="password-input"
                  placeholder="Repite tu contraseña"
                  autocomplete="new-password"
                  :aria-invalid="Boolean(errors.confirmPassword)"
                  aria-describedby="confirm-password-error"
                />

                <button
                  class="toggle-password"
                  type="button"
                  :aria-label="
                    showConfirmPassword
                      ? 'Ocultar confirmación de contraseña'
                      : 'Mostrar confirmación de contraseña'
                  "
                  @click="
                    showConfirmPassword = !showConfirmPassword
                  "
                >
                  {{
                    showConfirmPassword
                      ? 'Ocultar'
                      : 'Mostrar'
                  }}
                </button>
              </div>

              <p
                v-if="errors.confirmPassword"
                id="confirm-password-error"
                class="field-error"
                role="alert"
              >
                {{ errors.confirmPassword }}
              </p>
            </div>

            <!-- Error general -->
            <div
              v-if="errorMessage"
              class="error-message"
              role="alert"
            >
              <span>!</span>
              <p>{{ errorMessage }}</p>
            </div>

            <!-- Botón registro -->
            <button
              class="register-button"
              type="submit"
              :disabled="loading"
            >
              <span>
                {{
                  loading
                    ? 'Creando cuenta...'
                    : 'Crear cuenta'
                }}
              </span>

              <span
                v-if="!loading"
                class="button-arrow"
              >
                →
              </span>
            </button>
          </form>

          <div class="login-section">
            <span></span>

            <p>
              ¿Ya tienes una cuenta?

              <RouterLink
                class="login-text"
                to="/login"
              >
                Iniciar sesión
              </RouterLink>
            </p>

            <span></span>
          </div>
        </div>

        <!-- ACTIVACIÓN -->
        <div
          v-else-if="!accountActivated"
          class="status-content"
        >
          <div class="status-icon">
            ✓
          </div>

          <span class="welcome-label">
            CUENTA CREADA
          </span>

          <h2>Activa tu cuenta</h2>

          <p>
            Tu cuenta fue creada correctamente.
            Para continuar, debes activarla.
          </p>

          <div
            v-if="errorMessage"
            class="error-message"
            role="alert"
          >
            <span>!</span>
            <p>{{ errorMessage }}</p>
          </div>

          <button
            class="register-button"
            type="button"
            :disabled="loading"
            @click="handleActivation"
          >
            <span>
              {{
                loading
                  ? 'Activando cuenta...'
                  : 'Activar cuenta'
              }}
            </span>

            <span
              v-if="!loading"
              class="button-arrow"
            >
              →
            </span>
          </button>
        </div>

        <!-- ACTIVACIÓN EXITOSA -->
        <div
          v-else
          class="status-content"
        >
          <div class="status-icon">
            ✓
          </div>

          <span class="welcome-label">
            CUENTA ACTIVADA
          </span>

          <h2>Todo está listo</h2>

          <p>
            Tu cuenta se activó correctamente.
            Ya puedes iniciar sesión.
          </p>

          <div class="success-message">
            Cuenta activada correctamente.
          </div>

          <RouterLink
            class="register-button login-button-link"
            to="/login"
          >
            <span>Ir a iniciar sesión</span>
            <span class="button-arrow">→</span>
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* =========================
   MOBILE FIRST
   Base: móvil
   ========================= */

.login-button-link {
  margin-top: 20px;
  text-decoration: none;
}

.register-page {
  position: relative;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
  background: #ffffff;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

/* =========================
   Formas decorativas
   ========================= */

.background-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.3;
}

.shape-one {
  top: -150px;
  right: -100px;
  width: 350px;
  height: 350px;
  background: #8b5cf6;
}

.shape-two {
  bottom: -150px;
  left: -100px;
  width: 300px;
  height: 300px;
  background: #4f46e5;
}

/* =========================
   Contenedor
   ========================= */

.register-container {
  position: relative;
  z-index: 1;
  display: grid;
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  grid-template-columns: 1fr;
  overflow: hidden;
  border: none;
  border-radius: 0;
  background: #ffffff;
  box-shadow: none;
}

/* =========================
   Sección de marca
   Oculta en móvil
   ========================= */

.brand-section {
  position: relative;
  display: none;
  align-items: center;
  overflow: hidden;
  padding: 60px;
  background:
    linear-gradient(
      145deg,
      rgba(79, 70, 229, 0.96),
      rgba(88, 28, 135, 0.97)
    );
  color: #ffffff;
}

.brand-section::after {
  content: '';
  position: absolute;
  right: -120px;
  bottom: -80px;
  width: 280px;
  height: 280px;
  border: 50px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
}

.brand-content {
  position: relative;
  z-index: 2;
}

.logo {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  font-size: 54px;
  letter-spacing: -17px;
}

.face-right {
  color: #c4b5fd;
}

.brand-content h1 {
  margin: 0 0 18px;
  font-size: 46px;
  line-height: 1;
  letter-spacing: -2px;
}

.brand-description {
  max-width: 360px;
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 17px;
  line-height: 1.7;
}

.brand-message {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 45px;
  padding: 15px 18px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.brand-message p {
  margin: 0;
  font-size: 14px;
}

/* =========================
   Formulario
   ========================= */

.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 35px 24px;
  background: #ffffff;
}

.form-content,
.status-content {
  width: 100%;
  max-width: 370px;
}

.mobile-logo {
  display: block;
  margin-bottom: 30px;
  color: #4f46e5;
  font-size: 20px;
  font-weight: 800;
}

.mobile-logo span {
  margin-right: 6px;
}

.register-header {
  margin-bottom: 28px;
}

.welcome-label {
  display: inline-block;
  margin-bottom: 12px;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
}

.register-header h2,
.status-content h2 {
  margin: 0 0 10px;
  color: #171717;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -1px;
}

.register-header p,
.status-content > p {
  margin: 0;
  color: #737373;
  font-size: 16px;
  line-height: 1.6;
}

/* =========================
   Formulario y campos
   ========================= */

.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-group label {
  color: #404040;
  font-size: 14px;
  font-weight: 600;
}

.input-container {
  position: relative;
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 15px;
  color: #a3a3a3;
  font-size: 14px;
  transform: translateY(-50%);
}

.input-container input {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 15px 13px 43px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  outline: none;
  background: #fafafa;
  color: #171717;
  font-family: inherit;
  font-size: 15px;
  transition: 0.2s ease;
}

.input-container input.password-input {
  padding-right: 78px;
}

.input-container input:focus {
  border-color: #7c3aed;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.1);
}

.input-container input[aria-invalid='true'] {
  border-color: #dc2626;
}

.toggle-password {
  position: absolute;
  top: 50%;
  right: 12px;
  padding: 4px;
  border: none;
  background: transparent;
  color: #6d28d9;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transform: translateY(-50%);
}

.toggle-password:hover {
  color: #4c1d95;
}

.toggle-password:focus-visible {
  border-radius: 4px;
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}

/* =========================
   Validaciones
   ========================= */

.field-error {
  margin: 0;
  color: #b91c1c;
  font-size: 13px;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength-track {
  height: 5px;
  flex: 1;
  overflow: hidden;
  border-radius: 20px;
  background: #e5e5e5;
}

.strength-bar {
  height: 100%;
  border-radius: 20px;
  transition: 0.2s ease;
}

.weak {
  background: #dc2626;
}

.medium {
  background: #d97706;
}

.strong {
  background: #16a34a;
}

.password-strength span {
  color: #737373;
  font-size: 12px;
}

.password-requirements {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px 10px;
  color: #737373;
  font-size: 12px;
}

.password-requirements span {
  transition: 0.2s ease;
}

.password-requirements span.valid {
  color: #15803d;
  font-weight: 600;
}

/* =========================
   Error general
   ========================= */

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 9px;
  background: #fef2f2;
  color: #b91c1c;
}

.error-message span {
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #b91c1c;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
}

.error-message p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

/* =========================
   Botón de registro
   ========================= */

.register-button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #7c3aed
    );
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 10px 20px rgba(109, 40, 217, 0.25);
}

.register-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.button-arrow {
  font-size: 19px;
}

/* =========================
   Login
   ========================= */

.login-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 25px;
}

.login-section > span {
  height: 1px;
  flex: 1;
  background: #e5e5e5;
}

.login-section p {
  margin: 0;
  color: #737373;
  font-size: 13px;
  text-align: center;
}

.login-text {
  color: #6d28d9;
  font-weight: 700;
  text-decoration: none;
}

/* =========================
   Estado después del registro
   ========================= */

.status-content {
  text-align: center;
}

.status-icon {
  display: flex;
  width: 65px;
  height: 65px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 25px;
  border-radius: 50%;
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #7c3aed
    );
  color: #ffffff;
  font-size: 30px;
  font-weight: 700;
}

.status-content .register-button {
  margin-top: 30px;
}

.success-message {
  margin-top: 25px;
  padding: 14px;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  background: #f0fdf4;
  color: #166534;
  font-size: 14px;
  font-weight: 600;
}

/* =========================
   TABLET
   ========================= */

@media (min-width: 481px) {
  .register-page {
    padding: 20px;
    background:
      radial-gradient(
        circle at top left,
        #312e81 0%,
        transparent 35%
      ),
      radial-gradient(
        circle at bottom right,
        #581c87 0%,
        transparent 35%
      ),
      #0f1020;
  }

  .register-container {
    max-width: 500px;
    min-height: auto;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.35);
  }

  .form-section {
    padding: 45px 35px;
  }

  .register-header h2,
  .status-content h2 {
    font-size: 32px;
  }

  .password-requirements {
    grid-template-columns: 1fr 1fr;
  }
}

/* =========================
   ESCRITORIO
   ========================= */

@media (min-width: 801px) {
  .register-page {
    padding: 30px;
  }

  .register-container {
    max-width: 1100px;
    min-height: 680px;
    grid-template-columns: 1fr 1fr;
  }

  .brand-section {
    display: flex;
  }

  .form-section {
    padding: 45px 55px;
  }

  .form-content,
  .status-content {
    max-width: 400px;
  }

  .mobile-logo {
    display: none;
  }

  .register-header h2,
  .status-content h2 {
    font-size: 34px;
  }
}

/* =========================
   PANTALLAS GRANDES
   ========================= */

@media (min-width: 1400px) {
  .register-container {
    max-width: 1200px;
  }

  .form-content,
  .status-content {
    max-width: 420px;
  }
}

/* =========================
   TEMA OSCURO
   ========================= */

:global(html[data-theme='dark'] .register-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .register-container) {
  border-color: #343447;
  background: #171728;
}

:global(html[data-theme='dark'] .form-section) {
  background: #171728;
}

:global(html[data-theme='dark'] .mobile-logo) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .welcome-label) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .register-header h2),
:global(html[data-theme='dark'] .status-content h2) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .register-header p),
:global(html[data-theme='dark'] .status-content > p) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .form-group label) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .input-container input) {
  border-color: #343447;
  background: #11111d;
  color: #f4f4f5;
}

:global(
  html[data-theme='dark']
    .input-container input::placeholder
) {
  color: #71717a;
}

:global(html[data-theme='dark'] .input-container input:focus) {
  border-color: #8b5cf6;
  background: #11111d;
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.15);
}

:global(html[data-theme='dark'] .input-icon) {
  color: #71717a;
}

:global(html[data-theme='dark'] .toggle-password) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .toggle-password:hover) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .strength-track) {
  background: #343447;
}

:global(html[data-theme='dark'] .password-strength span) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .password-requirements) {
  color: #a1a1aa;
}

:global(
  html[data-theme='dark']
    .password-requirements span.valid
) {
  color: #86efac;
}

:global(html[data-theme='dark'] .field-error) {
  color: #fca5a5;
}

:global(html[data-theme='dark'] .error-message) {
  border-color: #7f1d1d;
  background: #3f1d24;
  color: #fecaca;
}

:global(html[data-theme='dark'] .error-message span) {
  background: #b91c1c;
  color: #ffffff;
}

:global(html[data-theme='dark'] .login-section > span) {
  background: #343447;
}

:global(html[data-theme='dark'] .login-section p) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .login-text) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .success-message) {
  border-color: #166534;
  background: #123524;
  color: #bbf7d0;
}

/* =========================
   AUTOFILL EN TEMA OSCURO
   ========================= */

:global(
  html[data-theme='dark']
    .input-container input:-webkit-autofill
),
:global(
  html[data-theme='dark']
    .input-container input:-webkit-autofill:hover
),
:global(
  html[data-theme='dark']
    .input-container input:-webkit-autofill:focus
) {
  -webkit-text-fill-color: #f4f4f5;
  -webkit-box-shadow:
    0 0 0 1000px #11111d inset;
  box-shadow:
    0 0 0 1000px #11111d inset;
  caret-color: #f4f4f5;
  border-color: #343447;
  transition:
    background-color 9999s ease-out 0s;
}
</style>