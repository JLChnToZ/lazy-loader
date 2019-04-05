Lazy Initializer
===========
[![GitHub issues](https://img.shields.io/github/issues/JLChnToZ/lazy-loader.svg)](https://github.com/JLChnToZ/lazy-loader/issues)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/JLChnToZ/lazy-loader/blob/master/LICENSE)
[![Node version](https://img.shields.io/node/v/lazy-initializer.svg)](https://github.com/JLChnToZ/lazy-loader/blob/master/package.json)
[![NPM version](https://img.shields.io/npm/v/lazy-initializer.svg)](https://www.npmjs.com/package/lazy-initializer)
[![NPM downloads](https://img.shields.io/npm/dt/lazy-initializer.svg)](https://www.npmjs.com/package/lazy-initializer)

Lazy Initializer is a generic deferred object initializer, which will creates a wrapper which waits for your first time use,
then it will triggers the initialize function you defined.
The concept is similar to [C#'s Lazy<T> class](https://msdn.microsoft.com/en-us/library/dd642331%28v%3Dvs.110%29.aspx),
but more transparent implementation in ES6.

Usage
-----
Simple usage for wrapping a property in a class:
```javascript
import { LazyProperty } from 'lazy-initializer'; // or require(...) if your environment does not support import.

class Schrodinger {
  @LazyProperty
  get cat() { return Math.random() > 0.5; }
  // Setter will be called when the value has been assigned first time.
  // Setters can be not defined, but then the property will be read-only.
  set cat(value) {
    console.log(`It is ${value ? 'alive' : 'dead'} now!`);
    assert.strictEqual(value, this.cat);
  }
}

const isAlive = new Schrodinger().cat;
```

Alternatively, if your transpiler or environment does not support ES6 decorators:
```javascript
import { LazyProperty } from 'lazy-initializer';

class Schrodinger {
  get cat() { return Math.random() > 0.5; }
}
LazyProperty.transform(Schrodinger, 'cat');
```

Also, you may manually craete a new lazy property without defining the getter/setter before:
```javascript
import { LazyProperty } from 'lazy-initializer';

const someObject = {};
LazyProperty.define(someObject, 'somelazyField', () => 'boo!');
// Then, `someObject` has a `somelazyField` now!

// You may batch define more properties like this:
LazyProperty.define(someObject, {
  someOtherLazyField: () => 'another one!',
  someMoreComplicatedLazyField: {
    init: () => 'More controllable behaviour!',
    enumerable: false,
    configurable: false,
    writable: true,
  },
});
```

Another advanced usage is wrapping a whole object (which uses proxy):
```javascript
import { LazyProxy } from 'lazy-initializer';

const somethingExpensive = LazyProxy.create(() => {
  // Some heavy stuffs...
  return someHeavyObject;
});

// You may treat the object is loosely equals to the initialized object itself.
const someValue = somethingExpensive.someValue();
```

If the lazy initialized object will be used as constructors:
```javascript
import { LazyProxy } from 'lazy-initializer';

const SomeHeavyConstructor = LazyProxy.create(() => {
  // Some heavy stuffs...
  return Foo;
}, true);
// The true means this will use as constructor,
// the proxy internals will do some tweaks to make this to be supported.

const someValue = new SomeHeavyConstructor();
```
For more information, please see [docs](https://code.moka-rin.moe/lazy-loader/).

Installation
------------
In your Node.js project path, run:
```sh
$ npm install --save lazy-initializer
```
or yarn
```sh
$ yarn add lazy-initializer
```

Requirements
------------
This module make uses the new ES6 features, especially [proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy),
therefore it requires at least Node.js 6+ to works.

[ECMAScript 6 compatibility table](https://kangax.github.io/compat-table/es6/)

License
-------
[MIT](LICENSE)
