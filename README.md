# moonc v0.0.2

Transpile a [MoonScript](https://github.com/leafo/moonscript) file.

```js
const moonc = require('moonc')

// moonc() returns a `ReadableStream` that emits transpiled code.
moonc('x = 1')
  .pipe(fs.createWriteStream('foo.lua'))
  .once('error', console.error)

// moonc.promise() resolves with the transpiled code.
let lua = await moonc.promise('x = 1')

// Both functions work with `ReadableStream` objects, too!
moonc(fs.createReadStream('foo.moon'))
```
