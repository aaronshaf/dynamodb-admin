#!/usr/bin/env node

const ArgumentParser = require('argparse').ArgumentParser
const opn = require('opn')
const packageJson = require('../package.json')

const { createServer } = require('../lib/backend')

if (process.env.NODE_ENV === 'production') {
  console.error(clc.red('Do not run this in production!'))
  process.exit(1)
}

const parser = new ArgumentParser({
  description: packageJson.description,
  version: packageJson.version,
})

parser.addArgument(['-o', '--open'], {
  action: 'storeTrue',
  help: 'Open server URL in default browser on start',
})

const args = parser.parseArgs()

console.log('dynamodb-admin')

const app = createServer();
const port = process.env.PORT || 8001
const server = app.listen(port);
server.on('listening', () => {
  const address = server.address();
  const url = `http://0.0.0.0:${address.port}`;
  console.log(`  listening on ${url}`);

  if (args.open) {
    opn(url)
  }
});

