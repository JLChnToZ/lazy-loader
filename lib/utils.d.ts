/** @ignore */
export declare function isObject(target: unknown): target is object;
/** @ignore */
export declare function isPropertyKey(target: unknown): target is PropertyKey;
/** @ignore */
export declare namespace DefaultPropertyDescriptors {
    /** @ignore */
    const empty: Readonly<PropertyDescriptor>;
    /** @ignore */
    const emptySealed: Readonly<PropertyDescriptor>;
    /** @ignore */
    const emptyReadOnly: Readonly<PropertyDescriptor>;
}
/** @ignore */
export declare function findPropertyDescriptor<T extends object, K extends keyof T>(o: T, key: K): TypedPropertyDescriptor<T[K]>;
