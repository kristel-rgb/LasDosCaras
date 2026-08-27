<script setup lang="ts">

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'

import type { Category } from '@/models/category'
import type { ViewFormPayload } from '@/models/viewForm'

import { getCategories } from '@/services/categoriesService'
import {
  searchHashtags,
  type Hashtag,
} from '@/services/hashtagsService'

import { createView, getViewForEditing, updateView, ViewEditorError } from '@/services/viewEditorService'
import {
  clearViewDraft,
  getViewDraft,
  saveViewDraft,
} from '@/services/draftService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()

const hasUnsavedChanges = ref(false)

const submitting = ref(false)
const formError = ref('')
const fieldErrors = reactive({
  category: '',
  sideTitle: '',
  sideDescription: '',
  sideSources: '',
  counterpartTitle: '',
  counterpartDescription: '',
  counterpartSources: '',
  hashtags: '',
})

const clearFieldErrors = (): void => {
  Object.assign(fieldErrors, {
    category: '',
    sideTitle: '',
    sideDescription: '',
    sideSources: '',
    counterpartTitle: '',
    counterpartDescription: '',
    counterpartSources: '',
    hashtags: '',
  })
}
const loadingExistingView = ref(false)

// Determina si la pantalla está creando o editando
const viewId = computed(() => {
  const id = route.params.id

  return typeof id === 'string'
    ? id
    : ''
})

const isEditMode = computed(() =>
  Boolean(viewId.value),
)

// Categorías disponibles
const categories = ref<Category[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref('')
const hashtagInput = ref('')
const availableHashtags = ref<Hashtag[]>([])
const hashtagSearching = ref(false)

let hashtagSearchTimer:
  | ReturnType<typeof setTimeout>
  | undefined

// Estado principal del formulario
const form = reactive<ViewFormPayload>({
  categoryId: '',
  side: {
  title: '',
  description: '',
  sources: [
    {
      type: 'LINK',
      url: '',
      label: '',
    },
  ],
},
counterpart: {
  title: '',
  description: '',
  sources: [
    {
      type: 'LINK',
      url: '',
      label: '',
    },
  ],
},
  hashtags: [],
})

watch(
  form,
  () => {
    hasUnsavedChanges.value = true
  },
  {
    deep: true,
  },
)

// Guarda automáticamente el formulario como borrador
watch(
  form,
  (currentForm) => {
    // Los borradores solo se guardan
    // al crear una publicación nueva
    if (isEditMode.value) {
      return
    }

    saveViewDraft(
      JSON.parse(
        JSON.stringify(currentForm),
      ),
    )
  },
  {
    deep: true,
  },
)

// Recupera el borrador guardado
const restoreViewDraft = (): void => {
  if (isEditMode.value) {
    return
  }

  const draft = getViewDraft()

  if (!draft) {
    return
  }

  const shouldRestore = window.confirm(
    'Encontramos un borrador guardado. ¿Deseas restaurarlo?',
  )

  if (!shouldRestore) {
    clearViewDraft()
    return
  }

  form.categoryId =
    draft.form.categoryId

  form.side =
    draft.form.side

  form.counterpart =
    draft.form.counterpart

  form.hashtags =
    draft.form.hashtags ?? []
}

// Carga las categorías desde el API
const loadCategories = async (): Promise<void> => {
  categoriesLoading.value = true
  categoriesError.value = ''

  try {
    const response = await getCategories()

    categories.value = response.categories.filter(
      (category) => !category.deletedAt,
    )
  } catch (error) {
    if (error instanceof Error) {
      categoriesError.value = error.message
    } else {
      categoriesError.value =
        'No fue posible cargar las categorías.'
    }
  } finally {
    categoriesLoading.value = false
  }
}

// Busca hashtags existentes mientras
// el usuario escribe.
const loadHashtagSuggestions =
  async (
    query: string,
  ): Promise<void> => {
    const normalizedQuery =
      query
        .trim()
        .replace(/^#/, '')

    if (!normalizedQuery) {
      availableHashtags.value = []
      hashtagSearching.value = false
      return
    }

    hashtagSearching.value = true

    try {
      const response =
        await searchHashtags(
          normalizedQuery,
        )

      availableHashtags.value =
        response.hashtags.filter(
          (hashtag) =>
            !form.hashtags?.includes(
              hashtag.name,
            ),
        )
    } catch {
      availableHashtags.value = []
    } finally {
      hashtagSearching.value = false
    }
  }

// Debounce del autocomplete
watch(
  hashtagInput,
  (value) => {
    if (hashtagSearchTimer) {
      clearTimeout(
        hashtagSearchTimer,
      )
    }

    if (!value.trim()) {
      availableHashtags.value = []
      return
    }

    hashtagSearchTimer =
      setTimeout(() => {
        void loadHashtagSuggestions(
          value,
        )
      }, 300)
  },
)

// Agrega una nueva fuente a uno de los lados
const addSource = (
  side: 'side' | 'counterpart',
): void => {
  form[side].sources.push({
    type: 'LINK',
    url: '',
    label: '',
  })
}

// Elimina una fuente, manteniendo al menos una
const removeSource = (
  side: 'side' | 'counterpart',
  index: number,
): void => {
  if (form[side].sources.length <= 1) {
    return
  }

  form[side].sources.splice(index, 1)
}

// Agrega un hashtag al formulario
const addHashtag = (): void => {
  const hashtag = hashtagInput.value
    .trim()
    .replace(/^#/, '')
    .toLowerCase()

  if (!hashtag) {
    return
  }

  if ((form.hashtags?.length ?? 0) >= 10) {
    return
  }

  if (form.hashtags?.includes(hashtag)) {
    hashtagInput.value = ''
    return
  }

  form.hashtags?.push(hashtag)
  hashtagInput.value = ''
}

const handleHashtagKeydown = (
  event: KeyboardEvent,
): void => {
  if (
    event.key === 'Enter' ||
    event.key === ','
  ) {
    event.preventDefault()
    addHashtag()
  }
}

// Elimina un hashtag
const removeHashtag = (
  hashtag: string,
): void => {
  form.hashtags = form.hashtags?.filter(
    (item) => item !== hashtag,
  )
}

// Convierte una URL de YouTube
// en una URL válida para iframe.
const getYoutubeEmbedUrl = (
  value: string,
): string => {
  if (!value.trim()) {
    return ''
  }

  try {
    const url = new URL(
      value.trim(),
    )

    let videoId = ''

    if (
      url.hostname === 'youtu.be'
    ) {
      videoId =
        url.pathname
          .replace('/', '')
          .trim()
    }

    if (
      url.hostname.includes(
        'youtube.com',
      )
    ) {
      if (
        url.pathname === '/watch'
      ) {
        videoId =
          url.searchParams.get('v') ??
          ''
      }

      if (
        url.pathname.startsWith(
          '/shorts/',
        )
      ) {
        videoId =
          url.pathname
            .split('/')[2] ??
          ''
      }

      if (
        url.pathname.startsWith(
          '/embed/',
        )
      ) {
        videoId =
          url.pathname
            .split('/')[2] ??
          ''
      }
    }

    if (!videoId) {
      return ''
    }

    return `https://www.youtube.com/embed/${encodeURIComponent(
      videoId,
    )}`
  } catch {
    return ''
  }
}

// Valida que una URL use HTTP o HTTPS
const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value)

    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    )
  } catch {
    return false
  }
}

// Valida los campos obligatorios del formulario
const validateForm = (): boolean => {
  formError.value = ''
  clearFieldErrors()

  let isValid = true

  if (!form.categoryId) {
    fieldErrors.category =
      'Selecciona una categoría.'
    isValid = false
  }

  if (!form.side.title.trim()) {
    fieldErrors.sideTitle =
      'Ingresa el título del Lado A.'
    isValid = false
  }

  if (!form.side.description.trim()) {
  fieldErrors.sideDescription =
    'Ingresa la descripción del Lado A.'
  isValid = false
  } else if (
    form.side.description.trim().length < 100
  ) {
    fieldErrors.sideDescription =
      'La descripción del Lado A debe tener al menos 100 caracteres.'
    isValid = false
  }

  if (
    form.side.sources.some(
      (source) =>
        !source.url.trim() ||
        !isValidUrl(source.url.trim()),
    )
  ) {
    fieldErrors.sideSources =
      'Ingresa una URL válida en todas las fuentes del Lado A.'
    isValid = false
  }

  if (!form.counterpart.title.trim()) {
    fieldErrors.counterpartTitle =
      'Ingresa el título del Lado B.'
    isValid = false
  }

  if (
  !form.counterpart.description.trim()
) {
  fieldErrors.counterpartDescription =
    'Ingresa la descripción del Lado B.'
  isValid = false
  } else if (
    form.counterpart.description.trim().length < 100
  ) {
    fieldErrors.counterpartDescription =
      'La descripción del Lado B debe tener al menos 100 caracteres.'
    isValid = false
  }

  if (
    form.counterpart.sources.some(
      (source) =>
        !source.url.trim() ||
        !isValidUrl(source.url.trim()),
    )
  ) {
    fieldErrors.counterpartSources =
      'Ingresa una URL válida en todas las fuentes del Lado B.'
    isValid = false
  }

  if (
    (form.hashtags?.length ?? 0) > 10
  ) {
    fieldErrors.hashtags =
      'Solo puedes agregar hasta 10 hashtags.'
    isValid = false
  }

  if (!isValid) {
    formError.value =
      'Revise los campos marcados.'
  }

  return isValid
}

// Prepara los datos que se enviarán al API
const buildPayload = (): ViewFormPayload => ({
  categoryId: form.categoryId,

  side: {
    title: form.side.title.trim(),
    description: form.side.description.trim(),

    sources: form.side.sources.map(
      (source) => ({
        type: source.type,
        url: source.url.trim(),

        ...(source.label?.trim()
          ? {
              label: source.label.trim(),
            }
          : {}),
      }),
    ),
  },

  counterpart: {
    title: form.counterpart.title.trim(),
    description:
      form.counterpart.description.trim(),

    sources: form.counterpart.sources.map(
      (source) => ({
        type: source.type,
        url: source.url.trim(),

        ...(source.label?.trim()
          ? {
              label: source.label.trim(),
            }
          : {}),
      }),
    ),
  },

  ...(form.hashtags?.length
    ? {
        hashtags: [...form.hashtags],
      }
    : {}),
})

// Envía una nueva publicación al API
const submitForm = async (): Promise<void> => {
  if (submitting.value) {
    return
  }

  if (!validateForm()) {
    return
  }

  if (!authStore.token) {
    authStore.logout()
    await router.push('/login')
    return
  }

  submitting.value = true
  formError.value = ''

  try {
    const payload = buildPayload()

    if (isEditMode.value) {
    if (!viewId.value) {
      formError.value =
        'No se pudo identificar la publicación.'
      return
    }

    await updateView(
      viewId.value,
      payload,
      authStore.token,
    )

    hasUnsavedChanges.value = false

    toastStore.success(
      'Publicación actualizada correctamente.',
    )
  } else {
    await createView(
      payload,
      authStore.token,
    )

    clearViewDraft()

    hasUnsavedChanges.value = false

    toastStore.success(
      'Publicación creada correctamente.',
    )
  }

  await router.push('/')
  } catch (error) {
    if (
      error instanceof ViewEditorError &&
      (
        error.status === 400 ||
        error.status === 422
      )
    ) {
      clearFieldErrors()

      const apiFields =
        error.details?.fieldErrors

      if (apiFields) {
        if (apiFields.categoryId?.length) {
          fieldErrors.category =
            apiFields.categoryId.join(' ')
        }

        if (apiFields.side?.length) {
          fieldErrors.sideTitle =
            apiFields.side.join(' ')
        }

        if (apiFields.counterpart?.length) {
          fieldErrors.counterpartTitle =
            apiFields.counterpart.join(' ')
        }

        if (apiFields.hashtags?.length) {
          fieldErrors.hashtags =
            apiFields.hashtags.join(' ')
        }
      }
      formError.value = error.message
      return
    }
    if (
      error instanceof ViewEditorError &&
      error.status === 401
    ) {
      authStore.logout()
      await router.push('/login')
      return
    }

    if (error instanceof Error) {
      formError.value = error.message
    } else {
      formError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    submitting.value = false
  }
}

// Carga una publicación existente en el formulario
const loadExistingView = async (): Promise<void> => {
  if (
    !isEditMode.value ||
    !viewId.value
  ) {
    return
  }

  if (!authStore.token) {
    authStore.logout()
    await router.push('/login')
    return
  }

  loadingExistingView.value = true
  formError.value = ''

  try {
    const view = await getViewForEditing(
      viewId.value,
      authStore.token,
    )

    // Solo el autor o un SUPERADMIN pueden editar
    if (
      authStore.user &&
      view.authorId !== authStore.user.id &&
      authStore.user.role !== 'SUPERADMIN'
    ) {
      formError.value =
        'No tienes permiso para editar esta publicación.'

      await router.push('/')
      return
    }

    const sideA = view.sides.find(
      (side) => side.type === 'SIDE',
    )

    const sideB = view.sides.find(
      (side) =>
        side.type === 'COUNTERPART',
    )

    if (!sideA || !sideB) {
      formError.value =
        'La publicación no contiene ambas perspectivas.'
      return
    }

    form.categoryId = view.categoryId

    form.side.title = sideA.title
    form.side.description =
      sideA.description

    form.side.sources =
      sideA.sources.map((source) => ({
        type: source.type,
        url: source.url,
        label: source.label ?? '',
      }))

    form.counterpart.title = sideB.title
    form.counterpart.description =
      sideB.description

    form.counterpart.sources =
      sideB.sources.map((source) => ({
        type: source.type,
        url: source.url,
        label: source.label ?? '',
      }))

    form.hashtags = view.hashtags.map(
      (hashtag) => hashtag.name,
    )
    hasUnsavedChanges.value = false
  } catch (error) {
    if (
      error instanceof ViewEditorError &&
      error.status === 401
    ) {
      authStore.logout()
      await router.push('/login')
      return
    }

    if (error instanceof Error) {
      formError.value = error.message
    } else {
      formError.value =
        'No fue posible cargar la publicación.'
    }
  } finally {
    loadingExistingView.value = false
  }
}

const cancelForm = async (): Promise<void> => {
  if (hasUnsavedChanges.value) {
    const confirmed = window.confirm(
      'Tienes cambios sin guardar. ¿Seguro que deseas salir?',
    )

    if (!confirmed) {
      return
    }
  }

  await router.push('/')
}

onMounted(async () => {
  await loadCategories()

  if (isEditMode.value) {
    await loadExistingView()
  } else {
    restoreViewDraft()
  }
})

onBeforeUnmount(() => {
  if (hashtagSearchTimer) {
    clearTimeout(
      hashtagSearchTimer,
    )
  }
})
</script>

<template>
  <div class="editor-page">
    <AppNavbar />

    <main class="editor-container">
      <!-- Encabezado -->
      <header class="editor-header">
        <p class="editor-label">
          LAS DOS CARAS
        </p>

        <h1>
          {{
            isEditMode
              ? 'Editar publicación'
              : 'Crear publicación'
          }}
        </h1>

        <p class="editor-description">
          {{
            isEditMode
              ? 'Actualiza la información de tu publicación.'
              : 'Presenta dos perspectivas sobre un mismo tema.'
          }}
        </p>
      </header>

      <form
        class="editor-form"
        @submit.prevent="submitForm"
      >
        <!-- Categoría -->
        <section class="form-section">
          <div class="section-heading">
            <span class="section-number">
              01
            </span>

            <div>
              <h2>Categoría</h2>
              <p>
                Selecciona el tema principal de la publicación.
              </p>
            </div>
          </div>

          <div class="field">
            <label for="category">
              Categoría
            </label>

            <select
              id="category"
              v-model="form.categoryId"
              :disabled="categoriesLoading"
            >
              <option
                value=""
                disabled
              >
                {{
                  categoriesLoading
                    ? 'Cargando categorías...'
                    : 'Selecciona una categoría'
                }}
              </option>

              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <p
              v-if="fieldErrors.category"
              class="field-error"
              role="alert"
            >
              {{ fieldErrors.category }}
            </p>

            <p
              v-if="categoriesError"
              class="field-error"
              role="alert"
            >
              {{ categoriesError }}
            </p>
          </div>
        </section>

        <!-- Perspectivas -->
        <section class="form-section">
          <div class="section-heading">
            <span class="section-number">
              02
            </span>

            <div>
              <h2>Las dos perspectivas</h2>
              <p>
                Describe claramente ambos puntos de vista.
              </p>
            </div>
          </div>

          <div class="perspectives-grid">
            <!-- Lado A -->
            <article class="perspective-card side-a">
              <div class="perspective-label">
                <span class="side-dot"></span>
                LADO A
              </div>

              <div class="field">
                <label for="side-title">
                  Título
                </label>

                <input
                  id="side-title"
                  v-model.trim="form.side.title"
                  type="text"
                  maxlength="150"
                  placeholder="Título de la primera perspectiva"
                />

                <p
                  v-if="fieldErrors.sideTitle"
                  class="field-error"
                  role="alert"
                >
                  {{ fieldErrors.sideTitle }}
                </p>
              </div>

              <div class="field">
                <label for="side-description">
                  Descripción
                </label>

                <textarea
                  id="side-description"
                  v-model.trim="form.side.description"
                  rows="6"
                  placeholder="Explica esta perspectiva..."
                ></textarea>

                <p
                  v-if="fieldErrors.sideDescription"
                  class="field-error"
                  role="alert"
                >
                  {{ fieldErrors.sideDescription }}
                </p>
              </div>
            </article>

            <!-- Lado B -->
            <article class="perspective-card side-b">
              <div class="perspective-label">
                <span class="side-dot"></span>
                LADO B
              </div>

              <div class="field">
                <label for="counterpart-title">
                  Título
                </label>

                <input
                  id="counterpart-title"
                  v-model.trim="form.counterpart.title"
                  type="text"
                  maxlength="150"
                  placeholder="Título de la segunda perspectiva"
                />
                <p
                  v-if="fieldErrors.counterpartTitle"
                  class="field-error"
                  role="alert"
                >
                  {{ fieldErrors.counterpartTitle }}
                </p>
              </div>

              <div class="field">
                <label for="counterpart-description">
                  Descripción
                </label>

                <textarea
                  id="counterpart-description"
                  v-model.trim="form.counterpart.description"
                  rows="6"
                  placeholder="Explica la perspectiva contraria..."
                ></textarea>
                <p
                  v-if="fieldErrors.counterpartDescription"
                  class="field-error"
                  role="alert"
                >
                  {{ fieldErrors.counterpartDescription }}
                </p>
              </div>
            </article>
          </div>
        </section>

        <!-- Fuentes -->
        <section class="form-section">
        <div class="section-heading">
            <span class="section-number">
            03
            </span>

            <div>
            <h2>Fuentes</h2>
            <p>
                Agrega al menos una fuente para cada perspectiva.
            </p>
            </div>
        </div>

        <div class="sources-grid">
            <!-- Fuentes lado A -->
            <div class="sources-column">
            <h3>Fuentes del Lado A</h3>

            <p
              v-if="fieldErrors.sideSources"
              class="field-error"
              role="alert"
            >
              {{ fieldErrors.sideSources }}
            </p>
            <div
                v-for="(source, index) in form.side.sources"
                :key="`side-${index}`"
                class="source-card"
            >
                <div class="source-row">
                <div class="field">
                    <label>
                    Tipo
                    </label>

                    <select v-model="source.type">
                    <option value="LINK">
                        Enlace
                    </option>

                    <option value="YOUTUBE">
                        YouTube
                    </option>

                    <option value="DOCUMENT">
                        Documento
                    </option>
                    </select>
                </div>

                <button
                    class="remove-source"
                    type="button"
                    :disabled="
                      submitting ||
                      form.side.sources.length <= 1
                    "
                    aria-label="Eliminar fuente"
                    @click="removeSource('side', index)"
                >
                    ×
                </button>
                </div>

                <div class="field">
                <label>
                  URL
                </label>

                <input
                  v-model.trim="source.url"
                  type="url"
                  placeholder="https://..."
                />

                <div
                  v-if="
                    source.type === 'YOUTUBE' &&
                    getYoutubeEmbedUrl(source.url)
                  "
                  class="youtube-preview"
                >
                  <iframe
                    :src="
                      getYoutubeEmbedUrl(
                        source.url,
                      )
                    "
                    title="Vista previa de YouTube del Lado A"
                    loading="lazy"
                    allowfullscreen
                  ></iframe>
                </div>
              </div>

                <div class="field">
                <label>
                    Etiqueta opcional
                </label>

                <input
                    v-model.trim="source.label"
                    type="text"
                    placeholder="Ej. Estudio de UNESCO"
                />
                </div>
            </div>

            <button
                class="add-source"
                type="button"
                :disabled="submitting"
                @click="addSource('side')"
            >
                + Agregar fuente
            </button>
            </div>

            <!-- Fuentes lado B -->
            <div class="sources-column">
            <h3>Fuentes del Lado B</h3>

            <p
              v-if="fieldErrors.counterpartSources"
              class="field-error"
              role="alert"
            >
              {{ fieldErrors.counterpartSources }}
            </p>

            <div
                v-for="(source, index) in form.counterpart.sources"
                :key="`counterpart-${index}`"
                class="source-card"
            >
                <div class="source-row">
                <div class="field">
                    <label>
                    Tipo
                    </label>

                    <select v-model="source.type">
                    <option value="LINK">
                        Enlace
                    </option>

                    <option value="YOUTUBE">
                        YouTube
                    </option>

                    <option value="DOCUMENT">
                        Documento
                    </option>
                    </select>
                </div>

                <button
                    class="remove-source"
                    type="button"
                    :disabled="
                      submitting ||
                      form.counterpart.sources.length <= 1
                    "
                    aria-label="Eliminar fuente"
                    @click="
                    removeSource(
                        'counterpart',
                        index,
                    )
                    "
                >
                    ×
                </button>
                </div>

                <div class="field">
                <label>
                    URL
                </label>

                <input
                    v-model.trim="source.url"
                    type="url"
                    placeholder="https://..."
                />
                <div
                  v-if="
                    source.type === 'YOUTUBE' &&
                    getYoutubeEmbedUrl(source.url)
                  "
                  class="youtube-preview"
                >
                  <iframe
                    :src="
                      getYoutubeEmbedUrl(
                        source.url,
                      )
                    "
                    title="Vista previa de YouTube del Lado B"
                    loading="lazy"
                    allowfullscreen
                  ></iframe>
                </div>
                </div>

                <div class="field">
                <label>
                    Etiqueta opcional
                </label>

                <input
                    v-model.trim="source.label"
                    type="text"
                    placeholder="Ej. Informe oficial"
                />
                </div>
            </div>

                <button
                    class="add-source"
                    type="button"
                    :disabled="submitting"
                    @click="addSource('counterpart')"
                >
                    + Agregar fuente
                </button>
            </div>
        </div>
        </section>

        <!-- Hashtags -->
        <section class="form-section">
        <div class="section-heading">
            <span class="section-number">
            04
            </span>

            <div>
            <h2>Hashtags</h2>
            <p>
                Agrega hasta 10 etiquetas relacionadas.
            </p>
            </div>
        </div>

        <div class="hashtag-input-row">
            <div class="field">
            <label for="hashtag">
                Hashtag
            </label>

            <input
              id="hashtag"
              v-model="hashtagInput"
              type="text"
              list="available-hashtags"
              :placeholder="
                hashtagSearching
                  ? 'Buscando...'
                  : 'Ej. educación'
              "
              autocomplete="off"
              @keydown="handleHashtagKeydown"
            />

            <datalist id="available-hashtags">
              <option
                v-for="hashtag in availableHashtags"
                :key="hashtag.id"
                :value="hashtag.name"
              ></option>
            </datalist>
            </div>

            <button
            class="add-hashtag"
            type="button"
            :disabled="
              submitting ||
              (form.hashtags?.length ?? 0) >= 10
            "
            @click="addHashtag"
            >
            Agregar
            </button>
        </div>

        <div
            v-if="form.hashtags?.length"
            class="hashtags-list"
        >
            <button
            v-for="hashtag in form.hashtags"
            :key="hashtag"
            :disabled="submitting"
            class="hashtag-chip"
            type="button"
            :aria-label="`Eliminar hashtag ${hashtag}`"
            @click="removeHashtag(hashtag)"
            >
            #{{ hashtag }}
            <span>×</span>
            </button>
        </div>

        <p class="hashtag-count">
            {{ form.hashtags?.length ?? 0 }}/10
        </p>

        <p
          v-if="fieldErrors.hashtags"
          class="field-error"
          role="alert"
        >
          {{ fieldErrors.hashtags }}
        </p>
        </section>

        <!-- Acciones -->
        <section class="form-actions">
          <p
            v-if="formError"
            class="form-error"
            role="alert"
        >
            {{ formError }}
        </p>

        <div class="action-buttons">
            <button
              class="cancel-button"
              type="button"
              :disabled="submitting"
              @click="cancelForm"
            >
              Cancelar
            </button>

            <button
            class="submit-button"
            type="submit"
            :disabled="submitting"
            >
            {{
                submitting
                ? 'Publicando...'
                : isEditMode
                    ? 'Guardar cambios'
                    : 'Publicar'
            }}
            </button>
        </div>
        </section>
      </form>
    </main>
  </div>
</template>

<style scoped>
/* =========================
   MOBILE FIRST
   Base: móvil
   ========================= */

.editor-page {
  min-height: 100vh;
  background: #fafafa;
}

.editor-container {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 40px 16px 60px;
}

/* =========================
   Encabezado
   ========================= */

.editor-header {
  margin-bottom: 30px;
}

.editor-label {
  margin: 0 0 12px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
}

.editor-header h1 {
  margin: 0 0 10px;
  color: #18181b;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -1px;
}

.editor-description {
  margin: 0;
  color: #71717a;
  font-size: 16px;
  line-height: 1.6;
}

/* =========================
   Formulario
   ========================= */

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  padding: 20px;
  border: 1px solid #e8e7ef;
  border-radius: 18px;
  background: #ffffff;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 25px;
}

.section-number {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 10px;
  background: #f5f3ff;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
}

.section-heading h2 {
  margin: 0 0 4px;
  color: #18181b;
  font-size: 20px;
}

.section-heading p {
  margin: 0;
  color: #a1a1aa;
  font-size: 14px;
  line-height: 1.5;
}

/* =========================
   Campos
   ========================= */

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  color: #3f3f46;
  font-size: 14px;
  font-weight: 700;
}

.field input,
.field textarea,
.field select {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  outline: none;
  background: #fafafa;
  color: #18181b;
  font-family: inherit;
  font-size: 15px;
  transition: 0.2s ease;
}

.field textarea {
  resize: vertical;
  line-height: 1.6;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.1);
}

.field-error {
  margin: 0;
  color: #b91c1c;
  font-size: 13px;
}

/* =========================
   Perspectivas
   ========================= */

.perspectives-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.perspective-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border: 1px solid #e8e7ef;
  border-radius: 14px;
}

.side-a {
  background: #fafaff;
}

.side-b {
  background: #fafafa;
}

.perspective-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #71717a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.3px;
}

.side-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.side-a .side-dot {
  background: #7c3aed;
}

.side-b .side-dot {
  background: #18181b;
}

/* =========================
   Fuentes
   ========================= */

.sources-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.sources-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sources-column h3 {
  margin: 0;
  color: #3f3f46;
  font-size: 16px;
}

.source-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e8e7ef;
  border-radius: 12px;
  background: #fafafa;
}

.source-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 10px;
}

.remove-source {
  width: 40px;
  height: 40px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #71717a;
  font-size: 20px;
  cursor: pointer;
}

.remove-source:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.add-source {
  align-self: flex-start;
  padding: 10px 14px;
  border: 1px dashed #c4b5fd;
  border-radius: 9px;
  background: #faf9ff;
  color: #6d28d9;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

/* =========================
   Hashtags
   ========================= */

.hashtag-input-row {
  display: grid;
  grid-template-columns: 1fr;
  align-items: end;
  gap: 12px;
}

.add-hashtag {
  width: 100%;
  min-height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 9px;
  background: #7c3aed;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.add-hashtag:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.hashtags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.hashtag-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: none;
  border-radius: 20px;
  background: #f5f3ff;
  color: #6d28d9;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.hashtag-count {
  margin: 10px 0 0;
  color: #a1a1aa;
  font-size: 13px;
}

/* =========================
   Acciones
   ========================= */

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 0 0;
}

.form-error {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
}

.cancel-button,
.submit-button {
  width: 100%;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.cancel-button {
  border: 1px solid #e4e4e7;
  background: #ffffff;
  color: #52525b;
}

.submit-button {
  border: none;
  background: #7c3aed;
  color: #ffffff;
}

.cancel-button:disabled,
.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.submit-button:hover:not(:disabled) {
  background: #6d28d9;
}

/* =========================
   TABLET
   ========================= */

@media (min-width: 701px) {
  .editor-container {
    max-width: 1180px;
    padding: 50px 24px 70px;
  }

  .editor-header h1 {
    font-size: 36px;
  }

  .form-section {
    padding: 26px;
  }

  .perspective-card {
    padding: 22px;
  }

  .hashtag-input-row {
    grid-template-columns: 1fr auto;
  }

  .add-hashtag {
    width: auto;
    min-width: 120px;
  }

  .action-buttons {
    flex-direction: row;
    justify-content: flex-end;
  }

  .cancel-button,
  .submit-button {
    width: auto;
  }
}

/* =========================
   TABLET GRANDE / LAPTOP
   ========================= */

@media (min-width: 900px) {
  .perspectives-grid {
    grid-template-columns: 1fr 1fr;
  }

  .sources-grid {
    grid-template-columns: 1fr 1fr;
  }

  .form-section {
    padding: 28px;
  }
}

/* =========================
   ESCRITORIO
   ========================= */

@media (min-width: 1200px) {
  .editor-container {
    max-width: 1450px;
    padding: 60px 32px 80px;
  }

  .editor-header h1 {
    font-size: 38px;
  }
}

/* =========================
   PANTALLAS GRANDES
   ========================= */

@media (min-width: 1600px) {
  .editor-container {
    max-width: 1500px;
  }
}

/* =========================
   Tema oscuro
   ========================= */

:global(html[data-theme='dark'] .editor-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .editor-header h1) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .editor-description) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .form-section) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .section-number) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .section-heading h2) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .section-heading p) {
  color: #71717a;
}

:global(html[data-theme='dark'] .field label) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .field input),
:global(html[data-theme='dark'] .field textarea),
:global(html[data-theme='dark'] .field select) {
  border-color: #343447;
  background: #1b1b2d;
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .field input:focus),
:global(html[data-theme='dark'] .field textarea:focus),
:global(html[data-theme='dark'] .field select:focus) {
  border-color: #8b5cf6;
  background: #202033;
}

:global(html[data-theme='dark'] .perspective-card) {
  border-color: #29293d;
}

:global(html[data-theme='dark'] .side-a) {
  background: #1d1b31;
}

:global(html[data-theme='dark'] .side-b) {
  background: #1b1b2d;
}

:global(html[data-theme='dark'] .perspective-label) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .side-b .side-dot) {
  background: #d4d4d8;
}

:global(html[data-theme='dark'] .sources-column h3) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .source-card) {
  border-color: #29293d;
  background: #1b1b2d;
}

:global(html[data-theme='dark'] .remove-source) {
  border-color: #343447;
  background: #202033;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .add-source) {
  border-color: #6d5aa8;
  background: #211d37;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .hashtag-chip) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .form-error) {
  border-color: #7f1d1d;
  background: #2a171d;
  color: #fca5a5;
}

:global(html[data-theme='dark'] .cancel-button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

/* =========================
   Preview de YouTube
   ========================= */

.youtube-preview {
  width: 100%;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: #18181b;
  aspect-ratio: 16 / 9;
}

.youtube-preview iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

:global(
  html[data-theme='dark']
  .youtube-preview
) {
  border-color: #343447;
}
</style>