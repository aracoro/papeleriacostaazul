import { useState } from 'react';
import { descargarRespaldo } from '../api';

export default function RespaldoPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [ultimo, setUltimo] = useState(null);

  const generar = async () => {
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);
    const { data, error } = await descargarRespaldo();
    setLoading(false);

    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo generar el respaldo' });
      return;
    }

    setUltimo({ ...data, fecha: new Date().toLocaleString('es-MX') });
    setMensaje({ tipo: 'success', texto: `Respaldo descargado: ${data.nombre}` });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administración</p>
          <h2>Respaldo de la base de datos</h2>
          <p className="text-muted">
            Descarga una copia completa de la base de datos de TiDB Cloud en un archivo .sql local
          </p>
        </div>

        {mensaje.texto && (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>
        )}
      </div>

      <div className="card">
        <h3>Generar respaldo (.sql)</h3>
        <p className="text-muted">
          El archivo incluye la estructura de todas las tablas y vistas y todos los registros. Se puede
          restaurar en MySQL o en TiDB abriéndolo en MySQL Workbench y ejecutándolo completo.
        </p>

        <div className="form-actions">
          <button className="btn primary" type="button" onClick={generar} disabled={loading}>
            {loading ? 'Generando respaldo...' : 'Descargar respaldo .sql'}
          </button>
        </div>
      </div>

      {ultimo && (
        <div className="card">
          <h3>Último respaldo</h3>
          <table className="table">
            <tbody>
              <tr>
                <th>Archivo</th>
                <td>{ultimo.nombre}</td>
              </tr>
              <tr>
                <th>Fecha</th>
                <td>{ultimo.fecha}</td>
              </tr>
              <tr>
                <th>Tablas</th>
                <td>{ultimo.tablas}</td>
              </tr>
              <tr>
                <th>Registros</th>
                <td>{ultimo.filas}</td>
              </tr>
              <tr>
                <th>Tamaño</th>
                <td>{(ultimo.tamano / 1024).toFixed(1)} KB</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
