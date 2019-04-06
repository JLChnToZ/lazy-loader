/** Lazy initializer proxy factory */
export declare namespace LazyProxy {
    /**
     * Create a proxy object which loosely reflects to the target object
     * of a delayed (lazy) initializer.
     * @param init The lazy initializer which returns the object.
     * @param isConstructor Whether the target object will be a constructor and
     * the proxy will use as constructor directly or not. This will use a alternative flow
     * with some minor drawbacks to provide constructor support.
     * @example
     * ```javascript
     * const somethingExpensive = LazyProxy.create(() => {
     *   // Some heavy stuffs...
     *   return someHeavyObject;
     * });
     *
     * // You may treat the object is loosely equals to the initialized object itself.
     * const someValue = somethingExpensive.someValue();
     * ```
     */
    function create<T extends object>(init: () => T, isConstructor?: boolean): T;
    function create<T>(init: () => T, isConstructor?: boolean): T & object;
    /**
     * Get the target source object of a proxy. Will returns itself if not found.
     * If the initializer is not yet resolved, it will resolves immediately.
     * @param maybeProxy The wrapped proxy.
     */
    function getSource<T>(maybeProxy: T): T;
}
