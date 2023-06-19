# dynamodb-admin

[![npm](https://img.shields.io/npm/v/dynamodb-admin.svg)](https://www.npmjs.com/package/dynamodb-admin)
> GUI for [DynamoDB Local](https://aws.amazon.com/blogs/aws/dynamodb-local-for-desktop-development/), [dynalite](https://github.com/mhart/dynalite), [localstack](https://github.com/localstack/localstack) etc.

## Usage

### Use as globally installed app

```bash
npm install -g dynamodb-admin

# For Windows:
set DYNAMO_ENDPOINT=http://localhost:8000
dynamodb-admin

# For Mac/Linux:
DYNAMO_ENDPOINT=http://localhost:8000 dynamodb-admin
```

Options:
 - --open / -o - opens server URL in a default browser on start
 - --port PORT / -p PORT -  Port to run on (default: 8001)
 - --host HOST / -h HOST -  Host to run on (default: localhost)

You can specify host & port to run on by setting environment variables `HOST` and `PORT` respectively. This will override value specified on the command line. This is legacy way to specify the HOST & PORT.

If you use a local dynamodb that cares about credentials, you can configure them by using the following environment variables `AWS_REGION` `AWS_ACCESS_KEY_ID` `AWS_SECRET_ACCESS_KEY`

For example with the `amazon/dynamodb-local` docker image you can launch `dynamodb-admin` with:

```bash
AWS_REGION=eu-west-1 AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local dynamodb-admin
```

If you are accessing your database from another piece of software, the `AWS_ACCESS_KEY_ID` used by that application must match the `AWS_ACCESS_KEY_ID` you used with `dynamodb-admin` if you want both to see the same data.

### Use as a library in your project

```js
const AWS = require('aws-sdk');
const {createServer} = require('dynamodb-admin');

const dynamodb = new AWS.DynamoDB();
const dynClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});

const app = createServer(dynamodb, dynClient);

const host = 'localhost';
const port = 8001;
const server = app.listen(port, host);
server.on('listening', () => {
  const address = server.address();
  console.log(`  listening on http://${address.address}:${address.port}`);
});
```

## Development

Run `DYNAMO_ENDPOINT=http://localhost:8000 npm run dev` to start dynamodb-admin in development mode (with auto-reloading on change).

## See also

* [aaronshaf/dynamodb-admin](https://hub.docker.com/r/aaronshaf/dynamodb-admin/) - docker image with dynamodb-admin only for integrating with your own stack
* [instructure/dynamo-local-admin-docker](https://github.com/instructure/dynamo-local-admin-docker) - docker file with integrated dynamodb-admin and dynamodb
* [Camin McCluskey's Quick Start Guide](https://medium.com/swlh/a-gui-for-local-dynamodb-dynamodb-admin-b16998323f8e)

## Screencast

![Screencast](https://d3vv6lp55qjaqc.cloudfront.net/items/2S1m213N1o2L231e011o/Screen%20Recording%202016-10-17%20at%2001.11%20PM.gif?X-CloudApp-Visitor-Id=ab2071d5f76f8504ab6d3070d8a2c5c3&v=e6056da9)
