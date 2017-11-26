const { promisify } = require('util')
const connect = require('net').connect
const rpcs = require('multiplex-rpc')
const pump = promisify(require('pump'))
const readline = require('readline')
const commonPrefix = require('common-prefix')

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
				const trie = compl2trie(completions)
				const words = line.split(/\s+/)

				let n = trie
				const prefix = []

				// for each word, if the word is unambiguous, expand it
				// if the word is ambiguous and we're at the end, expand as much as we can, else stop
				for (var i = 0; i < words.length; i++) {
					if (!n) break
					const w = words[i];
					const pattern = n.children.find(w => w.key == '_')
					const x = n.children.filter(k => k.key.startsWith(w))
					if (pattern) {
						console.warn('__')
						prefix.push(w)
						n = pattern
					} else if (x.length == 1) {
						console.warn('ex')
						prefix.push(x[0].key)
						n = x[0]
					} else if (i + 1 == words.length) {
						console.warn('cp')
						const cp = commonPrefix(n.children.map(e => e.key).filter(e => e.startsWith(w)))
						prefix.push(cp)
						break
					} else {
						break
					}
				}

				console.warn('i', i, 'words.length', words.length, 'n', n)

				if (i == words.length || words[words.length - 1] == '' && n) {
					// find matching suffixes
					const suffixes = trie2list(n, prefix).map(e => e.join(' '))
					console.warn(suffixes)
					return cb(null, [suffixes, line])
				} else {
					return cb(null, [[prefix.join(' ')], line])
				}
			} catch (e) {
				console.warn(e)
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
	rl.on('close', () => rpc.end())
		
	await conn
}

function isUpper(word) {
	return /^[Amap(match).-Z]+$/.test(word) 
}

function compl2trie(completions) {
	const root = { children: [] }
	completions.forEach(e => {
		let n = root
		e.split(/\s+/).forEach(w => {
			const k = isUpper(n.children[w]) ? '_' : w
			if (!n.children.find(e => e.key == k)) {
				const c = { key: k, children: [] }
				n.children.push(c)
				n = c
			} else {
				n = n.children.find(e => e.key == k)
			}
		})
	})

	return root
}

function trie2list(n, pre) {
	if (!n.children.length) return [pre]

	let out = []

	n.children.forEach(e => {
		out = out.concat(trie2list(e, pre.concat(e.key)))
	})

	return out
}
