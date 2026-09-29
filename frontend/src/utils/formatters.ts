/**
 * Formatea una cantidad numérica al estándar chileno.
 * Elimina los decimales inútiles (ej. 1.000 -> 1) y utiliza separador de miles y decimales.
 * @param value El número o string a formatear
 * @returns El número formateado en string
 */
export function formatQuantity(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0';
  
  const num = Number(value);
  if (isNaN(num)) return '0';

  // Usamos el locale es-CL para separar miles con '.' y decimales con ','
  return num.toLocaleString('es-CL');
}

/**
 * Formatea un monto de dinero al estándar chileno.
 */
export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0';
  
  const num = Number(value);
  if (isNaN(num)) return '0';

  return num.toLocaleString('es-CL');
}
