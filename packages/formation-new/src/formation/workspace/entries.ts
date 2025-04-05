export const entries = <K extends string, V>(
  object: Record<K, V>
): [K, V][] => {
  return Object.entries(object) as [K, V][];
};
