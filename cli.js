const { promisify } = require('util')
const connect = require('net').connect
const rpcs = require('multiplex-rpc')
const pump = promisify(require('pump'))
const readline = require('readline-ext')

const match = require('./match')

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
		completer: async (line, cb) => {
			try {
				const completions = await list(line)
				const matched = match(completions, line)
				return cb(null, { completions: matched.completions, replace: true })
			} catch (e) {
				console.warn(e)
				cb(e)
			}
		}
	})

	rl.on('line', async line => {
		line = line.trim()
		try {
			if (line) {
				const response = await command(line)
				if (response) console.log(response)
			}
		} catch (e) {
			console.warn(e)
		}
		rl.prompt()
	})

	rl.on('error', err => console.error(err))

	rl.prompt()

	const conn = pump(rpc, sock, rpc)

	rl.on('close', () => rpc.end())
		
	await conn
}
