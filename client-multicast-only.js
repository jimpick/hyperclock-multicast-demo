const fs = require('fs')
const crypto = require('hypercore-crypto')
const swarmDefaults = require('dat-swarm-defaults')
const discoverySwarm = require('discovery-swarm')
const mswarm = require('hypercore-multicast-swarm')
const hyperclock = require('hyperclock')
const ram = require('random-access-memory')

console.log('Loading clock feed. (Multicast only)')
console.log("!!! Doesn't work (probably needs bootstrapping)")

let mode = 'Multicast only'

const key = fs.readFileSync('./key')
const discoveryKey = crypto.discoveryKey(key) 

const clock = hyperclock(ram, key, {
  sparse: true,
  allowPush: true
})

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
  console.log('Length', clock.length)
  clock.createReadStream({live: true, tail: true}).on('data', data => {
    console.log(`${mode}: ${data.time}`)
  })
})

