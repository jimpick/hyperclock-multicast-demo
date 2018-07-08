const fs = require('fs')
const hyperclock = require('hyperclock')
const hyperproxy = require('hypercore-protocol-proxy')
const ram = require('random-access-memory')
const swarmDefaults = require('dat-swarm-defaults')
const discSwarm = require('discovery-swarm')
const discSwarmMulti = require('./lib/discovery-swarm-multicast')
const pump = require('pump')
const protocol = require('hypercore-protocol')

const clock = hyperclock(ram, {interval: 1000})

clock.ready(() => {
  fs.writeFileSync('./key', clock.key)

  const {stream: hpStream, proxy} = hyperproxy(clock.key, {live: true})

  const clockStream = protocol({broadcast: true})
  clock.replicate({
    live: true,
    stream: clockStream
  })

  pump(
    hpStream,
    clockStream,
    hpStream,
    err => {
      console.log('Feed Pump done', err)
    }
  )

  // TCP
  const sw = discSwarm(swarmDefaults({
    tcp: true,
    utp: false,
    dht: false,
    live: true,
    hash: false,
    dns: {
      server: null, domain: 'dat.local'
    },
    stream: () => protocol(),
    connect: (connection, swarmStream) => {
      console.log('Swarm connect')
      proxy(swarmStream, {stream: connection})
    }
  }))
  sw.join(clock.discoveryKey)
  sw.on('connection', function (peer, info) {
    console.log('new connection', info.host, info.port,
                info.initiator ? 'outgoing' : 'incoming') 
    peer.on('close', function () {
      console.log('peer disconnected')
    })
  })

  // Multicast
  const swMulti = discSwarmMulti(swarmDefaults({
    dht: false,
    live: true,
    hash: false,
    dns: false,
    /*
    dns: {
      server: null, domain: 'dat.local'
    },
    */
    stream: () => protocol({
      timeout: false,
      broadcast: true,
      encrypt: false
    }),
    connect: (connection, swarmStream) => {
      console.log('Swarm multi connect')
      connection.label = 'multicast_out'
      proxy(swarmStream, {stream: connection})
    }
  }))
  swMulti.join(clock.discoveryKey)
  swMulti.on('connection multicast', function (peer, info) {
    console.log('new connection multicast', info.host, info.port,
                info.initiator ? 'outgoing' : 'incoming') 
    peer.on('close multicast', function () {
      console.log('peer disconnected multicast')
    })
  })

  clock.createReadStream({live: true}).on('data', console.log)
})


