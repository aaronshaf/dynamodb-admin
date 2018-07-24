GUI for [DynamoDB Local](https://aws.amazon.com/blogs/aws/dynamodb-local-for-desktop-development/) or [dynalite](https://github.com/mhart/dynalite).

## Usage

### Use as a globally installed app

```
npm install dynamodb-admin -g
export DYNAMO_ENDPOINT=http://localhost:8000
dynamodb-admin
```

Options:
 - --open / -o - opens server URL in a default browser on start
 - --port PORT / -p PORT -  Port to run on (default: 8001)

You can also specify port to run on by setting environment variable `PORT` to given number. This will override value specified on the command line. This is legacy way to specify PORT.

### Use as a library in your project

```
const AWS = require('aws-sdk');
const {createServer} = require('dynamodb-admin');

const dynamodb = new AWS.DynamoDB();
const dynClient = new AWS.DynamoDB.DocumentClient({service: dynamodb});

const app = createServer(dynamodb, dynClient);

const port = 8001;
const server = app.listen(port);
server.on('listening', () => {
  const address = server.address();
  console.log(`  listening on http://0.0.0.0:${address.port}`);
});
```

## Screencast

![Screencast](https://d3vv6lp55qjaqc.cloudfront.net/items/2S1m213N1o2L231e011o/Screen%20Recording%202016-10-17%20at%2001.11%20PM.gif?X-CloudApp-Visitor-Id=ab2071d5f76f8504ab6d3070d8a2c5c3&v=e6056da9)

## See also

* [instructure/dynamo-local-admin-docker](https://github.com/instructure/dynamo-local-admin-docker)
