# hyperclock-multicast-demo

`node server`

(this starts a 1-second hyperclock timer, and writes the
public key out to a file)

In another terminal, run:

`node client`

The client will read the public key from the file, and then "bootstrap"
via mdns discovery. It will also connect to the multicast address and
listen for messages.

After a few seconds, the initial connect to the swarm is disconnected,
and the demo will only receive messages via the multicast address.

# Notes

This is based on:

* **hypercore-multicast-swarm**: [mafintosh/hypercore-multicast-warm](https://github.com/mafintosh/hypercore-multicast-swarm)

