export function isObject(target: unknown): target is object {
  const type = target && typeof target;
  return type === 'object' || type === 'function';
}
