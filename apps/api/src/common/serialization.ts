export function serializeEntity<T>(value: T | null | undefined) {
  if (!value) return null;
  return JSON.parse(JSON.stringify(value));
}
