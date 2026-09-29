/**
 * Reduce la foto en el navegador antes de subirla (máx. 1600 px, JPEG).
 * Así las fotos de celular (5–12 MB) pasan rápido y caben en el límite del servidor.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('toBlob');
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // Formato que el navegador no puede decodificar (p. ej. HEIC en Chrome): se envía tal cual
    // y el servidor lo validará.
    return file;
  }
}
