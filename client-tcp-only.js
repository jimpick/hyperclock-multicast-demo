const fs = require('fs')
const crypto = require('hypercore-crypto')
const swarmDefaults = require('dat-swarm-defaults')
const discoverySwarm = require('discovery-swarm')
const hyperclock = require('hyperclock')
const ram = require('random-access-memory')

console.log('Loading clock feed.')
console.log('TCP only...')

let mode = 'TCP only'

const key = fs.readFileSync('./key')
const discoveryKey = crypto.discoveryKey(key) 

const clock = hyperclock(ram, key, {
  sparse: true
})
const sw = discoverySwarm(swarmDefaults({
  tcp: true,
  utp: false,
  dht: false,
  live: true,
  hash: false,
  dns: {
    server: null, domain: 'dat.local'
  },
  stream: () => clock.replicate({live: true})
}))

sw.join(discoveryKey)

sw.on('connection', function (peer, info) {
  console.log('new connection', info.host, info.port,
              info.initiator ? 'outgoing' : 'incoming') 
  peer.on('close', function () {
    console.log('peer disconnected')
  })
})

// Display clock
clock.ready(() => {
  console.log('Key:', clock.key.toString('hex'))
  console.log('Discovery Key:', clock.discoveryKey.toString('hex'))
  clock.update(() => {
    console.log('Length', clock.length)
    clock.createReadStream({live: true, tail: true}).on('data', data => {
      console.log(`${mode}: ${data.time}`)
    })
  })
})

