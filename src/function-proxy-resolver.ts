import { isObject } from './utils';

/**
 * Support module for wrapping and unwrapping function (methods) fetched within proxies,
 * as those function may have problem of resolving `this` when called directly,
 * especial with native objects such as `Date`.
 */
export namespace FunctionProxyResolver {
  const proxifiedValues = new WeakMap<object, object>();
  const proxifiedSources = new WeakMap<object, object>();
  const resolvers: Array<(source: any) => any> = [];

  const methodProxyHandler = Object.freeze<ProxyHandler<Function>>({
    apply(target, thisArg, args) {
      return Reflect.apply(target, resolve(thisArg), resolveAll(args));
    },
  });

  /**
   * Resolve the value to unproxied one.
   * @param source The source maybe proxied.
   */
  export function resolve(source: any) {
    for(const resolver of resolvers) {
      try {
        const newSource = resolver(source);
        if(newSource !== undefined)
          source = newSource;
      } catch {}
    }
    return source;
  }
  
  /**
   * Resolve an array of values to unproxied one.
   * This may be use to chain the output with arguments.
   * @param sources An array-like object contains the
   * sources may be or may not be proxied.
   */
  export function resolveAll(sources: ArrayLike<any>) {
    return sources && Array.prototype.map.call(sources, resolve);
  }
  
  /**
   * Register a proxy to source resolver.
   * @param resolver Resolver function that takes the proxy and returns the source.
   */
  export function register(resolver: (source: any) => any) {
    if(resolvers.indexOf(resolver) < 0)
      resolvers.push(resolver);
  }
  
  /**
   * Wrap a raw function to give ability to resolve proxified `this` problem.
   * This will do nothing if the value provided is not a function.
   * @param value The value maybe original function.
   */
  export function wrap(value: unknown) {
    if(typeof value === 'function' && !proxifiedSources.has(value)) {
      let proxified = proxifiedValues.get(value);
      if(!proxified) {
        proxified = new Proxy(value, methodProxyHandler);
        proxifiedValues.set(value, proxified);
        proxifiedSources.set(proxified, value);
      }
      return proxified;
    }
    return value;
  }
  
  /**
   * Unwrap a wrapped function to the original one.
   * This will do nothing if the value provided is not a wrapped function.
   * @param value The value maybe a warpped function.
   */
  export function unwrap(value: unknown) {
    return isObject(value) && proxifiedSources.get(value) || value;
  }
}