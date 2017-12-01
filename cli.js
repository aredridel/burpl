const { promisify } = require('util')
const connect = require('net').connect
const rpcs = require('multiplex-rpc')
const pump = promisify(require('pump'))
const readline = require('readline-ext')
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
				const words = line.split(/\b/)

				let n = trie
				const prefix = []

				// for each word, if the word is unambiguous, expand it
				// if the word is ambiguous and we're at the end, expand as much as we can, else stop
				for (var i = 0; i < words.length; i++) {
					if (!n) break
					const ws = words[i]
					const w = ws[ws.length - 1] == ' ' ? ws.slice(0, -1) : ws
					const pattern = n.children.find(w => w.key == '_')
					const toks = n.children.filter(k => k.key.startsWith(w))
					if (pattern) {
						prefix.push(ws)
						n = pattern
					} else if (toks.length == 1) {
						prefix.push(toks[0].token)
						n = toks[0]
					} else if (i + 1 == words.length) {
						const cp = commonPrefix(n.children.map(e => e.token).filter(e => e.startsWith(w)))
						if (cp) prefix.push(cp)
						break
					} else {
						break
					}
				}

				if (n) {
					// find matching suffixes
					const suffixes = trie2list(n, []).map(suff => {
						const hasVar = suff.findIndex(e => isUpper(e))
						return {
							description: prefix.concat(suff).join(''),
							text: prefix.concat(hasVar != -1 ? suff.slice(0, hasVar) : suff).join('')
						}
					})
					return cb(null, { completions: suffixes, replace: true })
				} else {
					return cb(null, { completions: [prefix.join('')], replace: true })
				}
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

function isUpper(word) {
	return /^[A-Z]+ ?$/.test(word)
}

function compl2trie(completions) {
	const root = { children: [] }
	completions.forEach(e => {
		let n = root
		e.split(/\b/).forEach(w => {
			const k = isUpper(w) ? '_' : w
			if (!n.children.find(e => e.key == k)) {
				const c = { key: k, token: w, children: [] }
				n.children.push(c)
				n = c
			} else {
				n = n.children.find(e => e.key == k)
			}
		})
		n.eol = true
	})

	return root
}

function trie2list(n, pre) {
	if (!n.children.length) return [pre]

	let out = []

	if (n.eol) out.push(pre)

	n.children.forEach(e => {
		out = out.concat(trie2list(e, pre.concat(e.token)))
	})

	return out
}
