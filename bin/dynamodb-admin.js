#!/usr/bin/env node

const { createServer } = require('../lib/backend')

if (process.env.NODE_ENV === 'production') {
  console.error(clc.red('Do not run this in production!'))
  process.exit(1)
}

console.log('dynamodb-admin')

const app = createServer();
const port = process.env.PORT || 8001
const server = app.listen(port);
server.on('listening', () => {
  const address = server.address();
  console.log(`  listening on http://0.0.0.0:${address.port}`);
});

