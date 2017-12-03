const { tokenize } = require('@aredridel/string-tokenize')
const commonPrefix = require('common-prefix')

module.exports = function match(completions, line) {
	// This function could be broken up some, but not sure how to do so yet.
	const trie = compl2trie(completions)
	const words = wordsplit(line);

	let nextNode = trie
	const prefix = []

	// for each word, if the word is unambiguous, expand it
	// if the word is ambiguous and we're at the end, expand as much as we can, else stop
	for (var i = 0; i < words.length; i++) {
		if (!nextNode) break
		const ws = words[i]
		const w = ws[ws.length - 1] == ' ' ? ws.slice(0, -1) : ws
		const pattern = nextNode.children.find(w => w.key == '_')
		const toks = nextNode.children.filter(k => k.key.startsWith(w))
		if (pattern) {
			prefix.push({ input: ws, token: pattern, variable: true })
			nextNode = pattern
		} else if (toks.length == 1) {
			prefix.push({ input: ws, token: toks[0] })
			nextNode = toks[0]
		} else if (i + 1 == words.length) {
			const cp = commonPrefix(nextNode.children.map(e => e.token).filter(e => e.startsWith(w)))
			if (cp) {
				prefix.push({ input: cp, incomplete: true })
			} else {
				nextNode = null
			}
			break
		} else {
			nextNode = null
			break
		}
	}

	const commandComplete = !prefix[prefix.length - 1] || prefix[prefix.length - 1].incomplete || !prefix[prefix.length - 1].token.eol 
	const command = commandComplete ? null : prefix.map(expandCommand).join('')
	const args = commandComplete ? [] : prefix.filter(e => e.variable).map(e => e.input)

	if (nextNode) {
		// find matching suffixes
		const suffixes = trie2list(nextNode, []).map(suff => {
			const hasVar = suff.findIndex(e => isUpper(e))
			return {
				description: prefix.map(expandInput).concat(suff).join(''),
				text: prefix.map(expandInput).concat(hasVar != -1 ? suff.slice(0, hasVar) : suff).join('')
			}
		})
		return { completions: suffixes, command, args }
	} else {
		return { completions: [prefix.map(expandInput).join('')], command, args }
	}
}

function expandInput(ent) {
	if (ent.variable) {
		return ent.input
	} else if (ent.incomplete) {
		return ent.input
	} else {
		return ent.token.token
	}
}

function expandCommand(ent) {
	return ent.token.token
}

function compl2trie(completions) {
	const root = { children: [] }
	completions.forEach(e => {
		let n = root
		wordsplit(e).forEach(w => {
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


function wordsplit(line) {
	return tokenize(line, [' ', '\t'], true, true).map(e => e.v)
}
