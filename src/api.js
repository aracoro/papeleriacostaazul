/*
 * Cliente de la API de Papelería Costa Azul.
 *
 * Verbos (convención del profesor):
 *   GET = consultar · POST = actualizar · PUT = crear · DELETE = eliminar
 *
 * Todas las peticiones llevan el token de sesión en el encabezado
 * Authorization. La API valida el token y el rol en el servidor.
 */
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const SESSION_KEY = 'authSession';
const USER_KEY = 'authUser';

/* =========================
   SESIÓN LOCAL
========================= */

export function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveSession(user, session) {
  if (user && session) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    clearSession();
  }
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
  // Claves que usaba la versión anterior
  ['auth_user', 'user', 'session_user', 'session'].forEach((k) => localStorage.removeItem(k));
}

/* =========================
   PETICIONES
========================= */

function query(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.set(key, value);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

async function apiRequest(path, { method = 'GET', body, raw = false } = {}) {
  const isFormData = body instanceof FormData;
  const token = getSavedSession()?.token;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (raw && response.ok) return response;

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      // Sesión vencida: se limpia y se manda al login
      clearSession();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    const message =
      (typeof payload === 'object' && payload?.error) ||
      (typeof payload === 'string' && payload) ||
      `Error HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

/** Envuelve una llamada para devolver { data, error } como el resto de la app */
async function wrap(fn, fallback) {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    console.error(fallback, error);
    return { data: null, error: error instanceof Error ? error : new Error(fallback) };
  }
}

/* =========================
   AUTENTICACIÓN
========================= */

export async function loginUser(email, password) {
  return wrap(() => apiRequest('/auth/login', { method: 'POST', body: { email, password } }), 'No se pudo iniciar sesión');
}

/** Revalida en el servidor la sesión guardada (rol y estado actuales). */
export async function getUserProfile() {
  if (!getSavedSession()?.token) return { data: null, error: null };
  return wrap(() => apiRequest('/auth/me'), 'No se pudo recuperar la sesión');
}

/* =========================
   IMÁGENES
========================= */

export async function uploadProductoImagen(file) {
  return wrap(async () => {
    if (!file) throw new Error('Archivo de imagen requerido');
    const formData = new FormData();
    formData.append('file', file);
    const payload = await apiRequest('/upload', { method: 'PUT', body: formData });
    const rawUrl = payload.url || payload.path;
    if (!rawUrl) throw new Error('El servidor no devolvió URL');
    return rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
  }, 'No se pudo subir la imagen');
}

/* =========================
   PRODUCTOS
========================= */

export async function getProductos() {
  return wrap(async () => (await apiRequest('/productos')).data || [], 'No se pudieron obtener los productos');
}

export async function getProductosPaginado({ page = 1, pageSize = 10, q = '', stockFilter = 'todos', estado = '' }) {
  try {
    const payload = await apiRequest(`/productos${query({ page, pageSize, q, stockFilter, estado })}`);
    return { data: payload.data || [], total: payload.total || 0, error: null };
  } catch (error) {
    console.error('Error obteniendo productos', error);
    return { data: null, total: 0, error };
  }
}

export async function crearProducto(payload) {
  return wrap(async () => (await apiRequest('/productos', { method: 'PUT', body: payload })).data, 'No se pudo crear el producto');
}

export async function actualizarProducto(id, updates) {
  return wrap(async () => (await apiRequest(`/productos/${id}`, { method: 'POST', body: updates })).data, 'No se pudo actualizar el producto');
}

export async function eliminarProducto(id) {
  return wrap(() => apiRequest(`/productos/${id}`, { method: 'DELETE' }), 'No se pudo eliminar el producto');
}

/* =========================
   PROVEEDORES
========================= */

export async function getProveedores() {
  return wrap(async () => (await apiRequest('/proveedores')).data || [], 'No se pudieron obtener los proveedores');
}

export async function crearProveedor(payload) {
  return wrap(async () => (await apiRequest('/proveedores', { method: 'PUT', body: payload })).data, 'No se pudo crear el proveedor');
}

export async function actualizarProveedor(id, payload) {
  return wrap(() => apiRequest(`/proveedores/${id}`, { method: 'POST', body: payload }), 'No se pudo actualizar el proveedor');
}

export async function eliminarProveedor(id) {
  return wrap(() => apiRequest(`/proveedores/${id}`, { method: 'DELETE' }), 'No se pudo eliminar el proveedor');
}

export async function getProveedorProductos(proveedorId) {
  return wrap(
    async () => (await apiRequest(`/proveedor-productos${query({ proveedor_id: proveedorId })}`)).data || [],
    'No se pudieron obtener los productos del proveedor'
  );
}

/* =========================
   COMPRAS
========================= */

export async function getCompras() {
  return wrap(async () => (await apiRequest('/compras')).data || [], 'No se pudieron obtener las compras');
}

export async function registrarCompra(payload) {
  return wrap(() => apiRequest('/compras', { method: 'PUT', body: payload }), 'No se pudo registrar la compra');
}

/* =========================
   VENTAS
========================= */

export async function getVentasPorRango(desde = '', hasta = '') {
  return wrap(async () => (await apiRequest(`/ventas${query({ desde, hasta })}`)).data || [], 'No se pudieron obtener las ventas');
}

export async function getVentaDetalle(folio) {
  return wrap(async () => (await apiRequest(`/ventas/${folio}`)).data, 'No se pudo obtener el detalle de la venta');
}

export async function registrarVenta(payload) {
  return wrap(async () => (await apiRequest('/ventas', { method: 'PUT', body: payload })).data, 'No se pudo registrar la venta');
}

/* =========================
   DEVOLUCIONES
========================= */

export async function getDevoluciones() {
  return wrap(async () => (await apiRequest('/devoluciones')).data || [], 'No se pudieron obtener las devoluciones');
}

export async function getDevolucionesPorVenta(ventaId) {
  return wrap(async () => (await apiRequest(`/devoluciones/venta/${ventaId}`)).data || [], 'No se pudieron obtener las devoluciones');
}

export async function registrarDevolucion(payload) {
  return wrap(async () => (await apiRequest('/devoluciones', { method: 'PUT', body: payload })).data, 'No se pudo registrar la devolución');
}

/* =========================
   USUARIOS (administrador)
========================= */

export async function getUsuarios() {
  return wrap(async () => (await apiRequest('/usuarios')).data || [], 'No se pudieron obtener los usuarios');
}

export async function createUsuario({ nombre, correo, rol, password }) {
  return wrap(
    async () => (await apiRequest('/usuarios', { method: 'PUT', body: { nombre, correo, rol, password } })).data,
    'No se pudo crear el usuario'
  );
}

export async function actualizarUsuario(id, cambios) {
  return wrap(async () => (await apiRequest(`/usuarios/${id}`, { method: 'POST', body: cambios })).data, 'No se pudo actualizar el usuario');
}

export async function eliminarUsuario(id) {
  return wrap(() => apiRequest(`/usuarios/${id}`, { method: 'DELETE' }), 'No se pudo eliminar el usuario');
}

/* =========================
   RESPALDO (administrador)
========================= */

/** Descarga el respaldo .sql de la base de datos de TiDB. */
export async function descargarRespaldo() {
  return wrap(async () => {
    const response = await apiRequest('/respaldo', { raw: true });
    const disposition = response.headers.get('content-disposition') || '';
    const nombre = disposition.match(/filename="([^"]+)"/)?.[1] || 'respaldo_papeleria.sql';
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return {
      nombre,
      tamano: blob.size,
      tablas: Number(response.headers.get('x-respaldo-tablas') || 0),
      filas: Number(response.headers.get('x-respaldo-filas') || 0),
    };
  }, 'No se pudo generar el respaldo');
}
