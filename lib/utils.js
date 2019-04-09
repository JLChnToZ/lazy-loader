"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @ignore */
function isObject(target) {
    const type = target && typeof target;
    return type === 'object' || type === 'function';
}
exports.isObject = isObject;
/** @ignore */
function isPropertyKey(target) {
    const type = typeof target;
    return type === 'string' || type === 'number' || type === 'symbol';
}
exports.isPropertyKey = isPropertyKey;
/** @ignore */
var DefaultPropertyDescriptors;
(function (DefaultPropertyDescriptors) {
    /** @ignore */
    DefaultPropertyDescriptors.empty = Object.freeze({
        configurable: true,
        writable: true,
        enumerable: false,
        value: undefined,
    });
    /** @ignore */
    DefaultPropertyDescriptors.emptySealed = Object.freeze({
        configurable: false,
        writable: false,
        enumerable: false,
        value: undefined,
    });
})(DefaultPropertyDescriptors = exports.DefaultPropertyDescriptors || (exports.DefaultPropertyDescriptors = {}));
/** @ignore */
function findPropertyDescriptor(o, key) {
    for (let p = o; p; p = Object.getPrototypeOf(p)) {
        const descriptor = Object.getOwnPropertyDescriptor(p, key);
        if (descriptor)
            return descriptor;
    }
    return DefaultPropertyDescriptors[Object.isExtensible(o) ? 'empty' : 'emptySealed'];
}
exports.findPropertyDescriptor = findPropertyDescriptor;
//# sourceMappingURL=utils.js.map