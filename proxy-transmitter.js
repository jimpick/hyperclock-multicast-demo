const fs = require('fs')
const crypto = require('hypercore-crypto')
const swarmDefaults = require('dat-swarm-defaults')
const discoverySwarm = require('discovery-swarm')
const mswarm = require('hypercore-multicast-swarm')
const hypercore = require('hypercore')
const ram = require('random-access-memory')

// Maybe use? https://github.com/mafintosh/multi-random-access

console.log('Proxying feed from swarm to multicast')

const key = fs.readFileSync('./key')
const discoveryKey = crypto.discoveryKey(key)
console.log('Key:', key.toString('hex'))
console.log('Discovery Key:', discoveryKey.toString('hex'))

const feed = hypercore(ram, key, {sparse: true})
// const feed = hypercore(ram, key)
const sw = discoverySwarm(swarmDefaults({
  tcp: true,
  utp: false,
  dht: false,
  live: true,
  hash: false,
  dns: {
    server: null, domain: 'dat.local'
  },
  stream: () => feed.replicate({live: true})
}))

sw.join(discoveryKey)

sw.on('connection', function (peer, info) {
  console.log('new connection', info.host, info.port,
              info.initiator ? 'outgoing' : 'incoming') 
  peer.on('close', function () {
    console.log('peer disconnected')
  })
})

const msw = mswarm(feed, {
  mtu: 900,
  port: 5007,
  address: '224.1.1.1'
})

feed.on('download', (index, data) => {
  console.log('Download', index, data)
  msw.multicast(index)
})
feed.on('append', () => {
  console.log('Append', feed.length)
})

feed.ready(() => {
  feed.update(() => {
    console.log('Jim length', feed.length)
    stream = feed.createReadStream({live: true, tail: true})
    stream.on('data', data => {
      console.log('Data', data)
    })
  })
})
