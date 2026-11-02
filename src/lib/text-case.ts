// "alejandro morales" / "ALEJANDRO MORALES" → "Alejandro Morales" — normalise
// la casse d'un nom quelle que soit la façon dont il a été tapé.
export function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
