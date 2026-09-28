import { useEffect, useState } from 'react';
import { getProveedores, crearProveedor, actualizarProveedor, eliminarProveedor } from '../api';
import { useAuth } from '../context/AuthContext';
import { puedeEscribir } from '../roles';

const empty = { nombre: '', telefono: '', rfc: '', correo: '', direccion: '' };

export default function ProvidersPage() {
  const { user } = useAuth();
  const editable = puedeEscribir(user);
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const { data, error } = await getProveedores();
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los proveedores.' });
      return;
    }
    setProveedores(data || []);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm(empty);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    if (!form.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'El nombre es obligatorio.' });
      return;
    }
    setLoading(true);
    const datos = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      rfc: form.rfc.trim(),
      correo: form.correo.trim(),
      direccion: form.direccion.trim(),
    };
    const { error } = editId ? await actualizarProveedor(editId, datos) : await crearProveedor(datos);
    setLoading(false);
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo guardar.' });
      return;
    }
    setMensaje({ tipo: 'success', texto: editId ? 'Proveedor actualizado.' : 'Proveedor creado.' });
    reset();
    cargar();
  };

  const startEdit = (prov) => {
    setEditId(prov.id);
    setForm({
      nombre: prov.nombre || '',
      telefono: prov.telefono || '',
      rfc: prov.rfc || '',
      correo: prov.correo || '',
      direccion: prov.direccion || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar proveedor?')) return;
    const { error } = await eliminarProveedor(id);
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo eliminar.' });
      return;
    }
    setMensaje({ tipo: 'success', texto: 'Proveedor eliminado.' });
    if (editId === id) reset();
    cargar();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Proveedores</p>
          <h2>{editable ? 'Registro y edición' : 'Catálogo de proveedores'}</h2>
          <p className="text-muted">
            {editable ? 'Alta, edición y baja de proveedores.' : 'Modo consulta: tu rol solo puede ver la información.'}
          </p>
        </div>
        {mensaje.texto && <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>}
      </div>

      {editable && (
        <div className="card">
          <form className="form grid" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input name="nombre" value={form.nombre} onChange={handleChange} required />
            </label>
            <label>
              Teléfono
              <input name="telefono" value={form.telefono} onChange={handleChange} />
            </label>
            <label>
              RFC
              <input name="rfc" value={form.rfc} onChange={handleChange} />
            </label>
            <label>
              Correo
              <input type="email" name="correo" value={form.correo} onChange={handleChange} />
            </label>
            <label>
              Dirección
              <input name="direccion" value={form.direccion} onChange={handleChange} />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
              </button>
              {editId && (
                <button type="button" className="btn ghost" onClick={reset}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="card table-wrapper">
        <h3>Listado</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>RFC</th>
              <th>Correo</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.telefono || '—'}</td>
                <td>{p.rfc || '—'}</td>
                <td>{p.correo || '—'}</td>
                {editable && (
                  <td>
                    <div className="btn-group">
                      <button type="button" className="btn secondary" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                      <button type="button" className="btn ghost" onClick={() => handleDelete(p.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!proveedores.length && (
              <tr>
                <td colSpan={editable ? 5 : 4} className="muted">
                  Sin proveedores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
