const { promisify } = require('util')
const connect = require('net').connect
const rpcs = require('multiplex-rpc')
const pump = promisify(require('pump'))
const readline = require('readline')

const args = require('yargs')
	.usage('$0 -s socket')
	.alias('s', 'socket')
	.describe('s', 'path to socket to connect to')
	.demandOption('s')
	.argv

main(args)

async function main(args) {
	const sock = await connect(args.socket)
	const rpc = rpcs()
	const o = rpc.wrap(['command', 'list'])
	const command = promisify(o.command)
	const list = promisify(o.list)
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		completer: (line, cb) => {
			try {
				const completions = await list(line)
				cb(null, [completions, line])
			} catch (e) {
				cb(e)
			}
		}
	})

	rl.on('line', async line => {
		console.log(line)
		console.log(await command(line))
		rl.prompt()
	})

	rl.on('error', err => console.error(err))

	rl.prompt()

	const conn = pump(rpc, sock, rpc)

	//console.warn(await list())
	//console.warn(await command('user list', []))
	rpc.end()
	await conn
}
