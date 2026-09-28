-- PUT /productos
-- Crea un producto.
USE papeleria_costa_azul;
INSERT INTO productos (
  nombre, categoria, marca, presentacion, sku, codigo_barras, descripcion,
  unidad, precio_venta, costo_promedio, stock, stock_minimo, imagen, estado
) VALUES (
  ${nombre}, NULLIF(${categoria}, ''), NULLIF(${marca}, ''), NULLIF(${presentacion}, ''),
  NULLIF(${sku}, ''), NULLIF(${codigo_barras}, ''), NULLIF(${descripcion}, ''),
  ${unidad}, ${precio_venta}, ${costo_promedio}, ${stock}, ${stock_minimo},
  NULLIF(${imagen}, ''), ${estado}
);
SELECT LAST_INSERT_ID() AS id;
