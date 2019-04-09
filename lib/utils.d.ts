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
}
/**@ignore */
export interface InheritedPropertyDescriptor<T> extends TypedPropertyDescriptor<T> {
    inherited?: boolean;
}
/** @ignore */
export declare function findPropertyDescriptor<T extends object, K extends keyof T>(o: T, key: K, ignoreInherited?: boolean): InheritedPropertyDescriptor<T[K]>;
