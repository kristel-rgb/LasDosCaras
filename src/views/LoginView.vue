<script setup lang="ts">
import { getMyFavorites } from '@/services/favoritesService'
import { useRouter } from 'vue-router'
import { ref } from 'vue'

import { login } from '@/services/authService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

// Store encargado de manejar la sesión del usuario
const authStore = useAuthStore()
const toastStore = useToastStore()
// Router utilizado para navegar después de iniciar sesión
const router = useRouter()

// Datos ingresados en el formulario
const email = ref('')
const password = ref('')

// Controla si la contraseña se muestra o se oculta
const showPassword = ref(false)

// Estados utilizados para mostrar carga y errores
const loading = ref(false)
const errorMessage = ref('')

// Ejecuta el inicio de sesión contra el API
const handleLogin = async () => {

  // Limpiamos cualquier mensaje de error anterior
  errorMessage.value = ''

  // Validamos que los campos obligatorios tengan información
  if (!email.value || !password.value) {
    errorMessage.value = 'Debes ingresar el correo y la contraseña.'
    return
  }

  loading.value = true

  try {
    // Enviamos las credenciales al servicio de autenticación
    const response = await login({
      email: email.value,
      password: password.value,
    })

    // Guardamos el JWT y los datos del usuario en el store
    authStore.setSession(response.token, response.user)

    // Cargamos los favoritos del usuario después del login
    const favorites = await getMyFavorites(response.token)

    // Guardamos los favoritos para utilizarlos en otras pantallas
    localStorage.setItem(
      'lasdoscaras_favorites',
      JSON.stringify(favorites),
    )

    // Redirigimos al usuario después de iniciar sesión correctamente
    router.push('/')

    toastStore.success(
      'Sesión iniciada correctamente.',
    )
  } catch (error) {
    // Mostramos el mensaje generado por el servicio
    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Ocurrió un error inesperado.'
    }
  } finally {
    // La petición terminó, haya sido exitosa o no
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <!-- Elementos decorativos del fondo -->
    <div class="background-shape shape-one"></div>
    <div class="background-shape shape-two"></div>

    <section class="login-container">
      <!-- Sección visual de la plataforma -->
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

      <!-- Sección del formulario -->
      <div class="form-section">
        <div class="form-content">
          <div class="mobile-logo">
            <span>◐◑</span>
            LasDosCaras
          </div>

          <div class="login-header">
            <span class="welcome-label">BIENVENID@</span>
            <h2>Inicia sesión</h2>
            <p>Ingresa tus datos para continuar.</p>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <!-- Correo electrónico -->
            <div class="form-group">
              <label for="email">Correo electrónico</label>

              <div class="input-container">
                <span class="input-icon">✉</span>

                <input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autocomplete="email"
                />
              </div>
            </div>

            <!-- Contraseña -->
            <div class="form-group">
              <label for="password">Contraseña</label>

              <div class="input-container">
                <span class="input-icon">●</span>

                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Ingresa tu contraseña"
                  autocomplete="current-password"
                />

                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
            </div>

            <!-- Mensajes de error -->
            <div v-if="errorMessage" class="error-message">
              <span>!</span>
              <p>{{ errorMessage }}</p>
            </div>

            <!-- Botón principal -->
            <button
              class="login-button"
              type="submit"
              :disabled="loading"
            >
              <span>
                {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
              </span>

              <span v-if="!loading" class="button-arrow">→</span>
            </button>
          </form>

          <!-- Registro -->
          <div class="register-section">
            <span></span>

            <p>
              ¿No tienes una cuenta?
              <RouterLink to="/register">
                Crear cuenta
              </RouterLink>
            </p>

            <span></span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* =========================
   Pantalla principal
   ========================= */

.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 30px;
  background:
    radial-gradient(circle at top left, #312e81 0%, transparent 35%),
    radial-gradient(circle at bottom right, #581c87 0%, transparent 35%),
    #0f1020;
  font-family:
    Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
}

/* Formas decorativas del fondo */

.background-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.3;
}

.shape-one {
  width: 350px;
  height: 350px;
  top: -150px;
  right: -100px;
  background: #8b5cf6;
}

.shape-two {
  width: 300px;
  height: 300px;
  bottom: -150px;
  left: -100px;
  background: #4f46e5;
}

/* =========================
   Contenedor
   ========================= */

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1000px;
  min-height: 610px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
}

/* =========================
   Sección izquierda
   ========================= */

.brand-section {
  position: relative;
  display: flex;
  align-items: center;
  padding: 60px;
  overflow: hidden;
  color: #ffffff;
  background:
    linear-gradient(
      145deg,
      rgba(79, 70, 229, 0.96),
      rgba(88, 28, 135, 0.97)
    );
}

.brand-section::after {
  content: '';
  position: absolute;
  width: 280px;
  height: 280px;
  right: -120px;
  bottom: -80px;
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

.face {
  display: inline-block;
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
  backdrop-filter: blur(10px);
}

.brand-message span {
  color: #c4b5fd;
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
  padding: 55px;
  background: #ffffff;
}

.form-content {
  width: 100%;
  max-width: 370px;
}

.mobile-logo {
  display: none;
}

.login-header {
  margin-bottom: 35px;
}

.welcome-label {
  display: inline-block;
  margin-bottom: 12px;
  color: #6d28d9;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.login-header h2 {
  margin: 0 0 10px;
  color: #171717;
  font-size: 34px;
  letter-spacing: -1px;
}

.login-header p {
  margin: 0;
  color: #737373;
  font-size: 15px;
}

/* =========================
   Inputs
   ========================= */

.login-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  padding: 14px 15px 14px 43px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  outline: none;
  background: #fafafa;
  color: #171717;
  font-size: 15px;
  transition: 0.2s ease;
}

.input-container input::placeholder {
  color: #a3a3a3;
}

.input-container input:focus {
  border-color: #7c3aed;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

/* =========================
   Errores
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
  border-radius: 50%;
  background: #b91c1c;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.error-message p {
  margin: 0;
  font-size: 13px;
}

/* =========================
   Botón
   ========================= */

.login-button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(109, 40, 217, 0.25);
}

.login-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.button-arrow {
  font-size: 19px;
}

/* =========================
   Registro
   ========================= */

.register-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
}

.register-section > span {
  flex: 1;
  height: 1px;
  background: #e5e5e5;
}

.register-section p {
  margin: 0;
  color: #737373;
  font-size: 13px;
  white-space: nowrap;
}

.register-section a {
  color: #6d28d9;
  font-weight: 700;
  text-decoration: none;
}

.register-section a:hover {
  text-decoration: underline;
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 800px) {
  .login-page {
    padding: 20px;
  }

  .login-container {
    max-width: 500px;
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .brand-section {
    display: none;
  }

  .form-section {
    padding: 45px 35px;
  }

  .mobile-logo {
    display: block;
    margin-bottom: 35px;
    color: #4f46e5;
    font-size: 20px;
    font-weight: 800;
  }

  .mobile-logo span {
    margin-right: 6px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0;
    background: #ffffff;
  }

  .login-container {
    min-height: 100vh;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .form-section {
    padding: 35px 24px;
  }

  .login-header h2 {
    font-size: 30px;
  }
}

 /* Botón para mostrar u ocultar la contraseña */
.password-toggle {
  position: absolute;
  top: 50%;
  right: 14px;
  border: none;
  background: transparent;
  color: #6d28d9;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transform: translateY(-50%);
}

.password-toggle:hover {
  color: #4f46e5;
}

/* =========================
   TEMA OSCURO
   ========================= */

:global(html[data-theme='dark'] .login-container) {
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

:global(html[data-theme='dark'] .login-header h2) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .login-header p) {
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

:global(html[data-theme='dark'] .password-toggle) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .password-toggle:hover) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .register-section > span) {
  background: #343447;
}

:global(html[data-theme='dark'] .register-section p) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .register-section a) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .register-section a:hover) {
  color: #a78bfa;
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

/* Móvil en modo oscuro */

@media (max-width: 480px) {
  :global(html[data-theme='dark'] .login-page) {
    background: #0f1020;
  }

  :global(html[data-theme='dark'] .login-container) {
    background: #171728;
  }
}

/* =========================
   AUTOFILL EN TEMA OSCURO- Para Chrome
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