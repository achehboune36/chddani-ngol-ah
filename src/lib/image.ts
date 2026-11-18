/**
 * Cover photos are shrunk in the browser and stored inline (as a data URL) on the
 * hangout doc. No Firebase Storage needed, so the project stays on the free plan.
 * Target: ≤ 800 px wide JPEG, well under MAX_IMAGE_CHARS.
 */
export const MAX_IMAGE_CHARS = 240_000; // must match firestore.rules

export async function shrinkImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error("That's not an image. 🤨");
  const img = await load(file);
  // Try progressively smaller / lower quality until it fits.
  for (const [w, q] of [[800, 0.8], [720, 0.7], [600, 0.65], [480, 0.6], [360, 0.55]] as const) {
    const out = draw(img, w, q);
    if (out.length <= MAX_IMAGE_CHARS) return out;
  }
  throw new Error('Image too big even after squeezing. Try another one.');
}

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Couldn't read that image.")); };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, maxW: number, quality: number): string {
  const scale = Math.min(1, maxW / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; // transparent PNGs → white, not black
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

/** Only render what we produced ourselves. */
export const isSafeImage = (s: string | null | undefined): s is string => !!s && /^data:image\/(jpeg|png|webp);base64,/.test(s);
