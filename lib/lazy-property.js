"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// Handler
class LazyHandler {
    constructor(key, init, write, configurable) {
        this.key = key;
        this.init = init;
        this.write = write;
        this.configurable = configurable;
    }
    static define(target, key, init, writable = true, configurable = true, enumerable) {
        const descriptor = utils_1.findPropertyDescriptor(target, key);
        if (!descriptor.configurable)
            throw new TypeError('This property is sealed.');
        if (descriptor.get)
            throw new TypeError('This property already has a getter.');
        if (descriptor.value !== undefined)
            throw new TypeError('This property has already been initialized.');
        if (enumerable === undefined)
            enumerable = descriptor.enumerable;
        return Object.defineProperty(target, key, new this(key, init, writable, configurable).getAttr(enumerable));
    }
    static getTransform(key, { configurable, enumerable, get, set }, isReconfigure) {
        if (isReconfigure && !configurable)
            throw new TypeError('This property is sealed.');
        if (!get)
            throw new TypeError('This property does not have a getter.');
        if (this.allHandlers.has(get))
            throw new TypeError('This property has already been transformed.');
        return new this(key, get, set, configurable).getAttr(enumerable);
    }
    getAttr(enumerable) {
        const handler = this;
        if (!this.getter)
            LazyHandler.allHandlers.add(this.getter = function () {
                return handler.processValue(this, LazyHandler.$getter);
            });
        if (!this.setter && this.write)
            LazyHandler.allHandlers.add(this.setter = function (value) {
                return handler.processValue(this, value);
            });
        return {
            configurable: true,
            enumerable,
            get: this.getter,
            set: this.setter,
        };
    }
    processValue(instance, newValue) {
        const attr = utils_1.findPropertyDescriptor(instance, this.key);
        let hasValue;
        let value;
        if (attr.configurable) { // Normal flow
            if (newValue === LazyHandler.$getter)
                value = this.init.call(instance, this.key);
            else
                value = newValue;
            Object.defineProperty(instance, this.key, {
                value,
                configurable: this.configurable,
                writable: !!this.write,
                enumerable: attr.enumerable,
            });
        }
        else { // Edge flow
            let cache = LazyHandler.allCache.get(instance);
            if (cache)
                hasValue = this.key in cache;
            else
                LazyHandler.allCache.set(instance, cache = Object.create(null));
            if (newValue !== LazyHandler.$getter)
                value = newValue;
            else if (attr.get && attr.get !== this.getter)
                value = attr.get.call(instance);
            else if (!hasValue)
                value = this.init.call(instance, this.key);
            else if (cache[this.key] === LazyHandler.$getter)
                value = attr.value;
            else
                value = cache[this.key];
            if ((attr.set && attr.set !== this.setter) || attr.writable) {
                cache[this.key] = LazyHandler.$getter;
                instance[this.key] = value;
            }
            else
                cache[this.key] = value;
        }
        if (!hasValue && typeof this.write === 'function')
            this.write.call(instance, value);
        return value;
    }
}
LazyHandler.allCache = new WeakMap();
LazyHandler.allHandlers = new WeakSet();
LazyHandler.$getter = Symbol('getter');
function LazyProperty(target, key, attr) {
    if (Object.isSealed(target))
        throw new TypeError('This object is sealed.');
    return LazyHandler.getTransform(key, attr);
}
exports.LazyProperty = LazyProperty;
// tslint:disable-next-line:no-namespace
(function (LazyProperty) {
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
    function transform(target, ...keys) {
        const { prototype } = target;
        if (Object.isSealed(prototype))
            throw new TypeError('This object is sealed.');
        for (const key of keys)
            Object.defineProperty(prototype, key, LazyHandler.getTransform(key, utils_1.findPropertyDescriptor(prototype, key), true));
        return target;
    }
    LazyProperty.transform = transform;
    function define(target, keyOrDefs, sInit, sWri, sCfg, sEnum) {
        if (Object.isSealed(target))
            throw new TypeError('The object is sealed.');
        if (utils_1.isPropertyKey(keyOrDefs))
            return LazyHandler.define(target, keyOrDefs, sInit, sWri, sCfg, sEnum);
        for (const [key, defOrInit] of Object.entries(keyOrDefs)) {
            if (typeof defOrInit === 'function') {
                LazyHandler.define(target, key, defOrInit);
                continue;
            }
            const { init, writable, configurable, enumerable } = defOrInit;
            LazyHandler.define(target, key, init, writable, configurable, enumerable);
        }
        return target;
    }
    LazyProperty.define = define;
})(LazyProperty = exports.LazyProperty || (exports.LazyProperty = {}));
//# sourceMappingURL=lazy-property.js.map