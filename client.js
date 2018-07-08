const fs = require('fs')
const crypto = require('hypercore-crypto')
const swarmDefaults = require('dat-swarm-defaults')
const discoverySwarm = require('discovery-swarm')
const hyperclock = require('hyperclock')
const ram = require('random-access-memory')
const pump = require('pump')
const hyperproxy = require('hypercore-protocol-proxy')
const protocol = require('hypercore-protocol')
const dgram = require('dgram')
const stream = require('stream')
const duplexify = require('duplexify')

let mode = 'Bootstrapping (TCP)'

const key = fs.readFileSync('./key')
const discoveryKey = crypto.discoveryKey(key) 

const {stream: hpStream, proxy} = hyperproxy(key, {live: true})

const clock = hyperclock(ram, key, {
  sparse: true,
  allowPush: true
})
const clockStream = clock.replicate({live: true})
clockStream.label = 'destFeed'
hpStream.label = 'proxyDestFeed'

pump(
  hpStream,
  clockStream,
  hpStream,
  err => {
    console.log('Feed Pump done', err)
  }
)

const sw = discoverySwarm(swarmDefaults({
  tcp: true,
  utp: false,
  dht: false,
  live: true,
  hash: false,
  dns: {
    server: null, domain: 'dat.local'
  },
  stream: () => protocol({live: true}),
  connect: (connection, swarmStream) => {
    console.log('Jim swarm connect')
    proxy(swarmStream, {stream: connection})
  }
}))

// sw.listen(0)
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

const multicastReadable = stream.Readable({read: () => {}})
const multicastStream = duplexify(
  null,
  multicastReadable
)

const PORT = 5007
const client = dgram.createSocket('udp4')

client.on('listening', function () {
  const address = client.address()
  console.log('UDP Client listening on ' + address.address + ":" + address.port)
  client.setBroadcast(true)
  client.setMulticastTTL(128)
  client.addMembership('224.1.1.1')
})

setTimeout(() => {
  client.on('message', function (message, remote) {
    // console.log('From: ' + remote.address + ':' + remote.port, message)
    // multicastReadable.push(message)
    multicastStream.push(message)
  })
}, 500)

client.bind(PORT)

function sendToProxy () {
  console.log('Starting multicast proxy stream')
  const multicastProxyStream = protocol({
    timeout: false,
    encrypt: false,
    live: true
  })
  multicastProxyStream._remoteFeeds[0] = multicastProxyStream._feed(discoveryKey)
  const feed = proxy(multicastStream, {stream: multicastProxyStream})
  // feed.handshake({})
  multicastProxyStream.on('close', () => {
    console.log('Proxy stream closed')
    sendToProxy()
  })
  multicastProxyStream.on('error', err => {
    console.log('Proxy stream error', err ? err.message : '')
  })
}

sendToProxy()

// Display clock
clock.ready(() => {
  console.log('Key:', clock.key.toString('hex'))
  console.log('Length', clock.length)
  clock.createReadStream({live: true, tail: true}).on('data', data => {
    console.log(`${mode}: ${data.time}`)
    // console.log('\n\n')
  })
})

