#!/usr/bin/env node
const {promisify} = require('util')
const connect = require('net').connect
const rpcs = require('multiplex-rpc')
const pump = promisify(require('pump'))
const readline = require('readline-ext')
const minimist = require('minimist')

const match = require('./match')

const args = minimist(process.argv.slice(2), {
  string: ["s", "socket"],
  boolean: ["help"],
  unknown: opt => {
    console.warn(`Unknown option ${opt}`)
    process.exit(1)
  }
})

const socket = args.socket || args.s

if (args.help || !socket) {
  console.warn(`Usage: burpl -s socket`);
  process.exit(0)
}

main({
  socket
}).catch(err => {
  console.warn(err.code ? err.message : err)
  process.exit(1)
})

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
        const matched = match(completions, line)
        return cb(null, {
          completions: matched.completions,
          replace: true
        })
      } catch (e) {
        console.warn(e)
        cb(e)
      }
    }
  })

  rl.on('line', async line => {
    line = line.trim()
    const completions = await list(line)
    const matched = match(completions, line)

    try {
      if (line) {
        if (!matched.command) {
          console.warn(`No such command: ${line}`)
        } else {
          const response = await command(matched.command, matched.args)
          if (response) console.log(response)
        }
      }
    } catch (e) {
      console.warn(e)
    }
    rl.prompt()
  })

  rl.on('error', err => console.error(err))

  rl.prompt()

  const conn = pump(rpc, sock, rpc)

  sock.on('end', () => rl.close())
  rl.on('close', () => rpc.end())

  await conn
}
