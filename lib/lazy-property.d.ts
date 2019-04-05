/** Generic class constructor interface. */
export interface Class<T extends object> extends Function {
    prototype: T;
    new (...args: any[]): T;
}
export declare type Defined<T extends object, K extends keyof T> = T & {
    [I in K]-?: T[I];
};
export declare type DefineDescriptors<T extends object, K extends keyof T> = {
    [I in K]: DefineDescriptor<T, K>;
};
export declare type DefineDescriptor<T extends object, K extends keyof T> = {
    /** The init function, which will returns the value once initialized. */
    init: LazyInit<T, K>;
    /** Writable flag for the property. */
    writable?: boolean;
    /** Configurable flag for the property after initialized. */
    configurable?: boolean;
    /** Enumerable flag for the property. */
    enumerable?: boolean;
} | LazyInit<T, K>;
export declare type LazyInit<T extends object, K extends keyof T> = (this: T, key: K) => T[K];
/**
 * Decorator to transform applied property getter to lazy initializer.
 * Lazy properties are undefined until the first interaction,
 * then it will become static.
 *
 * ### Example
 * ```javascript
 * class Schrodinger {
 *   @lazyProperty
 *   get cat() { return Math.random() > 0.5; }
 *   // Setter will be called when the value has been assigned first time.
 *   // If the setter is not defined, the property will be read-only.
 *   set cat(value) {
 *     console.log(`It is ${value ? 'alive' : 'dead'} now!`);
 *     assert.strictEqual(value, this.cat);
 *   }
 * }
 * ```
 */
export declare function LazyProperty<T extends object, K extends keyof T>(target: T, key: K, attr: TypedPropertyDescriptor<T[K]>): TypedPropertyDescriptor<T[K]>;
export declare function LazyProperty<T>(// Private field fallback
target: object, key: PropertyKey, attr: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T>;
export declare namespace LazyProperty {
    /**
     * Transform a dynamic property to lazy initializer.
     * Alternative method for those environment which does not support decorators.
     * @param target The target class to work with.
     * @param keys The key of the properties would like to transform.
     *
     * @example
     * class Schrodinger {
     *   get cat() { return Math.random() > 0.5; }
     *   // Setter will be called when the value has been assigned first time.
     *   // If the setter is not defined, the property will be read-only.
     *   set cat(value) {
     *     console.log(`It is ${value ? 'alive' : 'dead'} now!`);
     *     assert.strictEqual(value, this.cat);
     *   }
     * }
     * lazyProperty.transform(Schrodinger, 'cat');
     */
    function transform<T extends object, C extends Class<T>>(target: C, ...keys: Array<keyof T>): C;
    /**
     * Explicit define a lazy initializer property for an object or class prototype.
     * @param target The prototype or object contains the property.
     * @param key The key of the property.
     * @param init The init function, which will returns the value once initialized.
     * @param writable Writable flag for the property.
     * @param configurable Configurable flag for the property after initialized.
     * @param enumerable Enumerable flag for the property.
     */
    function define<T extends object, K extends keyof T>(target: T, key: K, init: LazyInit<T, K>, writable?: boolean, configurable?: boolean, enumerable?: boolean): Defined<T, K>;
    /**
     * Explicit define lazy initializer properties for an object or class prototype.
     * @param target The prototype or object contains the property.
     * @param defines Key hash for all descriptors would like to define.
     */
    function define<T extends object, K extends keyof T>(target: T, defines: DefineDescriptors<T, K>): Defined<T, K>;
}
