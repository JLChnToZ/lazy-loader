'use strict';

// Proxy trap handler that hides the real deferred handler structure
// and interface to the reseolved object transparently.
const handler = Object.getOwnPropertyNames(Reflect).reduce((handler, trap) => {
  const applyTrap = Function.prototype.apply.bind(Reflect[trap], null);
  handler[trap] = function(target) {
    // Trigger of real magic starts from here :)
    // Remap the target to the value field.
    // It will auto trigger the resolver if it is not resolved.
    arguments[0] = target.value;
    return applyTrap(arguments);
  };
  return handler;
}, {});

// Simple circular blocker, it will just throw an error when anyone is
// trying to touch the contents while it is not ready.
const preventCircular = {
  get() {
    throw new ReferenceError('Deferred object is not yet resolved');
  },
  configurable: true
};

// Resolve handler, which will be executed on first time fetching contents.
const deferredResolver = {
  get() {
    // Replace the value to error getter before we try to resolve
    // to prevent accident circular calling.
    Object.defineProperty(this, 'value', preventCircular);

    // Replace the value to resolved object instance
    // and delete the resolver function reference,
    // we don't need to call it again and again.
    return Object.defineProperties(this, {
      value: { value: Wrapper.wrap(this.resolved) },
      resolved: { value: undefined }
    }).value;
  },
  configurable: true
};

const primitiveTypeNames = ['undefined', 'boolean', 'number', 'string', 'symbol'];

// Wrapper for primitive types: Instead of directly store the primitive value,
// we wrap it with a value field inside a new constructed object.
class Wrapper {
  constructor(value) { this.value = value; }
  valueOf() { return this.value; }
  toJSON() { return this.value; }
  toString() { return this.value.toString(); }

  // Wrap the value if it is needed,
  // since the primitive types cannot be proxied directly.
  static wrap(value) {
    return (value === null || primitiveTypeNames.indexOf(typeof value) >= 0) ?
      new Wrapper(value) : value;
  }
}

// Main loader entry point
function lazyLoader(fn, thisArg) {
  // Wraps the loader/initializer function to a new object proxy
  // and wait to be fired until anyone tries to touch it.
  return new Proxy(Object.defineProperties({}, {
    value: deferredResolver,
    resolved: {
      get: Function.prototype.bind.apply(fn, Array.prototype.slice.call(arguments, 1)),
      configurable: true
    }
  }), handler);
}

// Simple wrapper for require function
// Usage: const requireLater = require('lazy-loader').requireLater(require);
// const someModule = requireLater('some-module');
function requireLater(require) {
  return lazyLoader.bind(null, require, null);
}

module.exports = { lazyLoader, requireLater };
