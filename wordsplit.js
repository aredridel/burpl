module.exports = wordsplit

function wordsplit(line) {
	const out = []
	let pos = 0
	let word = 0
	let state = 'out'
    function emit() {
        const x = line.slice(word, pos)
        if (x.length) out.push(state == 'quot' ? unescape(x) : x)
        word = pos
    }
	while (pos <= line.length) {
		switch (state) {
			case 'out':
				if (line[pos] == '"') {
                    emit()
                    word = pos + 1
					state = 'quot'
				} else if (line[pos] != ' ') {
                    emit()
					state = 'word'
				} else {
                    word = pos
                }
				break;
			case 'quot':
				if (line[pos] == '"') {
                    emit()
                    word++
					state = 'out'
				} else if (line[pos] == '\\') {
					state = 'esc'
				}
				break;
			case 'esc':
				state = 'quot'
				break;
			case 'word':
				if (line[pos] == ' ') {
                    emit()
					state = 'out'
				}
				break;
			default:
				throw new Error(`Internal error: unknown state "${state}"`)

		}
		pos++
	}
    emit()
	return out
}

function unescape(x) {
    return x.replace(/\\(.|$)/, '$1')
}
