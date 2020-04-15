const { EventEmitter } = require('events')
const { spawn } = require('child_process')
const readline = require('readline')
const xprs = require('xprs')
const tabNine = spawn(process.argv[2], [])
tabNine.on('exit', (code) => {
  console.log('TabNine exited.')
  process.exit(code)
})
const app = xprs({ cors: true })
const rl = readline.createInterface({
  input: tabNine.stdout,
  crlfDelay: Infinity,
})
const events = new EventEmitter()
;(async () => {
  for await (const line of rl) {
    console.log(`>> ${line}`)
    try {
      events.emit('response', JSON.parse(line))
    } catch (error) {
      console.error(error)
    }
  }
})()

app.post('/tabnine', (req, res) => {
  tabNine.stdin.write(JSON.stringify(req.body) + '\n')
  events.once('response', (response) => {
    res.json(response)
  })
})

app.listen(8123, '127.0.0.1')
