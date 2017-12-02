const { createServer } = require('net')
const { callbackify } = require('util')
const rpcs = require('multiplex-rpc')


module.exports = function(language) {

    const server = createServer(async conn => {
        const commands = Object.keys(language)

        const rpc = rpcs({
            list: callbackify(async () => {
                return commands
            }),
            command: callbackify(async (name, args) => {
                if (!language[name]) throw new Error(`Unknown command '${name}'`)
                return await language[name].apply(null, args)
            })
        })

        try {
            conn.pipe(rpc).pipe(conn)
            //await pump(rpc, conn, rpc)
        } catch (e) {
            console.error(e.stack || e)
        }
    })

    return server

}
