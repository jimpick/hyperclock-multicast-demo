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

The code is really crude right now. The multicast IP address is
hardcoded.

This has only been tested on a single machine. For now, I've set up
discovery to be mdns only, so it will only work if the server and
client are on the same local subnet.

I made a small modification to hypercore replication to force it to
"broadcast" every append on the server side.

I'm using hypercore-protocol-proxy on both the server side and the
client side. On the server side, both the normal swarm and the
multicast are getting broadcasted messages ... ideally, only the
multicast side would get those.

On the client side, it receives the same messages from both the
normal swarm and the multicast channel. Ideally, once it starts
receiving messages on the multicast channel, it would stop
requesting updates on the swarm. To make the demo work, we just
disconnect from the normal swarm after a few seconds so we can
observe the multicast channel working. Ideally, we'd like to
stay connected to the normal swarm and only use it to re-fetch any
messages that got dropped on the UDP multicast channel.

There is a hacked up version of discovery-swarm used for the server side
of the multicast udp connection... it could be replaced with something
much simpler. I may try to add some support for advertising on the
discovery servers.
