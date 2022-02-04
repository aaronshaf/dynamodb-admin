#!/usr/bin/env node

const { ArgumentParser } = require('argparse')
const open = require('open')
const packageJson = require('../package.json')

const { createServer } = require('../lib/backend')

if (process.env.NODE_ENV === 'production') {
  const clc = require('cli-color')
  console.error(clc.red('Do not run this in production!'))
  process.exit(1)
}

const parser = new ArgumentParser({
  description: packageJson.description,
})

parser.add_argument('-v', '--version', {
  action: 'version',
  version: packageJson.version
})

parser.add_argument('-o', '--open', {
  action: 'store_true',
  help: 'Open server URL in default browser on start',
})

parser.add_argument('-H', '--host', {
  type: 'str',
  required: false,
  help: 'Host to run on (default: undefined)',
})

parser.add_argument('-p', '--port', {
  type: 'int',
  default: 8001,
  help: 'Port to run on (default: 8001)',
})

const args = parser.parse_args()

const app = createServer()
const host = process.env.HOST || args.host
const port = process.env.PORT || args.port
const server = app.listen(port, host)
server.on('listening', () => {
  const { address, port } = server.address()
  let url = `http://${address}:${port}`
  if (!host && address !== '0.0.0.0') {
    url += ` (alternatively http://0.0.0.0:${port})`
  }
  console.log(`  dynamodb-admin listening on ${url}`)

  if (args.open) {
    open(url)
  }
})

