# Las Dos Caras

Las Dos Caras es una aplicación web desarrollada como proyecto para el curso de Programación en Ambiente Web I.

La aplicación permite publicar y consultar diferentes perspectivas sobre un mismo tema, organizando cada publicación en dos puntos de vista: **Lado A** y **Lado B**.

El frontend fue desarrollado como una SPA utilizando Vue 3 y TypeScript, consumiendo los servicios proporcionados por la API del proyecto.

---

## Tecnologías utilizadas

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- HTML5
- CSS3
- Fetch API
- LocalStorage
- JWT para autenticación

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/kristel-rgb/LasDosCaras.git
```

### 2. Entrar al proyecto

```bash
cd LasDosCaras
```

### 3. Instalar las dependencias

```bash
npm install
```

### 4. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto.

```env
VITE_API_URL=http://localhost:3000
```

La dirección debe corresponder con la URL donde se encuentre ejecutándose el backend.

### 5. Ejecutar el proyecto

```bash
npm run dev
```

Por defecto, Vite ejecutará el frontend en:

```text
http://localhost:5173
```

---

# Funcionalidades principales

## Autenticación

La aplicación cuenta con un sistema de autenticación basado en JWT.

Se implementaron las siguientes funciones:

- Registro de usuarios.
- Activación de cuenta.
- Inicio de sesión.
- Cierre de sesión.
- Persistencia de sesión.
- Protección de rutas autenticadas.
- Protección de rutas exclusivas para SUPERADMIN.
- Redirección a la página 403 cuando el usuario no posee los permisos necesarios.
- Redirección cuando una sesión expira.
- Bloqueo de las pantallas de login y registro cuando ya existe una sesión activa.

---

## Tablero principal

El tablero muestra las publicaciones disponibles y permite navegar entre los diferentes puntos de vista publicados.

Incluye:

- Listado de publicaciones.
- Filtrado por categoría.
- Filtrado por hashtag.
- Buscador de hashtags con sugerencias.
- Visualización del hashtag activo.
- Eliminación del filtro de hashtag.
- Ordenamiento por publicaciones recientes, likes o dislikes.
- Persistencia de filtros.
- Sincronización de filtros con parámetros de la URL.
- Restauración de filtros al recargar la página.
- Paginación mediante el botón **Cargar más**.
- Conteo de publicaciones.

Las publicaciones se presentan en una sola columna para conservar una lectura clara de las dos perspectivas de cada publicación.

---

## Categorías

Cada categoría cuenta con una vista donde se muestran únicamente las publicaciones relacionadas con ella.

Esta pantalla permite:

- Consultar las publicaciones de una categoría.
- Filtrar por hashtag.
- Buscar hashtags mediante sugerencias.
- Ordenar por recientes, likes o dislikes.
- Mantener los filtros mediante parámetros de la URL.
- Consultar el número de publicaciones.
- Cargar más resultados.
- Navegar mediante breadcrumb.

La navegación muestra una estructura similar a:

```text
Inicio > Categorías > Nombre de la categoría
```

---

## Crear y editar publicaciones

Los usuarios autenticados pueden crear publicaciones utilizando las dos perspectivas requeridas por la aplicación.

Cada publicación contiene:

- Lado A.
- Lado B.
- Título de cada perspectiva.
- Argumento de cada perspectiva.
- Categoría.
- Hashtags.
- Fuentes.

Los argumentos de ambas perspectivas requieren un mínimo de 100 caracteres.

Los hashtags pueden agregarse utilizando **Enter** o una **coma**, y se muestran posteriormente como etiquetas removibles.

También se implementó búsqueda de hashtags existentes con debounce para evitar realizar una petición al servidor en cada pulsación.

---

## Fuentes y YouTube

Cada perspectiva puede incluir fuentes relacionadas con el argumento presentado.

Cuando se agrega una URL válida de YouTube, la aplicación muestra una vista previa del video directamente en el formulario.

Se reconocen diferentes formatos de URL de YouTube, incluyendo:

- `youtube.com/watch`
- `youtu.be`
- `youtube.com/shorts`
- `youtube.com/embed`

La vista previa está disponible tanto para las fuentes del Lado A como para las del Lado B.

---

## Borradores

Durante la creación de una publicación se utiliza almacenamiento local para conservar temporalmente la información del formulario.

Esto permite recuperar el contenido cuando existe un borrador disponible y evitar perder el trabajo realizado antes de publicar.

Al completar correctamente la creación de la publicación, el borrador correspondiente se elimina.

---

## Cambios sin guardar

Al intentar abandonar o cancelar un formulario que contiene modificaciones sin guardar, la aplicación solicita confirmación antes de descartar la información.

Esto ayuda a evitar la pérdida accidental del contenido escrito por el usuario.

---

## Buscador global

La barra de navegación incluye un buscador global.

El buscador permite localizar contenido dentro de la aplicación y utiliza un debounce de aproximadamente 300 ms antes de realizar la consulta.

También permite:

- Mostrar resultados desde la barra de navegación.
- Ejecutar la búsqueda con Enter.
- Navegar a la página completa de resultados.
- Mantener el buscador funcional en las diferentes vistas de la aplicación.
- Mostrar errores controlados cuando la búsqueda no puede completarse.

La página completa de resultados utiliza una URL similar a:

```text
/search?q=termino
```

---

## Favoritos

Los usuarios autenticados pueden agregar y eliminar publicaciones de favoritos.

La información se sincroniza entre:

- API.
- Tarjetas de publicaciones.
- Detalle de publicación.
- Perfil del usuario.
- LocalStorage.

El almacenamiento local permite mantener una representación rápida del estado de favoritos, mientras que la API conserva la información asociada al usuario.

Al cerrar sesión se elimina la información local de la sesión, pero los favoritos almacenados en el servidor continúan asociados a la cuenta.

---

## Perfil

La aplicación cuenta con una pantalla de perfil para el usuario autenticado.

Desde esta sección se puede acceder a información relacionada con:

- Datos del usuario.
- Mis publicaciones.
- Mis favoritos.
- Historial de publicaciones consultadas.

El historial se mantiene localmente y evita almacenar entradas duplicadas innecesariamente.

---

## Detalle de publicación

Cada publicación posee una pantalla de detalle donde pueden consultarse ambas perspectivas y sus fuentes.

Esta pantalla incluye:

- Información del autor.
- Categoría.
- Hashtags.
- Lado A y Lado B.
- Fuentes.
- Reacciones.
- Favoritos.
- Hilos de comentarios.
- Respuestas.
- Funciones de administración cuando corresponden.

Los hilos de comentarios pueden expandirse y contraerse para facilitar su lectura.

También se incluye una advertencia visible relacionada con el proceso de moderación automatizada.

---

## Compartir publicaciones

Las publicaciones pueden compartirse utilizando las funciones disponibles en el navegador.

Cuando Web Share API está disponible se utiliza el sistema de compartir del dispositivo. En otros casos se utiliza una alternativa compatible para compartir o copiar el enlace.

---

# Administración

Las funciones administrativas están disponibles únicamente para usuarios con rol **SUPERADMIN**.

## Gestión de usuarios

Permite consultar y administrar los usuarios registrados.

Entre las acciones disponibles se encuentran:

- Consultar usuarios.
- Suspender usuarios.
- Reactivar usuarios.
- Controlar errores de permisos.
- Controlar usuarios inexistentes.
- Evitar que el administrador suspenda accidentalmente su propia cuenta.

---

## Gestión de categorías

La aplicación incluye una sección administrativa para gestionar las categorías soportadas por la API.

Las operaciones disponibles dependen de las funciones proporcionadas por el backend.

---

## Moderación de publicaciones

Los administradores pueden gestionar publicaciones desde la sección de moderación.

Entre las acciones disponibles se encuentra la posibilidad de despublicar y volver a publicar contenido cuando el backend permite dicha operación.

---

# Caché y LocalStorage

La aplicación utiliza almacenamiento local y un sistema centralizado de caché para mejorar la experiencia de navegación.

Se manejan datos almacenados relacionados con:

- Sesión.
- Favoritos.
- Filtros.
- Historial.
- Borradores.
- Categorías.
- Hashtags.
- Publicaciones.

Los datos almacenados en caché utilizan tiempos de expiración dependiendo del tipo de información.

Por ejemplo:

- Categorías: aproximadamente 1 hora.
- Hashtags: aproximadamente 30 minutos.
- Algunos listados de publicaciones utilizan tiempos menores para evitar conservar información desactualizada durante demasiado tiempo.

---

# Funcionamiento sin conexión y resiliencia

La aplicación posee mecanismos para manejar problemas de conexión con el servidor.

Cuando existen datos previamente almacenados, estos pueden utilizarse como respaldo si el API no se encuentra disponible.

En este caso se muestra un aviso indicando:

```text
Mostrando información guardada — sin conexión al servidor.
```

Este comportamiento también puede utilizarse cuando existe conexión a Internet pero el backend temporalmente no responde.

Cuando se recupera la conexión, la aplicación puede invalidar información almacenada y solicitar nuevamente datos actualizados.

---

## Manejo de errores HTTP

Las peticiones HTTP utilizan un manejo centralizado para controlar diferentes situaciones.

Entre los estados manejados se encuentran:

- `400` – Solicitud incorrecta.
- `401` – Sesión inválida o expirada.
- `403` – Usuario sin permisos.
- `404` – Recurso no encontrado.
- `409` – Conflicto, por ejemplo un correo ya registrado.
- `422` – Error de validación.
- `500` – Error interno del servidor.
- `502` y `503` – Problemas temporales del servidor.

Cuando corresponde, los errores de formularios se muestran junto al campo relacionado.

Las operaciones de escritura también se bloquean cuando la aplicación detecta que se encuentra sin conexión.

Para determinadas consultas GET se utiliza un reintento cuando ocurre un fallo de red.

---

# Diseño responsive

La interfaz fue desarrollada siguiendo un enfoque Mobile First.

Se realizaron adaptaciones para:

- Teléfonos.
- Tablets.
- Laptops.
- Monitores de escritorio.
- Pantallas de mayor tamaño.

Los componentes reorganizan su contenido dependiendo del espacio disponible sin modificar la funcionalidad principal.

---

# Tema claro y oscuro

La aplicación permite utilizar tema claro y oscuro.

Los principales componentes y pantallas poseen estilos adaptados para mantener:

- Legibilidad.
- Contraste.
- Consistencia visual.
- Estados interactivos visibles.

---

# Accesibilidad

Se incorporaron prácticas básicas de accesibilidad, entre ellas:

- Etiquetas asociadas a campos de formulario.
- Uso de atributos ARIA donde corresponde.
- `aria-expanded` en elementos expandibles.
- Textos alternativos y etiquetas descriptivas.
- Navegación mediante elementos HTML semánticos.
- Estados visibles de interacción.

---

# Rutas principales

Algunas de las rutas utilizadas por la aplicación son:

| Ruta | Descripción |
|---|---|
| `/` | Tablero principal |
| `/login` | Inicio de sesión |
| `/register` | Registro |
| `/categories/:id` | Publicaciones de una categoría |
| `/search` | Resultados de búsqueda |
| `/profile` | Perfil del usuario |
| `/403` | Acceso denegado |
| `/404` | Página no encontrada |

También existen rutas adicionales para detalle, creación, edición y administración.

---

# Estructura general

```text
src/
├── components/
├── models/
├── router/
├── services/
├── stores/
├── utils/
├── views/
├── App.vue
└── main.ts
```

### `components`

Contiene componentes reutilizables como la barra de navegación, tarjetas de publicaciones y notificaciones.

### `views`

Contiene las diferentes pantallas de la aplicación.

### `services`

Contiene la comunicación con el API y la lógica relacionada con las peticiones HTTP.

### `stores`

Contiene los estados globales administrados mediante Pinia.

### `router`

Contiene las rutas y protecciones de navegación.

### `utils`

Contiene funciones auxiliares, incluyendo herramientas relacionadas con red, caché y almacenamiento.

---

# Scripts disponibles

Ejecutar el proyecto en desarrollo:

```bash
npm run dev
```

Verificar tipos de TypeScript:

```bash
npm run type-check
```

Ejecutar revisión de código:

```bash
npm run lint
```

Generar la versión de producción:

```bash
npm run build
```

---

# Verificación del proyecto

Antes de realizar la integración final se verificó la compilación de producción mediante:

```bash
npm run build
```

La construcción final fue completada correctamente utilizando Vite y la verificación de TypeScript.

---

# Limitaciones de la API proporcionada

Durante el desarrollo se identificaron dos funcionalidades que no pudieron implementarse completamente debido a las operaciones y datos disponibles en la API proporcionada.

## Título general de la publicación

El enunciado contempla un título general para la publicación. Sin embargo, la API proporcionada no dispone de un campo para almacenar dicho título.

La estructura disponible permite almacenar los títulos correspondientes al Lado A y al Lado B, pero no un título general adicional. Por esta razón, no se agregó un campo en el frontend que no pudiera persistirse correctamente mediante la API.

## Publicaciones propias no publicadas

El frontend permite solicitar las publicaciones correspondientes al usuario autenticado. Sin embargo, durante las pruebas se comprobó que la API no devuelve las publicaciones propias que se encuentran en estado `UNPUBLISHED`.

Por esta razón, no es posible mostrar correctamente las publicaciones propias despublicadas desde el frontend sin realizar modificaciones en la API.

---

# Integrantes

- Kristel Yuridia Bravo Rivera
- Lary Fabiana Diaz Artavia

---

# Curso

**ISW-521 – Programación en Ambiente Web I**
