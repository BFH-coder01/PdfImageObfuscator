export function rectangle(a, b, width, height) {
  const left = Math.max(0, Math.min(width, Math.min(a.x, b.x)));
  const top = Math.max(0, Math.min(height, Math.min(a.y, b.y)));
  const right = Math.max(0, Math.min(width, Math.max(a.x, b.x)));
  const bottom = Math.max(0, Math.min(height, Math.max(a.y, b.y)));
  // Keep only wholly selected pixels; do not reveal pixels outside the boundary.
  const x = Math.ceil(left), y = Math.ceil(top);
  return { x, y, w: Math.max(0, Math.floor(right) - x), h: Math.max(0, Math.floor(bottom) - y) };
}
export function obfuscate(context, image, regions) {
  context.fillStyle = '#000';
  context.fillRect(0, 0, image.width, image.height);
  for (const r of regions) context.drawImage(image, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
}
