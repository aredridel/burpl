const { createServer } = require('net')
const { promisify, callbackify } = require('util')
const listen = promisify(require('unix-listen'))
const rpcs = require('multiplex-rpc')
const pump = promisify(require('pump'))

const server = createServer(async conn => {
    const rpc = rpcs({
        list: callbackify(async () => {
            return [
                "user list",
                "user add USER"
            ]
        }),
        command: callbackify(async (name, args) => {
            console.warn(name, args)
        })
    })

    try {
        conn.pipe(rpc).pipe(conn)
        //await pump(rpc, conn, rpc)
    } catch (e) {
        console.error(e.stack || e)
    }
})

listen(server, 'test.sock')
