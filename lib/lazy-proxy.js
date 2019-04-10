"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const lazy_property_1 = require("./lazy-property");
const function_proxy_resolver_1 = require("./function-proxy-resolver");
const utils_1 = require("./utils");
/** Lazy initializer proxy factory */
var LazyProxy;
(function (LazyProxy) {
    // If arrow function has been transpiled to full function object,
    // enforce to use the constructor handler in order to correctly follow the rules.
    const forceConstructor = !!(() => { }).prototype;
    const wrappers = new WeakMap();
    class LazyHandler {
        constructor(init) {
            this.init = init;
        }
        get dummy() {
            return LazyHandler.dummy;
        }
        get source() {
            const result = Object(this.init());
            delete this.init; // Release reference
            return result;
        }
        has(_, key) {
            return Reflect.has(this.source, key);
        }
        get(_, key, receiver) {
            return function_proxy_resolver_1.FunctionProxyResolver.wrap(Reflect.get(this.source, key, receiver));
        }
        set(_, key, value, receiver) {
            return Reflect.set(this.source, key, function_proxy_resolver_1.FunctionProxyResolver.unwrap(value), receiver);
        }
        deleteProperty(_, key) {
            return Reflect.deleteProperty(this.source, key);
        }
        ownKeys(_) {
            return Reflect.ownKeys(this.source);
        }
        getOwnPropertyDescriptor(_, key) {
            const attributes = Reflect.getOwnPropertyDescriptor(this.source, key);
            // Rule breaking resolver: Let all properties looks like configurable.
            if (attributes)
                attributes.configurable = true;
            return attributes ||
                // Tell some lie: If not exists and proxified object is non extensible,
                // treat this property as exists, undefined, configurable but read only.
                (!Reflect.isExtensible(this.source) ?
                    utils_1.DefaultPropertyDescriptors.empty :
                    undefined);
        }
        defineProperty(_, key, attributes) {
            // Rule breaking resolver: Don't allow to seal any properties.
            if (!attributes.configurable)
                return false;
            if (attributes.value)
                attributes.value = function_proxy_resolver_1.FunctionProxyResolver.unwrap(attributes.value);
            return Reflect.defineProperty(this.source, key, attributes);
        }
        getPrototypeOf(_) {
            return Reflect.getPrototypeOf(this.source);
        }
        setPrototypeOf(_, proto) {
            return Reflect.setPrototypeOf(this.source, function_proxy_resolver_1.FunctionProxyResolver.resolve(proto));
        }
        preventExtensions(_) {
            // Rule breaking resolver: Don't allow to seal the proxified object.
            return false;
        }
        apply(_, thisArg, args) {
            return Reflect.apply(this.source, function_proxy_resolver_1.FunctionProxyResolver.resolve(thisArg), function_proxy_resolver_1.FunctionProxyResolver.resolveAll(args));
        }
    }
    // Rule breaking resolver: Apply trap needs the dummy object be a callable function.
    // Arrow function is safest as it does not have any extra properties.
    LazyHandler.dummy = () => {
        throw new Error('This should not be called');
    };
    __decorate([
        lazy_property_1.LazyProperty
    ], LazyHandler.prototype, "source", null);
    /** Alternative handler with constructor function support */
    class ConstructorLazyHandler extends LazyHandler {
        get dummy() {
            return ConstructorLazyHandler.dummy;
        }
        /*public has(target: T, key: PropertyKey) {
          // Rule breaking resolver: Sealed property in dummy cannot marked non-exists.
          return super.has(target, key) ||
            !!getDescriptorIfSealed(target, key);
        }*/
        /*public get(target: T, key: PropertyKey, receiver: any) {
          // Rule breaking resolver: The value of property must be the same as the dummy
          // if that is sealed and read only.
          const original = getDescriptorIfSealed(target, key);
          return original && !original.get ? original.value :
            super.get(target, key, receiver);
        }*/
        set(target, key, value, receiver) {
            // Rule breaking resolver: Assigning value to property which
            // has same key but read only sealed in dummy is forbidden.
            const original = getDescriptorIfSealed(target, key);
            return original && !original.writable && !original.set ? false :
                super.set(target, key, value, receiver);
        }
        deleteProperty(target, key) {
            // Rule breaking resolver: Deleting a property which
            // has same key but sealed in dummy is forbidden.
            return getDescriptorIfSealed(target, key) ? false :
                super.deleteProperty(target, key);
        }
        getOwnPropertyDescriptor(target, key) {
            const attr = super.getOwnPropertyDescriptor(target, key);
            // Rule breaking resolver: If dummy property is exists but non-configurable,
            // replace all getter/setter/value to reflected ones or dummy if undefined and return.
            const original = getDescriptorIfSealed(target, key);
            if (!original)
                return attr;
            if (original.get)
                original.get = attr && attr.get || (() => { });
            if (original.set)
                original.set = attr && attr.set || (() => { });
            else if (!original.get)
                original.value = attr && attr.value;
            return original;
        }
        defineProperty(target, key, attributes) {
            // Rule breaking resolver: Redefining a property which
            // has same key but sealed in dummy is forbidden.
            return getDescriptorIfSealed(target, key) ? false :
                super.defineProperty(target, key, attributes);
        }
        ownKeys(target) {
            const keys = super.ownKeys(target);
            const keySet = new Set(keys);
            // Rule breaking resolver: Union all dummy properties which non-configurable
            for (const key of Reflect.ownKeys(target))
                if (getDescriptorIfSealed(target, key) && !keySet.has(key))
                    keys.push(key);
            return keys;
        }
        construct(_, args, newTarget) {
            return Reflect.construct(this.source, function_proxy_resolver_1.FunctionProxyResolver.resolveAll(args), newTarget);
        }
    }
    // Rule breaking resolver: We need a fully crafted function as dummy object
    // to use with construct traps.
    ConstructorLazyHandler.dummy = function () {
        throw new Error('This should not be called');
    };
    function getDescriptorIfSealed(target, key) {
        const original = Reflect.getOwnPropertyDescriptor(target, key);
        return original && !original.configurable && original || undefined;
    }
    function create(init, isConstructor) {
        const handler = (isConstructor || forceConstructor) ?
            new ConstructorLazyHandler(init) :
            new LazyHandler(init);
        const wrapper = new Proxy(handler.dummy, handler);
        wrappers.set(wrapper, handler);
        return wrapper;
    }
    LazyProxy.create = create;
    /**
     * Get the target source object of a proxy. Will returns itself if not found.
     * If the initializer is not yet resolved, it will resolves immediately.
     * @param maybeProxy The wrapped proxy.
     */
    function getSource(maybeProxy) {
        if (utils_1.isObject(maybeProxy)) {
            const handler = wrappers.get(maybeProxy);
            if (handler)
                return handler.source;
        }
        return maybeProxy;
    }
    LazyProxy.getSource = getSource;
    function_proxy_resolver_1.FunctionProxyResolver.register(getSource);
})(LazyProxy = exports.LazyProxy || (exports.LazyProxy = {}));
//# sourceMappingURL=lazy-proxy.js.map