
const commonPrefix = require('common-prefix')

module.exports = function match(completions, line) {
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
			if (cp) {
				prefix.push(cp)
			} else {
				n = null
			}
			break
		} else {
			n = null
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
		return { completions: suffixes }
	} else {
		return { completions: [prefix.join('')] }
	}
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

function isUpper(word) {
	return /^[A-Z]+ ?$/.test(word)
}

