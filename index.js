const { createServer } = require('net')
const { callbackify } = require('util')
const rpcs = require('multiplex-rpc')


module.exports = function(language) {

    const server = createServer(async conn => {
        const commands = Object.keys(language)

        const rpc = rpcs({
            list: callbackify(async () => {
                try {
                    return commands
                } catch (e) {
                    console.warn(e)
                    throw e
                }
            }),
            command: callbackify(async (name, args) => {
                try {
                    if (!language[name]) throw new Error(`Unknown command '${name}'`)
                    return await language[name].apply(null, args)
                } catch (e) {
                    console.warn(e)
                    throw e
                }
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
