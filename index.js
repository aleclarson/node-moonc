const {PassThrough} = require('stream')
const {spawn} = require('child_process')
const isReadable = require('is-stream').readable

// End of file indicator.
const EOF = '\n{--}\n'

// Input stream.
let stdin = null

// Output queue.
let queue = []

function moonc(input) {
  if (typeof input != 'string' && !isReadable(input)) {
    throw TypeError('Expected a string or ReadableStream')
  }
  let thru = new PassThrough()
  setImmediate(async () => {
    if (typeof input != 'string') {
      input = await read(input)
    }
    let len = Buffer.byteLength(input)
    if (len == 0) {
      return thru.emit('data', '')
    }
    queue.push(thru)
    stdin.write(thru.input = `\n${len}\n${input}`)
  })
  return thru
}

moonc.promise = function(input) {
  return new Promise((resolve, reject) =>
    moonc(input).once('data', resolve).once('error', reject))
}

module.exports = moonc;

// Transpiler process.
(function moon() {
  let proc = spawn('lua', [__dirname + '/moon.lua'])
  stdin = proc.stdin

  // Exposed for debugging.
  Object.defineProperty(moonc, '_proc', {
    value: proc,
    writable: true,
  })

  proc.stdout.setEncoding('utf8')
  proc.stdout.on('data', (data) => data.split(EOF).forEach(done))

  proc.stderr.setEncoding('utf8')
  proc.stderr.on('data', onError)

  proc.once('error', onError)
  proc.once('exit', () => proc.killed || moon())

  function done(data) {
    if (!data) return

    // TODO: Do something with the source map.
    let [lua, val] = data.split('\n{++}\n')

    let thru = queue.shift()
    if (lua) {
      thru.emit('data', lua)
    } else {
      let i = val.indexOf('Failed')
      if (~i) {
        val = val.slice(i)
        val = '  ' + val.trim().replace(/\n\s*/g, '\n    ')
      }
      thru.emit('error', new SyntaxError(val))
    }
    thru.end()
  }

  function onError(err) {
    console.error(err)
    setImmediate(() => {
      proc.kill(), moon()
      queue.forEach(thru => stdin.write(thru.input))
    })
  }
})()

function read(stream) {
  return new Promise((resolve, reject) => {
    let buf = [], len = 0
    stream.on('data', (data) => {
      if (!Buffer.isBuffer(data)) {
        data = new Buffer(data)
      }
      buf.push(data)
      len += data.length
    }).on('error', reject)
    stream.on('end', () => {
      let data = Buffer.concat(buf, len)
      resolve(data.toString('utf8'))
    })
  })
}
