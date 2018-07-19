const fs = require('fs')
const crypto = require('hypercore-crypto')
const swarmDefaults = require('dat-swarm-defaults')
const discoverySwarm = require('discovery-swarm')
const mswarm = require('hypercore-multicast-swarm')
const hyperclock = require('hyperclock')
const ram = require('random-access-memory')

console.log('Loading clock feed.')
console.log('Bootstrapping off of TCP, then switching to multicast-only...')

let mode = 'Bootstrapping (TCP)'

const key = fs.readFileSync('./key')
const discoveryKey = crypto.discoveryKey(key) 

const clock = hyperclock(ram, key, {
  sparse: true,
  allowPush: true
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
  stream: () => clock.replicate({live: true}),
}))
sw.join(discoveryKey)

sw.on('connection', function (peer, info) {
  console.log('new connection', info.host, info.port,
              info.initiator ? 'outgoing' : 'incoming') 
  peer.on('close', function () {
    console.log('peer disconnected')
  })
})

setTimeout(() => {
  console.log('Closing TCP swarm')
  sw.close()
  mode = 'Multicast only'
}, 3000)

// UDP Multicast
const msw = mswarm(clock, {
  mtu: 900,
  port: 5007,
  address: '224.1.1.1'
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

