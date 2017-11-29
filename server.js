const { createServer } = require('net')
const { promisify, callbackify } = require('util')
const listen = promisify(require('unix-listen'))
const rpcs = require('multiplex-rpc')

const server = createServer(async conn => {
    const commands = [
        "user list",
        "user add USER",
        "user add USER test"
    ]
    const rpc = rpcs({
        list: callbackify(async () => {
            return commands
        }),
        command: callbackify(async (name, args) => {
            if (commands.indexOf(name) == -1) throw new Error(`Unknown command '${name}'`)
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
