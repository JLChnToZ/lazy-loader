/** @ignore */
export function isObject(target: unknown): target is object {
  const type = target && typeof target;
  return type === 'object' || type === 'function';
}

/** @ignore */
export function isPropertyKey(target: unknown): target is PropertyKey {
  const type = typeof target;
  return type === 'string' || type === 'number' || type === 'symbol';
}

/** @ignore */
export namespace DefaultPropertyDescriptors {
  /** @ignore */
  export const empty = Object.freeze<PropertyDescriptor>({
    configurable: true,
    writable: true,
    enumerable: false,
    value: undefined,
  });
  
  /** @ignore */
  export const emptySealed = Object.freeze<PropertyDescriptor>({
    configurable: false,
    writable: false,
    enumerable: false,
    value: undefined,
  });
}

/**@ignore */
export interface InheritedPropertyDescriptor<T> extends TypedPropertyDescriptor<T> {
  inherited?: boolean;
}

/** @ignore */
export function findPropertyDescriptor<T extends object, K extends keyof T>(
  o: T, key: K, ignoreInherited?: boolean,
): InheritedPropertyDescriptor<T[K]> {
  for(let p = o; p; p = Object.getPrototypeOf(p)) {
    const descriptor = Object.getOwnPropertyDescriptor(p, key);
    if(descriptor) {
      (descriptor as InheritedPropertyDescriptor<T[K]>).inherited = p !== o;
      return descriptor;
    }
    if(ignoreInherited) break;
  }
  return DefaultPropertyDescriptors[Object.isExtensible(o) ? 'empty' : 'emptySealed'];
}
