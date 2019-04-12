import { LazyProperty } from './lazy-property';
import { FunctionProxyResolver as FPResolver } from './function-proxy-resolver';
import { isObject, DefaultPropertyDescriptors } from './utils';

/** Literally combine 2 types. */
export type Combine<T, U> = T extends U ? T : U extends T ? U : T & U;

/** Lazy initializer proxy factory */
export namespace LazyProxy {
  // If arrow function has been transpiled to full function object,
  // enforce to use the constructor handler in order to correctly follow the rules.
  const forceConstructor = !!(() => {}).prototype;
  const wrappers = new WeakMap<object, LazyHandler<unknown>>();

  class LazyHandler<T> implements ProxyHandler<Combine<T, object>> {
    // Rule breaking resolver: Apply trap needs the dummy object be a callable function.
    // Arrow function is safest as it does not have any extra properties.
    protected static readonly dummy: object = () => {
      throw new Error('This should not be called');
    }

    private init: () => T;

    public get dummy() {
      return LazyHandler.dummy;
    }

    @LazyProperty
    public get source(): Combine<T, object> {
      const result = Object(this.init());
      delete this.init; // Release reference
      return result;
    }

    public constructor(init: () => T) {
      this.init = init;
    }

    public has(_: Combine<T, object>, key: PropertyKey) {
      return Reflect.has(this.source, key);
    }

    public get(_: Combine<T, object>, key: PropertyKey, receiver: any) {
      return FPResolver.wrap(Reflect.get(this.source, key, receiver));
    }

    public set(_: Combine<T, object>, key: PropertyKey, value: any, receiver: any) {
      return Reflect.set(this.source, key, FPResolver.unwrap(value), receiver);
    }

    public deleteProperty(_: Combine<T, object>, key: PropertyKey) {
      return Reflect.deleteProperty(this.source, key);
    }

    public ownKeys(_: Combine<T, object>) {
      return Reflect.ownKeys(this.source);
    }

    public getOwnPropertyDescriptor(_: Combine<T, object>, key: PropertyKey) {
      const attributes = Reflect.getOwnPropertyDescriptor(this.source, key);
      // Rule breaking resolver: Let all properties looks like configurable.
      if(attributes)
        attributes.configurable = true;
      return attributes ||
        // Tell some lie: If not exists and proxified object is non extensible,
        // treat this property as exists, undefined, configurable but read only.
        (!Reflect.isExtensible(this.source) ?
          DefaultPropertyDescriptors.empty :
          undefined);
    }

    public defineProperty(_: Combine<T, object>, key: PropertyKey, attributes: PropertyDescriptor) {
      // Rule breaking resolver: Don't allow to seal any properties.
      if(!attributes.configurable)
        return false;
      if(attributes.value)
        attributes.value = FPResolver.unwrap(attributes.value);
      return Reflect.defineProperty(this.source, key, attributes);
    }

    public getPrototypeOf(_: Combine<T, object>) {
      return Reflect.getPrototypeOf(this.source);
    }

    public setPrototypeOf(_: Combine<T, object>, proto: any) {
      return Reflect.setPrototypeOf(this.source, FPResolver.resolve(proto));
    }

    public preventExtensions(_: Combine<T, object>) {
      // Rule breaking resolver: Don't allow to seal the proxified object.
      return false;
    }

    public apply(_: Combine<T, object>, thisArg: any, args: ArrayLike<any>) {
      return Reflect.apply(
        this.source as Function, FPResolver.resolve(thisArg), FPResolver.resolveAll(args),
      );
    }
  }

  /** Alternative handler with constructor function support */
  class ConstructorLazyHandler<T> extends LazyHandler<T> {
    // Rule breaking resolver: We need a fully crafted function as dummy object
    // to use with construct traps.
    protected static readonly dummy: object = function() {
      throw new Error('This should not be called');
    }

    public get dummy() {
      return ConstructorLazyHandler.dummy;
    }

    public has(target: Combine<T, object>, key: PropertyKey) {
      // Rule breaking resolver: Sealed property in dummy cannot marked non-exists.
      return super.has(target, key) ||
        !!getDescriptorIfSealed(target, key);
    }

    public set(target: Combine<T, object>, key: PropertyKey, value: any, receiver: any) {
      // Rule breaking resolver: Assigning value to property which
      // has same key but read only sealed in dummy is forbidden.
      const original = getDescriptorIfSealed(target, key);
      return original && !original.writable && !original.set ? false :
        super.set(target, key, value, receiver);
    }

    public deleteProperty(target: Combine<T, object>, key: PropertyKey) {
      // Rule breaking resolver: Deleting a property which
      // has same key but sealed in dummy is forbidden.
      return getDescriptorIfSealed(target, key) ? false :
        super.deleteProperty(target, key);
    }

    public getOwnPropertyDescriptor(target: Combine<T, object>, key: PropertyKey) {
      const attr = super.getOwnPropertyDescriptor(target, key);
      // Rule breaking resolver: If dummy property is exists but non-configurable,
      // replace all getter/setter/value to reflected ones or dummy if undefined and return.
      const original = getDescriptorIfSealed(target, key);
      if(!original) return attr;
      if(original.get)
        original.get = attr && attr.get || (() => {});
      if(original.set)
        original.set = attr && attr.set || (() => {});
      else if(!original.get)
        original.value = attr && attr.value;
      return original;
    }

    public defineProperty(target: Combine<T, object>, key: PropertyKey, attributes: PropertyDescriptor) {
      // Rule breaking resolver: Redefining a property which
      // has same key but sealed in dummy is forbidden.
      return getDescriptorIfSealed(target, key) ? false :
        super.defineProperty(target, key, attributes);
    }

    public ownKeys(target: Combine<T, object>) {
      const keys = super.ownKeys(target);
      const keySet = new Set(keys);
      // Rule breaking resolver: Union all dummy properties which non-configurable
      for(const key of Reflect.ownKeys(target))
        if(getDescriptorIfSealed(target, key) && !keySet.has(key))
          keys.push(key);
      return keys;
    }

    public construct(_: Combine<T, object>, args: ArrayLike<any>, newTarget: any) {
      return Reflect.construct(
        this.source as Function, FPResolver.resolveAll(args), newTarget,
      );
    }
  }

  function getDescriptorIfSealed(target: object, key: PropertyKey) {
    const original = Reflect.getOwnPropertyDescriptor(target, key);
    return original && !original.configurable && original || undefined;
  }

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
  export function create<T>(init: () => T, isConstructor?: boolean) {
    if(!('Proxy' in global)) {
      console.warn('Your platform does not support proxy.');
      return init();
    }
    const handler: LazyHandler<T> = (isConstructor || forceConstructor) ?
      new ConstructorLazyHandler(init) :
      new LazyHandler(init);
    const wrapper = new Proxy(handler.dummy as Combine<T, object>, handler);
    wrappers.set(wrapper, handler);
    return wrapper;
  }
  
  /**
   * Get the target source object of a proxy. Will returns itself if not found.
   * If the initializer is not yet resolved, it will resolves immediately.
   * @param maybeProxy The wrapped proxy.
   */
  export function getSource<T>(maybeProxy: T) {
    if(isObject(maybeProxy)) {
      const handler = wrappers.get(maybeProxy);
      if(handler)
        return handler.source as Combine<T, object>;
    }
    return maybeProxy;
  }

  FPResolver.register(getSource);
}
