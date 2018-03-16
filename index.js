const {PassThrough} = require('stream')
const {spawn} = require('child_process')
const isReadable = require('is-stream').readable

// Request stream.
let stdin = null

// Response queue.
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
    let len = Buffer.byteLength(input) + 1
    stdin.write(len + ' ' + input + '\n')
  })
  queue.push(thru)
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

  proc.stdout.setEncoding('utf8')
  proc.stdout.on('data', (data) => {
    // TODO: Do something with the source map. 
    let [lua, map] = data.split('\r\n')

    let thru = queue.shift()
    thru.emit('data', lua)
    thru.end()
  })

  proc.stderr.setEncoding('utf8')
  proc.stderr.on('data', (err) => {
    err = err.slice(err.indexOf('Failed'))
    err = '  ' + err.trim().replace(/\n\s*/g, '\n    ')

    let thru = queue.shift()
    thru.emit('error', new SyntaxError(err))
    thru.end()
  })

  return proc.on('error', (err) => {
    if (queue.length) {
      // Emit the error on the first stream.
      queue.forEach((thru, i) => {
        if (i == 0) thru.emit('error', err)
        thru.end()
      })
      queue.length = 0
    } else {
      console.error(err)
    }
    // Restart the process.
    moon()
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
