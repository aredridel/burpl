#!/usr/bin/env node
const burpl = require('.')
const { promisify } = require('util')
const listen = promisify(require('unix-listen'))

const users = [ "aphrodite", "eris", "persephone", "sappho"];

const server = burpl({
    "help": async () => "There is no help for you",
    "user list": () => users.join("\n"),
    "user add USER": (user) => {
		return `added user '${user}' (I lie)`;
	},
    "user add USER really": async (user) => {
		await Promise.resolve(user).then(user => users.push(user));
		return `added user '${user}' for real`;
	},
})

listen(server, 'test.sock')
