const {PassThrough} = require('stream')
const {spawn} = require('child_process')
const isReadable = require('is-stream').readable
const huey = require('huey')

// Output stream delimiters.
const ERR = '\n{!!}\n'
const EOF = '\n{--}\n'

// Input stream.
let stdin = null

// Pending requests.
let pending = []

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
    pending.push(thru)
    stdin.write(thru.input = len + '\n' + input)
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
  proc.stdout.on('data', (data) => {
    data = data.split(EOF)
    data.pop() // Pop the empty line caused by trailing EOF.
    data.forEach(done)
  })
  function done(data) {
    let [lua, err] = data.split(ERR)

    let thru = pending.shift()
    if (err == null) {
      thru.emit('data', lua)
    } else {
      let i = err.indexOf('Failed')
      if (~i) {
        err = err.slice(i)
        err = '  ' + err.trim().replace(/\n\s*/g, '\n    ')
      }
      thru.emit('error', new SyntaxError(err))
    }
    thru.end()
  }

  proc.stderr.setEncoding('utf8')
  proc.stderr.on('data', (data) => {
    console.log(huey.red(data.replace(/(^|\n)/g, '$1stdout: ')))
  })

  proc.once('error', (err) => {
    console.error(err)
    if (proc) {
      proc.kill()
      proc = null

      moon() // Restart the transpiler.

      // Retry pending requests.
      setImmediate(() => {
        pending.forEach(thru => stdin.write(thru.input))
      })
    }
  }).once('exit', (code) => {
    if (code > 0 && proc) proc = null, moon()
  })
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
