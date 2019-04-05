// Type Definitions
/** Generic class constructor interface. */
export interface Class<T extends object> extends Function {
  prototype: T;
  new(...args: any[]): T;
}

export type Defined<T extends object, K extends keyof T> = T & {
  [I in K]-?: T[I];
};

export type DefineDescriptors<T extends object, K extends keyof T> = {
  [I in K]: DefineDescriptor<T, K>;
};

export type DefineDescriptor<T extends object, K extends keyof T> = {
  /** The init function, which will returns the value once initialized. */
  init: LazyInit<T, K>;
  /** Writable flag for the property. */
  writable?: boolean;
  /** Configurable flag for the property after initialized. */
  configurable?: boolean;
  /** Enumerable flag for the property. */
  enumerable?: boolean;
} | LazyInit<T, K>;

export type LazyInit<T extends object, K extends keyof T> = (this: T, key: K) => T[K];

type TypeGetter<T extends object, K extends keyof T> = (this: T) => T[K];

type TypeSetter<T extends object, K extends keyof T> = (this: T, value: T[K]) => void;

// Handler
class LazyHandler<T extends object, K extends keyof T> {
  public static define<T extends object, K extends keyof T>(
    target: T, key: K, init: LazyInit<T, K>,
    writable = true, configurable = true, enumerable?: boolean,
  ) {
    const descriptor = findPropertyDescriptor(target, key);
    if(!descriptor.configurable)
      throw new TypeError('This property is sealed.');
    if(descriptor.get)
      throw new TypeError('This property already has a getter.');
    if(descriptor.value !== undefined)
      throw new TypeError('This property has already been initialized.');
    if(enumerable === undefined)
      enumerable = descriptor.enumerable;
    return Object.defineProperty(
      target, key,
      new this(key, init, writable, configurable).getAttr(enumerable),
    );
  }

  public static getTransform<T extends object, K extends keyof T>(
    key: K,
    { configurable, enumerable, get, set }: TypedPropertyDescriptor<T[K]>,
    isReconfigure?: boolean,
  ) {
    if(isReconfigure && !configurable)
      throw new TypeError('This property is sealed.');
    if(!get)
      throw new TypeError('This property does not have a getter.');
    if(this.allHandlers.has(get))
      throw new TypeError('This property has already been transformed.');
    return new this(key, get, set, configurable).getAttr(enumerable);
  }

  private static readonly allCache = new WeakMap();
  private static readonly allHandlers = new WeakSet<(...args: any[]) => any>();
  private static readonly $getter = Symbol('getter');
  private readonly key: K;
  private readonly init: LazyInit<T, K>;
  private readonly write?: boolean | TypeSetter<T, K>;
  private readonly configurable?: boolean;
  private getter?: TypeGetter<T, K>;
  private setter?: TypeSetter<T, K>;

  private constructor(
    key: K, init: LazyInit<T, K>,
    write?: boolean | TypeSetter<T, K>,
    configurable?: boolean,
  ) {
    this.key = key;
    this.init = init;
    this.write = write;
    this.configurable = configurable;
  }

  public getAttr(enumerable?: boolean): TypedPropertyDescriptor<T[K]> {
    const handler = this;
    if(!this.getter)
      LazyHandler.allHandlers.add(this.getter = function() {
        return handler.processValue(this, LazyHandler.$getter);
      });
    if(!this.setter && this.write)
      LazyHandler.allHandlers.add(this.setter = function(value) {
        return handler.processValue(this, value);
      });
    return {
      configurable: true,
      enumerable,
      get: this.getter,
      set: this.setter,
    };
  }

  private processValue(
    instance: T, newValue: T[K] | typeof LazyHandler.$getter,
  ) {
    const attr = findPropertyDescriptor(instance, this.key);
    let hasValue: boolean | undefined;
    let value: T[K];
    if(attr.configurable) { // Normal flow
      if(newValue === LazyHandler.$getter)
        value = this.init.call(instance, this.key);
      else
        value = newValue;
      Object.defineProperty(instance, this.key, {
        value,
        configurable: this.configurable,
        writable: !!this.write,
        enumerable: attr.enumerable,
      });
    } else { // Edge flow
      let cache = LazyHandler.allCache.get(instance);
      if(cache)
        hasValue = this.key in cache;
      else
        LazyHandler.allCache.set(instance, cache = Object.create(null));
      if(newValue !== LazyHandler.$getter)
        value = newValue;
      else if(attr.get && attr.get !== this.getter)
        value = attr.get.call(instance);
      else if(!hasValue)
        value = this.init.call(instance, this.key);
      else if(cache[this.key] === LazyHandler.$getter)
        value = attr.value!;
      else
        value = cache[this.key];
      if((attr.set && attr.set !== this.setter) || attr.writable) {
        cache[this.key] = LazyHandler.$getter;
        instance[this.key] = value;
      } else
        cache[this.key] = value;
    }
    if(!hasValue && typeof this.write === 'function')
      this.write.call(instance, value);
    return value;
  }
}

// Helpers
const emptyProperty = Object.freeze<PropertyDescriptor>({
  configurable: true,
  writable: true,
  value: undefined,
});

const emptySealedProperty = Object.freeze<PropertyDescriptor>({
  configurable: false,
  writable: false,
  value: undefined,
});

function findPropertyDescriptor<T extends object, K extends keyof T>(
  o: T, key: K,
): TypedPropertyDescriptor<T[K]> {
  for(let p = o; p; p = Object.getPrototypeOf(p)) {
    const descriptor = Object.getOwnPropertyDescriptor(p, key);
    if(descriptor) return descriptor;
  }
  return Object.isExtensible(o) ? emptyProperty : emptySealedProperty;
}

function isPropertyKey(target: unknown): target is PropertyKey {
  const type = typeof target;
  return type === 'string' || type === 'number' || type === 'symbol';
}

// Exports
/**
 * Decorator to transform applied property getter to lazy initializer.
 * Lazy properties are undefined until the first interaction,
 * then it will become static.
 *
 * @example
 * ```javascript
 * class Schrodinger {
 *   @LazyProperty
 *   get cat() { return Math.random() > 0.5; }
 *   // Setter will be called when the value has been assigned first time.
 *   // Setters can be not defined, but then the property will be read-only.
 *   set cat(value) {
 *     console.log(`It is ${value ? 'alive' : 'dead'} now!`);
 *     assert.strictEqual(value, this.cat);
 *   }
 * }
 * ```
 */
export function LazyProperty<T extends object, K extends keyof T>(
  target: T, key: K, attr: TypedPropertyDescriptor<T[K]>,
): TypedPropertyDescriptor<T[K]>;
export function LazyProperty<T>( // Private field fallback
  target: object, key: PropertyKey, attr: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function LazyProperty<T extends object, K extends keyof T>(
  target: T, key: K, attr: TypedPropertyDescriptor<T[K]>,
) {
  if(Object.isSealed(target))
    throw new TypeError('This object is sealed.');
  return LazyHandler.getTransform(key, attr);
}

// tslint:disable-next-line:no-namespace
export namespace LazyProperty {
  /**
   * Transform a dynamic property to lazy initializer.
   * Alternative method for those environment which does not support decorators.
   * @param target The target class to work with.
   * @param keys The key of the properties would like to transform.
   *
   * @example
   * ```javascript
   * class Schrodinger {
   *   get cat() { return Math.random() > 0.5; }
   *   // Setter will be called when the value has been assigned first time.
   *   // Setters can be not defined, but then the property will be read-only.
   *   set cat(value) {
   *     console.log(`It is ${value ? 'alive' : 'dead'} now!`);
   *     assert.strictEqual(value, this.cat);
   *   }
   * }
   * LazyProperty.transform(Schrodinger, 'cat');
   * ```
   */
  export function transform<T extends object, C extends Class<T>>(
    target: C, ...keys: Array<keyof T>
  ) {
    const { prototype } = target;
    if(Object.isSealed(prototype))
      throw new TypeError('This object is sealed.');
    for(const key of keys)
      Object.defineProperty(prototype, key,
        LazyHandler.getTransform(key,
          findPropertyDescriptor(prototype, key),
          true,
        ),
      );
    return target;
  }

  /**
   * Explicit define a lazy initializer property for an object or class prototype.
   * @param target The prototype or object contains the property.
   * @param key The key of the property.
   * @param init The init function, which will returns the value once initialized.
   * @param writable Writable flag for the property.
   * @param configurable Configurable flag for the property after initialized.
   * @param enumerable Enumerable flag for the property.
   * @example
   * ```javascript
   * const someObject = {};
   * LazyProperty.define(someObject, 'somelazyField', () => 'boo!');
   * ```
   */
  export function define<T extends object, K extends keyof T>(
    target: T, key: K, init: LazyInit<T, K>,
    writable?: boolean, configurable?: boolean, enumerable?: boolean,
  ): Defined<T, K>;
  /**
   * Explicit define lazy initializer properties for an object or class prototype.
   * @param target The prototype or object contains the property.
   * @param defines Key hash for all descriptors would like to define.
   * @example
   * ```javascript
   * const someObject = {};
   * LazyProperty.define(someObject, {
   *   someOtherLazyField: () => 'another one!',
   *   someMoreComplicatedLazyField: {
   *     init: () => 'More controllable behaviour!',
   *     enumerable: false,
   *     configurable: false,
   *     writable: true,
   *   },
   * });
   * ```
   */
  export function define<T extends object, K extends keyof T>(
    target: T, defines: DefineDescriptors<T, K>,
  ): Defined<T, K>;
  export function define<T extends object, K extends keyof T>(
    target: T, keyOrDefs: K | DefineDescriptors<T, K>,
    sInit?: LazyInit<T, K>,
    sWri?: boolean, sCfg?: boolean, sEnum?: boolean,
  ) {
    if(Object.isSealed(target))
      throw new TypeError('The object is sealed.');
    if(isPropertyKey(keyOrDefs))
      return LazyHandler.define(target, keyOrDefs, sInit!, sWri, sCfg, sEnum);
    for(const [key, defOrInit] of
      Object.entries(keyOrDefs) as Array<[K, DefineDescriptor<T, K>]>
    ) {
      if(typeof defOrInit === 'function') {
        LazyHandler.define(target, key, defOrInit);
        continue;
      }
      const { init, writable, configurable, enumerable } = defOrInit;
      LazyHandler.define(
        target, key, init, writable, configurable, enumerable,
      );
    }
    return target;
  }
}
