export function randInt(min: number, max: number): number {
  const range = max - min;
  return Math.round(Math.random() * range);
}
