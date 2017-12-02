const burpl = require('./')
const { promisify } = require('util')
const listen = promisify(require('unix-listen'))

const server = burpl({
    "user list": () => ["kat", "katrina", "katriona"].join("\n"),
    "user add USER": (user) => `added user '${user}'`,
    "user add USER test": (user) =>`added user '${user}' in test mode`,
})

listen(server, 'test.sock')
