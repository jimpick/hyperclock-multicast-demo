const fs = require('fs')
const crypto = require('hypercore-crypto')
const swarmDefaults = require('dat-swarm-defaults')
const discoverySwarm = require('discovery-swarm')
const mswarm = require('hypercore-multicast-swarm')
const hypercore = require('hypercore')
const ram = require('random-access-memory')
const gcStats = require('gc-stats')

let gcHeapUsed = 0
let count = 0

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
  // console.log('Download', index)
  process.stdout.write('.')
  msw.multicast(index, err => {
    if (err) console.error('\nMulticast error', index, err.message)
    // console.log('Sent', index)
    const clearIndex = index - 500
    if (false && clearIndex >= 0) {
      feed.clear(clearIndex, err => {
        if (err) console.error('\nError clearing', clearIndex, err.message)
        process.stdout.write('x')
        // console.log('Cleared', index, err)
      })
    }
  })
  if ((count++ % 100) === 0) {
    // console.log('Jim1', index, count)
    feed._storage.data.stat((err, info) => {
      // console.log('Jim data stat', info)
      const heapUsed = Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024 * 100
      ) / 100
      const ramUsed = Math.round(
        info.size / 1024 / 1024 * 100
      ) / 100
      console.log(
        '\nDownload', index,
        'RAM:', ramUsed.toFixed(3),
        'GC:', gcHeapUsed.toFixed(3),
        'GC-RAM:', (gcHeapUsed-ramUsed).toFixed(3),
        'Current:', heapUsed.toFixed(3)
      )
    })
  }
})

feed.ready(() => {
  feed.update(() => {
    console.log('Length', feed.length)
    stream = feed.createReadStream({live: true, tail: true})
    stream.on('data', data => {
      // console.log('Data', data)
    })
  })
})

const gc = gcStats()
gc.on('stats', function (stats) {
  gcHeapUsed = Math.round(
    process.memoryUsage().heapUsed / 1024 / 1024 * 100
  ) / 100
  // console.log('GC happened', gcHeapUsed, stats)
})

function dumpMemoryUsage () {
  const used = process.memoryUsage()
  for (let key in used) {
    console.log(`  ${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`)
  }
}

