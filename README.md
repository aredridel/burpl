# Bogus Underground Read-Print-Loop

(A REPL library with some better ergonomics)


As a long time user of Cisco network products and routing daemons such as [Quagga (nee Zebra)](http://www.nongnu.org/quagga/), I've come to enjoy their sort of CLI. The tab completion is really good for exploring what the system can do. Either that or I have Stockholm syndrome setting in and it's actually terrible. I'm never sure when it comes to old command line technologies. I do use plain vi and mksh. So take it with a grain of salt.

The long and short of it is that the command language looks something like this:

```
show ip routes
show ipv6 routes
show status
enable
```

and if you press the tab key at a prompt, it'll helpfully spit out what you can do from there for each word, and it also lets you abbreviate if you're not ambiguous. 

```
sh ip r
```

That's actually a legit alias for `show ip routes` given that list of available commands.

This package is a client and server for these interactions. There's a generic `burpl` command, modelled after Quagga's [vtysh](http://www.nongnu.org/quagga/docs/docs-multi/VTY-shell.html), and a server component that lets you supply an object of `"command": async function` pairs, and get back a server you just need to listen on an AF_UNIX socket.

## Example

```
const burpl = require('burpl')
const { promisify } = require('util')
const listen = promisify(require('unix-listen'))

const users = [ "aphrodite", "eris", "persephone", "sappho"];

const server = burpl({
    "help": async () => "There is no help for you",
    "user list": () => users.join("\n"),
    "user add USER": (user) => {
		return `added user '${user}' (I lie)`;
	},
    "user add USER really": async (user) => {
		await Promise.resolve(user).then(user => users.push(user));
		return `added user '${user}' for real`;
	},
})

listen(server, 'test.sock')
```

You can communicate with this server using `burpl -s test.sock`.

![A screen capture of burpl in use](example.gif)
