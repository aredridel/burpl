const burpl = require('./')
const { promisify } = require('util')
const listen = promisify(require('unix-listen'))

const server = burpl({
    "user list": () => { },
    "user add USER": () => { },
    "user add USER test": () => {}
})

listen(server, 'test.sock')
