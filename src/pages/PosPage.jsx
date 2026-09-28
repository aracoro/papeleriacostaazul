import { useEffect, useMemo, useState } from 'react';
import logo from '../assets/logo.png';
import { getProductos, registrarVenta } from '../api';
import { useAuth } from '../context/AuthContext';

export default function PosPage() {
  const business = {
    nombre: 'Papelería Costa Azul',
    rfc: 'RFC: XAXX010101000',
    domicilio: 'Calle 123, Colonia Centro, Ciudad, Estado',
    telefono: 'Tel: 555-123-4567',
    politica: 'Cambios/devoluciones dentro de 7 días con ticket.',
    leyenda: 'Precios con IVA incluido',
  };

  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await getProductos();
    if (!error) {
      setProductos(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    }
  };

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productos;

    const lower = busqueda.toLowerCase();

    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(lower) ||
        p.codigo_barras?.toLowerCase().includes(lower) ||
        p.marca?.toLowerCase().includes(lower) ||
        p.sku?.toLowerCase().includes(lower)
    );
  }, [busqueda, productos]);

  const agregarProducto = (producto) => {
    setMensaje({ tipo: '', texto: '' });

    const existente = carrito.find((l) => l.producto.id === producto.id);

    if (existente) {
      if (existente.cantidad + 1 > Number(producto.stock || 0)) {
        setMensaje({ tipo: 'error', texto: 'Stock insuficiente' });
        return;
      }

      setCarrito((prev) =>
        prev.map((l) =>
          l.producto.id === producto.id
            ? { ...l, cantidad: l.cantidad + 1 }
            : l
        )
      );
      return;
    }

    if (Number(producto.stock || 0) < 1) {
      setMensaje({ tipo: 'error', texto: 'Sin stock disponible' });
      return;
    }

    setCarrito((prev) => [
      ...prev,
      {
        producto,
        cantidad: 1,
        precio_unitario: Number(producto.precio_venta || 0),
      },
    ]);
  };

  const actualizarCantidad = (id, delta) => {
    setMensaje({ tipo: '', texto: '' });

    setCarrito((prev) =>
      prev
        .map((l) => {
          if (l.producto.id !== id) return l;

          const nuevaCantidad = l.cantidad + delta;

          if (nuevaCantidad < 1) return null;

          if (nuevaCantidad > Number(l.producto.stock || 0)) {
            setMensaje({ tipo: 'error', texto: 'Stock insuficiente' });
            return l;
          }

          return { ...l, cantidad: nuevaCantidad };
        })
        .filter(Boolean)
    );
  };

  const eliminarLinea = (id) => {
    setCarrito((prev) => prev.filter((l) => l.producto.id !== id));
  };

  const total = carrito.reduce(
    (acc, l) => acc + Number(l.precio_unitario || l.producto.precio_venta || 0) * l.cantidad,
    0
  );

  const subtotal = total / 1.16;
  const iva = total - subtotal;

  const imprimirTicket = (ventaInfo) => {
    const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const lineasHtml = ventaInfo.items
      .map((l) => {
        const desc = (l.producto.nombre || '').slice(0, 30);
        const cant = l.cantidad.toString().padStart(3, ' ');
        const pUnit = Number(l.precio_unitario).toFixed(2).padStart(8, ' ');
        const imp = (Number(l.precio_unitario) * l.cantidad).toFixed(2).padStart(9, ' ');
        return `<tr class="mono">
            <td>${cant} x ${desc}</td>
            <td class="right">$${pUnit}</td>
            <td class="right">$${imp}</td>
          </tr>`;
      })
      .join('');

    const logoUrl = new URL(logo, window.location.origin).href;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket</title>
          <style>
            @page { size: 58mm 200mm; margin: 0; }
            @media print { body { margin: 0; } }
            body { font-family: Arial, sans-serif; padding: 8px; color: #000; max-width: 58mm; margin: 0 auto; font-size: 10px; font-weight: 600; }
            .header { text-align: center; }
            img { max-width: 120px; margin: 2px auto 0; display: block; }
            h2 { margin: 0 0 2px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 4px 2px; font-size: 9px; text-align: left; color: #000; font-weight: 700; }
            .mono { font-family: 'Courier New', monospace; }
            .right { text-align: right; }
            .line { border-top: 1px dashed #999; margin: 6px 0; }
            .totales { margin-top: 8px; }
            .totales div { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; font-weight: 700; }
            .footer { margin-top: 10px; text-align: center; font-size: 9px; color: #000; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Logo" />
            <h2>${business.nombre}</h2>
            <div class="mono">
              <div>${business.rfc}</div>
              <div>${business.domicilio}</div>
              <div>${business.telefono}</div>
            </div>
            <div class="line"></div>
            <div class="mono">
              <div>Fecha: ${fecha}</div>
              <div>Folio: ${ventaInfo.id}</div>
              <div>Cajero: ${ventaInfo.cajero || ''}</div>
            </div>
            <div class="line"></div>
          </div>
          <table>
            <thead>
              <tr class="mono"><th>Detalle</th><th class="right">P.Unit</th><th class="right">Importe</th></tr>
            </thead>
            <tbody>
              ${lineasHtml}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="totales">
            <div><span>Subtotal</span><strong>$${ventaInfo.subtotal.toFixed(2)}</strong></div>
            <div><span>IVA 16%</span><strong>$${ventaInfo.iva.toFixed(2)}</strong></div>
            <div><span>Total</span><strong>$${ventaInfo.total.toFixed(2)}</strong></div>
          </div>
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div>${business.politica}</div>
            <div>${business.leyenda}</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    iframe.contentDocument?.open();
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 300);
    };
  };

  const cobrar = async () => {
    if (!carrito.length) {
      setMensaje({ tipo: 'error', texto: 'Agrega productos antes de cobrar' });
      return;
    }

    if (!user?.id) {
      setMensaje({ tipo: 'error', texto: 'No se encontró el usuario de la sesión' });
      return;
    }

    setProcesando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // La fecha/hora y el usuario los pone el servidor (zona horaria local y usuario de la sesión)
      const payload = {
        cliente: '',
        pago: 'efectivo',
        lineas: carrito.map((l) => ({
          producto_id: l.producto.id,
          cantidad: l.cantidad,
          precio: Number(l.precio_unitario || l.producto.precio_venta || 0),
        })),
      };

      const { data, error } = await registrarVenta(payload);

      if (error) {
        throw new Error(error.message || 'No se pudo registrar la venta');
      }

      const folio = data?.id || data?.data?.id || '';

      setMensaje({
        tipo: 'success',
        texto: `Venta registrada. Folio: ${folio}`,
      });

      const lineas = carrito.map((l) => ({
        producto: l.producto,
        cantidad: l.cantidad,
        precio_unitario: Number(l.precio_unitario || l.producto.precio_venta || 0),
      }));

      setCarrito([]);
      await cargarProductos();

      imprimirTicket({
        id: folio,
        subtotal,
        iva,
        total,
        items: lineas,
        cajero: user?.nombre || user?.usuario || 'Cajero',
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo registrar la venta' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">PUNTO DE VENTA</p>
          <h2>Ventas</h2>
          <p className="text-muted">Escanea códigos o busca productos de Costa Azul</p>
        </div>

        {mensaje.texto && (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      <div className="pos-layout">
        <div className="pos-left">
          <div className="card">
            <div className="input-group">
              <input
                type="text"
                placeholder="Buscar o escanear código de barras"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const prod = productos.find((p) => p.codigo_barras === busqueda.trim());
                    if (prod) {
                      agregarProducto(prod);
                      setBusqueda('');
                    } else {
                      setMensaje({ tipo: 'error', texto: 'Producto no encontrado' });
                    }
                  }
                }}
              />
              <button className="btn primary" type="button">
                Buscar
              </button>
            </div>
          </div>

          <div className="product-list card">
            <h3>Productos</h3>
            <div className="scroll-area">
              {productosFiltrados.map((p) => (
                <div key={p.id} className="product-row">
                  <div>
                    <p className="product-name">{p.nombre}</p>
                    <p className="muted">
                      {p.marca} · Código: {p.codigo_barras}
                    </p>
                  </div>
                  <div className="product-meta">
                    <span className="badge">${Number(p.precio_venta || 0).toFixed(2)}</span>
                    <span className={Number(p.stock || 0) > 5 ? 'stock ok' : 'stock low'}>
                      Stock: {p.stock}
                    </span>
                    <button className="btn secondary" type="button" onClick={() => agregarProducto(p)}>
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card table-wrapper">
            <h3>Carrito</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Importe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((l) => (
                  <tr key={l.producto.id}>
                    <td>{l.producto.nombre}</td>
                    <td>
                      <div className="qty-control">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => actualizarCantidad(l.producto.id, -1)}
                        >
                          -
                        </button>
                        <span>{l.cantidad}</span>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => actualizarCantidad(l.producto.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>${Number(l.precio_unitario || l.producto.precio_venta || 0).toFixed(2)}</td>
                    <td>${(Number(l.precio_unitario || l.producto.precio_venta || 0) * l.cantidad).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn link"
                        type="button"
                        onClick={() => eliminarLinea(l.producto.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}

                {!carrito.length && (
                  <tr>
                    <td colSpan="5">No hay productos en el carrito</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pos-right">
          <div className="card summary-card">
            <h3>Resumen</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>IVA incluido</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button className="btn primary full" type="button" onClick={cobrar} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}