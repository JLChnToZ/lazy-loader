Lazy Initializer
===========
Lazy Initializer is a generic deferred object initializer, which will creates a wrapper which waits for your first time use, then it will triggers the initialize function you defined. The concept is similar to [C#'s Lazy<T> class](https://msdn.microsoft.com/en-us/library/dd642331%28v%3Dvs.110%29.aspx) , but more transparent implementation in ES6.

Usage
-----
Just use the `lazyLoader` function provided similar to `function.prototype.call`:
```javascript
const { lazyLoader } = require('lazy-initializer');

function someHeavyInitializer(foo, bar) {
  // Some heavy-loading stuffs here...
  return { foo, bar, baz: this };
}
const obj = lazyLoader(someHeavyInitializer, 'foo', 123, null); // The function is defined to be called, but it is not yet called here.

// Some other stuff unrelated here...

obj.something = 'cool'; // Now it is called here
console.log(obj);
// { foo: 123, bar: null, baz: 'foo', something: 'cool' }
```

Or even simpler if you want to load some node modules since you just need it somewhere...
```javascript
const requireLater = require('lazy-initializer').requireLater(require); // Our loader needs the reference to the require function in current context.

const someModule = requireLater('./path/to/module/you/dont/want/to/load/immediately');

// ...
someModule.someFunction(); // The module is not loaded until you start to use it.
```

Installation
------------
In your Node.js project path, run:
```sh
$ npm install --save lazy-initializer
```

Requirements
------------
This module make uses the new ES6 features, especially [proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), therefore it requires at least Node.js 6+ to works.

[ECMAScript 6 compatibility table](https://kangax.github.io/compat-table/es6/)

License
-------
[MIT](LICENSE)
