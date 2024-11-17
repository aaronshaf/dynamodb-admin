# dynamodb-admin

[![npm](https://img.shields.io/npm/v/dynamodb-admin.svg)](https://www.npmjs.com/package/dynamodb-admin)
> GUI for [DynamoDB Local](https://aws.amazon.com/blogs/aws/dynamodb-local-for-desktop-development/), [dynalite](https://github.com/mhart/dynalite), [localstack](https://github.com/localstack/localstack) etc.

## Usage

### Use as globally installed app

```bash
npm install -g dynamodb-admin

dynamodb-admin --dynamo-endpoint=http://localhost:8000
```

Options:
 - `--open` / `-o` - opens server URL in a default browser on start
 - `--port PORT` / `-p PORT` -  Port to run on (default: 8001)
 - `--host HOST` / `-h HOST` -  Host to run on (default: localhost)
 - `--dynamo-endpoint` - DynamoDB endpoint to connect to (default: http://localhost:8000).
 - `--skip-default-credentials` - Skip setting default credentials and region. By default the accessKeyId/secretAccessKey are set to "key" and "secret" and the region is set to "us-east-1". If you specify this argument then you need to ensure that credentials are provided some other way. See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html for more details on how default credentials provider works.

Environment variables `HOST`, `PORT` and `DYNAMO_ENDPOINT` can also be used to set the respective options. Those are not recommended.

If you use a local dynamodb that cares about credentials, you can configure them by using the following environment variables `AWS_REGION` `AWS_ACCESS_KEY_ID` `AWS_SECRET_ACCESS_KEY` or specify the `--skip-default-credentials` argument and rely on the default AWS SDK credentials resolving behavior.

For example with the `amazon/dynamodb-local` docker image you can launch `dynamodb-admin` with:

```bash
AWS_REGION=eu-west-1 AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local dynamodb-admin
```
If you are accessing your database from another piece of software, the `AWS_ACCESS_KEY_ID` used by that application must match the `AWS_ACCESS_KEY_ID` you used with `dynamodb-admin` if you want both to see the same data.

By default `dynamodb-admin` sets a default key/secret to values "key" and "secret" and the region to "us-east-1".

### Use as a library in your project

This requires AWS SDK v3.
If you depend on AWS SDK v2 then you need to use dynamodb-admin v4.

```js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createServer } from 'dynamodb-admin';

const dynamoDbClient = new DynamoDBClient();

const app = createServer({ dynamoDbClient });

const host = 'localhost';
const port = 8001;
const server = app.listen(port, host);
server.on('listening', () => {
  const address = server.address();
  console.log(`  listening on http://${address.address}:${address.port}`);
});
```

## Development

Run `npm run build` and then `DYNAMO_ENDPOINT=http://localhost:8000 npm run start` to start dynamodb-admin.

You can set up a build watcher in a separate terminal using `npm run build:watch` which will re-compile the code on change and cause the dynamodb-admin instance to restart.

## See also

* [aaronshaf/dynamodb-admin](https://hub.docker.com/r/aaronshaf/dynamodb-admin/) - docker image with dynamodb-admin only for integrating with your own stack
* [instructure/dynamo-local-admin-docker](https://github.com/instructure/dynamo-local-admin-docker) - docker file with integrated dynamodb-admin and dynamodb
* [Camin McCluskey's Quick Start Guide](https://medium.com/swlh/a-gui-for-local-dynamodb-dynamodb-admin-b16998323f8e)

## Screencast

![Screencast](https://d3vv6lp55qjaqc.cloudfront.net/items/2S1m213N1o2L231e011o/Screen%20Recording%202016-10-17%20at%2001.11%20PM.gif?X-CloudApp-Visitor-Id=ab2071d5f76f8504ab6d3070d8a2c5c3&v=e6056da9)
