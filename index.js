const {PassThrough} = require('stream')
const {spawn} = require('child_process')

function moonc(input) {
  let thru = new PassThrough()
  let proc = spawn('moonc', ['--'])
  proc.stdout.pipe(thru)
  proc.stderr.on('data', (data) => {
    let err = data.toString()
    err = err.slice(err.indexOf('Failed'))
    err = '  ' + err.trim().replace(/\n\s+/g, '\n    ')
    thru.emit('error', new SyntaxError(err))
  })
  proc.once('close', () => thru.end())
  proc.once('error', (err) => thru.emit('error', err))
  if (typeof input == 'string') {
    proc.stdin.write(input)
    proc.stdin.end()
  } else {
    input.pipe(proc.stdin)
  }
  return thru
}

moonc.promise = function(input) {
  return new Promise((resolve, reject) =>
    moonc(input).once('data', resolve).once('error', reject))
}

module.exports = moonc
