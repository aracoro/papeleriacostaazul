import React, { useEffect, useState } from 'react';
import {
  getProductosPaginado,
  crearProducto,
  actualizarProducto,
  uploadProductoImagen,
  eliminarProducto,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { puedeEscribir } from '../roles';

const emptyProducto = {
  id: '',
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  estado: 'activo',
  categoria: '',
  marca: '',
  presentacion: '',
  unidad: 'pieza',
  precio_venta: '',
  costo_promedio: '',
  stock: '',
  stock_minimo: '',
  imagen: '',
};

function ProductsPage() {
  const { user } = useAuth();
  const editable = puedeEscribir(user);
  const [productos, setProductos] = useState([]);
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [filterStock, setFilterStock] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [formNuevo, setFormNuevo] = useState(emptyProducto);
  const [fileNuevo, setFileNuevo] = useState(null);
  const [formEdit, setFormEdit] = useState(emptyProducto);
  const [fileEdit, setFileEdit] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    cargarProductos(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStock, filterEstado]);

  const cargarProductos = async (targetPage = page) => {
    setLoading(true);
    setError('');

    const { data, total: count, error: err } = await getProductosPaginado({
      page: targetPage,
      pageSize,
      q: query,
      stockFilter: filterStock,
      estado: filterEstado === 'todos' ? '' : filterEstado,
    });

    if (err) {
      setError('No se pudieron cargar los productos.');
      setProductos([]);
      setTotal(0);
    } else {
      setProductos(data || []);
      setTotal(count || 0);
    }

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    cargarProductos(1);
  };

  const handleFilterStock = (valor) => {
    setFilterStock(valor);
    setPage(1);
  };

  const handleFilterEstado = (e) => {
    setFilterEstado(e.target.value);
    setPage(1);
  };

  const handleNuevoChange = (e) => {
    const { name, value } = e.target;
    setFormNuevo((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormEdit((prev) => ({ ...prev, [name]: value }));
  };

  const limpiarMensajes = () => {
    setError('');
    setMensaje({ tipo: '', texto: '' });
  };

  const resetCrear = () => {
    setFormNuevo(emptyProducto);
    setFileNuevo(null);
  };

  const resetEditar = () => {
    setFormEdit(emptyProducto);
    setFileEdit(null);
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formNuevo.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'El nombre del producto es obligatorio.' });
      return;
    }

    let imagenFinal = formNuevo.imagen?.trim() || null;

    if (fileNuevo) {
      const { data, error: uploadError } = await uploadProductoImagen(fileNuevo);
      if (uploadError) {
        setMensaje({
          tipo: 'error',
          texto: `No se pudo subir la imagen: ${uploadError.message || uploadError}`,
        });
        return;
      }
      imagenFinal = data;
    }

    const payload = {
      nombre: formNuevo.nombre.trim(),
      categoria: formNuevo.categoria?.trim() || null,
      marca: formNuevo.marca?.trim() || null,
      presentacion: formNuevo.presentacion?.trim() || null,
      sku: formNuevo.codigo_barras?.trim() || null,
      codigo_barras: formNuevo.codigo_barras?.trim() || null,
      descripcion: formNuevo.descripcion?.trim() || null,
      unidad: formNuevo.unidad?.trim() || 'pieza',
      precio_venta: formNuevo.precio_venta ? Number(formNuevo.precio_venta) : 0,
      costo_promedio: formNuevo.costo_promedio ? Number(formNuevo.costo_promedio) : 0,
      stock: formNuevo.stock ? Number(formNuevo.stock) : 0,
      stock_minimo: formNuevo.stock_minimo ? Number(formNuevo.stock_minimo) : 0,
      imagen: imagenFinal,
      estado: formNuevo.estado || 'activo',
    };

    const { error: err } = await crearProducto(payload);

    if (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo crear el producto.' });
      return;
    }

    setMensaje({ tipo: 'success', texto: 'Producto creado.' });
    resetCrear();
    cargarProductos(page);
  };

  const buscarParaEditar = async () => {
    limpiarMensajes();

    if (!formEdit.codigo_barras.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un código para buscar.' });
      return;
    }

    const { data, error: err } = await getProductosPaginado({
      page: 1,
      pageSize: 50,
      q: formEdit.codigo_barras.trim(),
      stockFilter: 'todos',
      estado: '',
    });

    if (err || !data?.length) {
      setMensaje({ tipo: 'error', texto: 'No se encontró producto con ese código.' });
      return;
    }

    const exacto =
      data.find(
        (p) => String(p.codigo_barras || '').trim() === formEdit.codigo_barras.trim()
      ) || data[0];

    setFormEdit({
      id: exacto.id || '',
      codigo_barras: exacto.codigo_barras || '',
      nombre: exacto.nombre || '',
      descripcion: exacto.descripcion || '',
      estado: exacto.estado || 'activo',
      categoria: exacto.categoria || '',
      marca: exacto.marca || '',
      presentacion: exacto.presentacion || '',
      unidad: exacto.unidad || 'pieza',
      precio_venta: exacto.precio_venta ?? '',
      costo_promedio: exacto.costo_promedio ?? '',
      stock: exacto.stock ?? '',
      stock_minimo: exacto.stock_minimo ?? '',
      imagen: exacto.imagen || '',
    });
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formEdit.id) {
      setMensaje({ tipo: 'error', texto: 'Debes buscar un producto antes de guardar.' });
      return;
    }

    let imagenFinal = formEdit.imagen?.trim() || null;

    if (fileEdit) {
      const { data, error: uploadError } = await uploadProductoImagen(fileEdit);
      if (uploadError) {
        setMensaje({
          tipo: 'error',
          texto: `No se pudo subir la imagen: ${uploadError.message || uploadError}`,
        });
        return;
      }
      imagenFinal = data;
    }

    const updates = {
      nombre: formEdit.nombre.trim(),
      descripcion: formEdit.descripcion?.trim() || null,
      estado: formEdit.estado || 'activo',
      categoria: formEdit.categoria?.trim() || null,
      marca: formEdit.marca?.trim() || null,
      presentacion: formEdit.presentacion?.trim() || null,
      unidad: formEdit.unidad?.trim() || 'pieza',
      precio_venta: formEdit.precio_venta ? Number(formEdit.precio_venta) : 0,
      costo_promedio: formEdit.costo_promedio ? Number(formEdit.costo_promedio) : 0,
      stock: formEdit.stock ? Number(formEdit.stock) : 0,
      stock_minimo: formEdit.stock_minimo ? Number(formEdit.stock_minimo) : 0,
      imagen: imagenFinal,
      codigo_barras: formEdit.codigo_barras?.trim() || null,
    };

    const { error: err } = await actualizarProducto(formEdit.id, updates);

    if (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo actualizar el producto.' });
      return;
    }

    setMensaje({ tipo: 'success', texto: 'Producto actualizado.' });
    cargarProductos(page);
  };

  const handleEliminar = async (p) => {
    limpiarMensajes();
    if (!window.confirm(`¿Eliminar el producto "${p.nombre}"?`)) return;
    const { error: err } = await eliminarProducto(p.id);
    if (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo eliminar el producto.' });
      return;
    }
    setMensaje({ tipo: 'success', texto: 'Producto eliminado.' });
    cargarProductos(page);
  };

  const paginar = (delta) => {
    const next = Math.min(Math.max(1, page + delta), totalPages || 1);
    setPage(next);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventario</p>
          <h2>Productos</h2>
          <p className="muted">Consulta los artículos disponibles de Papelería Costa Azul.</p>
        </div>
        <div className="btn-group">
          <button className={`btn ${view === 'grid' ? 'primary' : 'secondary'}`} onClick={() => setView('grid')}>
            Grid
          </button>
          <button className={`btn ${view === 'table' ? 'primary' : 'secondary'}`} onClick={() => setView('table')}>
            Tabla
          </button>
        </div>
      </div>

      <div className="card">
        <div className="products-toolbar">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Buscar por nombre, marca o código de barras"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn primary" type="submit">
              Buscar
            </button>
          </form>

          <div className="filters-inline">
            <div className="btn-group">
              {['todos', 'con', 'sin'].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  className={`btn ${filterStock === valor ? 'primary' : 'secondary'}`}
                  onClick={() => handleFilterStock(valor)}
                >
                  {valor === 'todos' ? 'Todos' : valor === 'con' ? 'Con existencia' : 'Sin stock'}
                </button>
              ))}
            </div>

            <div className="select-inline">
              <label htmlFor="estado">Estado</label>
              <select id="estado" value={filterEstado} onChange={handleFilterEstado}>
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            {editable && (
            <div className="btn-group">
              <button className="btn secondary" type="button" onClick={() => setMostrarCrear((v) => !v)}>
                {mostrarCrear ? 'Ocultar creación' : 'Crear producto'}
              </button>
              <button className="btn secondary" type="button" onClick={() => setMostrarEditar((v) => !v)}>
                {mostrarEditar ? 'Ocultar edición' : 'Editar por código'}
              </button>
            </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {mensaje.texto && <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>}

      {editable && mostrarCrear && (
        <div className="card form-card">
          <h3>Crear producto</h3>
          <form className="form grid" onSubmit={handleCrear}>
            <input
              name="codigo_barras"
              placeholder="Código de barras"
              value={formNuevo.codigo_barras}
              onChange={handleNuevoChange}
            />
            <input
              name="nombre"
              placeholder="Nombre"
              value={formNuevo.nombre}
              onChange={handleNuevoChange}
              required
            />
            <input
              name="descripcion"
              placeholder="Descripción"
              value={formNuevo.descripcion}
              onChange={handleNuevoChange}
            />
            <select name="estado" value={formNuevo.estado} onChange={handleNuevoChange}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <input name="categoria" placeholder="Categoría" value={formNuevo.categoria} onChange={handleNuevoChange} />
            <input name="marca" placeholder="Marca" value={formNuevo.marca} onChange={handleNuevoChange} />
            <input
              name="presentacion"
              placeholder="Presentación"
              value={formNuevo.presentacion}
              onChange={handleNuevoChange}
            />
            <input name="unidad" placeholder="Unidad" value={formNuevo.unidad} onChange={handleNuevoChange} />
            <input
              name="precio_venta"
              type="number"
              step="0.01"
              placeholder="Precio de venta"
              value={formNuevo.precio_venta}
              onChange={handleNuevoChange}
            />
            <input
              name="costo_promedio"
              type="number"
              step="0.01"
              placeholder="Costo promedio"
              value={formNuevo.costo_promedio}
              onChange={handleNuevoChange}
            />
            <input
              name="stock"
              type="number"
              placeholder="Stock"
              value={formNuevo.stock}
              onChange={handleNuevoChange}
            />
            <input
              name="stock_minimo"
              type="number"
              placeholder="Stock mínimo"
              value={formNuevo.stock_minimo}
              onChange={handleNuevoChange}
            />
            <input
              name="imagen"
              placeholder="Imagen URL (opcional)"
              value={formNuevo.imagen}
              onChange={handleNuevoChange}
            />
            <input type="file" accept="image/*" onChange={(e) => setFileNuevo(e.target.files?.[0] || null)} />

            <div className="form-actions">
              <button className="btn primary" type="submit">
                Guardar
              </button>
              <button className="btn ghost" type="button" onClick={resetCrear}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      {editable && mostrarEditar && (
        <div className="card form-card">
          <h3>Editar por código de barras</h3>

          <div className="form grid">
            <input
              name="codigo_barras"
              placeholder="Código de barras"
              value={formEdit.codigo_barras}
              onChange={handleEditChange}
            />
            <button className="btn primary" type="button" onClick={buscarParaEditar}>
              Buscar
            </button>
          </div>

          <form className="form grid" onSubmit={handleEditar}>
            <input name="nombre" placeholder="Nombre" value={formEdit.nombre} onChange={handleEditChange} />
            <input
              name="descripcion"
              placeholder="Descripción"
              value={formEdit.descripcion}
              onChange={handleEditChange}
            />
            <select name="estado" value={formEdit.estado} onChange={handleEditChange}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <input name="categoria" placeholder="Categoría" value={formEdit.categoria} onChange={handleEditChange} />
            <input name="marca" placeholder="Marca" value={formEdit.marca} onChange={handleEditChange} />
            <input
              name="presentacion"
              placeholder="Presentación"
              value={formEdit.presentacion}
              onChange={handleEditChange}
            />
            <input name="unidad" placeholder="Unidad" value={formEdit.unidad} onChange={handleEditChange} />
            <input
              name="precio_venta"
              type="number"
              step="0.01"
              placeholder="Precio"
              value={formEdit.precio_venta}
              onChange={handleEditChange}
            />
            <input
              name="costo_promedio"
              type="number"
              step="0.01"
              placeholder="Costo promedio"
              value={formEdit.costo_promedio}
              onChange={handleEditChange}
            />
            <input
              name="stock"
              type="number"
              placeholder="Stock"
              value={formEdit.stock}
              onChange={handleEditChange}
            />
            <input
              name="stock_minimo"
              type="number"
              placeholder="Stock mínimo"
              value={formEdit.stock_minimo}
              onChange={handleEditChange}
            />
            <input
              name="imagen"
              placeholder="Imagen URL (opcional)"
              value={formEdit.imagen}
              onChange={handleEditChange}
            />
            <input type="file" accept="image/*" onChange={(e) => setFileEdit(e.target.files?.[0] || null)} />

            <div className="form-actions">
              <button className="btn primary" type="submit">
                Guardar cambios
              </button>
              <button className="btn ghost" type="button" onClick={resetEditar}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="list-header">
          <div>
            <h3>Listado de productos</h3>
            <p className="muted">{loading ? 'Cargando…' : `${total} productos encontrados`}</p>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="products-grid">
            {productos.map((p) => (
              <div key={p.id || p.codigo_barras} className="product-card">
                <div className="product-image">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} />
                  ) : (
                    <div className="thumb-placeholder">Sin imagen</div>
                  )}
                </div>

                <div className="product-body">
                  <div className="product-top">
                    <h4 className="product-name">{p.nombre}</h4>
                    <span className="badge">{(p.estado || 'ACTIVO').toUpperCase()}</span>
                  </div>

                  <p className="muted">{p.descripcion || 'Sin descripción'}</p>

                  <div className="product-meta">
                    <span className="pill">{p.marca || 'Sin marca'}</span>
                    <span className={`pill ${p.stock > 0 ? 'pill-ok' : 'pill-warn'}`}>
                      Stock: {p.stock ?? 0}
                    </span>
                  </div>

                  <div className="product-footer">
                    <div className="muted small">Código: {p.codigo_barras || 'N/D'}</div>
                    <div className="muted small">Categoría: {p.categoria || 'N/D'}</div>
                  </div>

                  <div className="product-footer">
                    <strong>${Number(p.precio_venta || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
            {!productos.length && !loading && <p className="muted">Sin resultados.</p>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  {editable && <th></th>}
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id || p.codigo_barras}>
                    <td>{p.nombre}</td>
                    <td>{p.marca || 'N/D'}</td>
                    <td>{p.codigo_barras || 'N/D'}</td>
                    <td>{p.categoria || 'N/D'}</td>
                    <td>${Number(p.precio_venta || 0).toFixed(2)}</td>
                    <td>{p.stock ?? 0}</td>
                    <td>{(p.estado || '').toUpperCase()}</td>
                    {editable && (
                      <td>
                        <button className="btn ghost" type="button" onClick={() => handleEliminar(p)}>
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!productos.length && !loading && <p className="muted">Sin resultados.</p>}
          </div>
        )}

        <div className="pagination">
          <button className="btn secondary" disabled={page <= 1} onClick={() => paginar(-1)}>
            Anterior
          </button>
          <span className="info">
            Página {page} de {totalPages} · {total} registros
          </span>
          <button className="btn secondary" disabled={page >= totalPages} onClick={() => paginar(1)}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;