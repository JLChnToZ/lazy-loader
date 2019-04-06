/**
 * Support module for wrapping and unwrapping function (methods) fetched within proxies,
 * as those function may have problem of resolving `this` when called directly,
 * especial with native objects such as `Date`.
 */
export declare namespace FunctionProxyResolver {
    /**
     * Resolve the value to unproxied one.
     * @param source The source maybe proxied.
     */
    function resolve(source: any): any;
    /**
     * Resolve an array of values to unproxied one.
     * This may be use to chain the output with arguments.
     * @param sources An array-like object contains the
     * sources may be or may not be proxied.
     */
    function resolveAll(sources: ArrayLike<any>): {}[];
    /**
     * Register a proxy to source resolver.
     * @param resolver Resolver function that takes the proxy and returns the source.
     */
    function register(resolver: (source: any) => any): void;
    /**
     * Wrap a raw function to give ability to resolve proxified `this` problem.
     * This will do nothing if the value provided is not a function.
     * @param value The value maybe original function.
     */
    function wrap(value: unknown): unknown;
    /**
     * Unwrap a wrapped function to the original one.
     * This will do nothing if the value provided is not a wrapped function.
     * @param value The value maybe a warpped function.
     */
    function unwrap(value: unknown): unknown;
}
