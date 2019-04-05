"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
/**
 * Support module for wrapping and unwrapping function (methods) fetched within proxies,
 * as those function may have problem of resolving `this` when called directly,
 * especial with native objects such as `Date`.
 */
var FunctionProxyResolver;
(function (FunctionProxyResolver) {
    const proxifiedValues = new WeakMap();
    const proxifiedSources = new WeakMap();
    const resolvers = [];
    const methodProxyHandler = Object.freeze({
        apply(target, thisArg, args) {
            return Reflect.apply(target, resolve(thisArg), resolveAll(args));
        },
    });
    /**
     * Resolve the value to unproxied one.
     * @param source The source maybe proxied.
     */
    function resolve(source) {
        for (const resolver of resolvers) {
            try {
                const newSource = resolver(source);
                if (newSource !== undefined)
                    source = newSource;
            }
            catch (_a) { }
        }
        return source;
    }
    FunctionProxyResolver.resolve = resolve;
    /**
     * Resolve an array of values to unproxied one.
     * This may be use to chain the output with arguments.
     * @param sources An array-like object contains the
     * sources may be or may not be proxied.
     */
    function resolveAll(sources) {
        return sources && Array.prototype.map.call(sources, resolve);
    }
    FunctionProxyResolver.resolveAll = resolveAll;
    /**
     * Register a proxy to source resolver.
     * @param resolver Resolver function that takes the proxy and returns the source.
     */
    function register(resolver) {
        if (resolvers.indexOf(resolver) < 0)
            resolvers.push(resolver);
    }
    FunctionProxyResolver.register = register;
    /**
     * Wrap a raw function to give ability to resolve proxified `this` problem.
     * This will do nothing if the value provided is not a function.
     * @param value The original function
     */
    function wrap(value) {
        if (typeof value === 'function' && !proxifiedSources.has(value)) {
            let proxified = proxifiedValues.get(value);
            if (!proxified) {
                proxified = new Proxy(value, methodProxyHandler);
                proxifiedValues.set(value, proxified);
                proxifiedSources.set(proxified, value);
            }
            return proxified;
        }
        return value;
    }
    FunctionProxyResolver.wrap = wrap;
    /**
     * Unwrap a wrapped function to the original one.
     * This will do nothing if the value provided is not a wrapped function.
     * @param value
     */
    function unwrap(value) {
        return utils_1.isObject(value) && proxifiedSources.get(value) || value;
    }
    FunctionProxyResolver.unwrap = unwrap;
})(FunctionProxyResolver = exports.FunctionProxyResolver || (exports.FunctionProxyResolver = {}));
//# sourceMappingURL=function-proxy-resolver.js.map