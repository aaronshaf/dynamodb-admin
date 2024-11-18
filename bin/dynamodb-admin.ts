import { readFileSync } from 'node:fs';
import { ArgumentParser } from 'argparse';
import open from 'open';
import clc from 'cli-color';
import { createServer } from '../lib/backend';

const { description, version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), { encoding: 'utf8' }));

if (process.env.NODE_ENV === 'production') {
    console.error(clc.red('Do not run this in production!'));
    process.exit(1);
}

const parser = new ArgumentParser({
    description,
});

parser.add_argument('-v', '--version', {
    action: 'version',
    version,
});

parser.add_argument('-o', '--open', {
    action: 'store_true',
    help: 'Open server URL in default browser on start',
});

parser.add_argument('-H', '--host', {
    type: 'str',
    required: false,
    help: 'Host to run on (default: undefined)',
});

parser.add_argument('-p', '--port', {
    type: 'int',
    default: 8001,
    help: 'Port to run on (default: 8001)',
});

parser.add_argument('--dynamo-endpoint', {
    type: 'str',
    default: process.env.DYNAMO_ENDPOINT || 'http://localhost:8000',
    help: 'DynamoDB endpoint to connect to.',
});

parser.add_argument('--skip-default-credentials', {
    action: 'store_true',
    help: 'Skip setting default credentials and region. By default the accessKeyId/secretAccessKey are set to "key" and "secret" and the region is set to "us-east-1". If you specify this argument then you need to ensure that credentials are provided some other way. See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html for more details on how default credentials provider works.',
});

const { host, port, open: openUrl, dynamo_endpoint: dynamoEndpoint, skip_default_credentials: skipDefaultCredentials } = parser.parse_args();

const app = createServer({ dynamoEndpoint, skipDefaultCredentials });
const resolvedHost = process.env.HOST || host;
const resolvedPort = process.env.PORT || port;
const server = app.listen(resolvedPort, resolvedHost);
server.on('listening', () => {
    const address = server.address();
    if (!address) {
        throw new Error(`Not able to listen on host and port "${resolvedHost}:${resolvedPort}"`);
    }
    let listenAddress;
    let listenPort;
    if (typeof address === 'string') {
        listenAddress = address;
    } else {
        listenAddress = address.address;
        listenPort = address.port;
    }
    let url = `http://${listenAddress}${listenPort ? ':' + listenPort : ''}`;
    if (!resolvedHost && listenAddress !== '0.0.0.0') {
        url += ` (alternatively http://0.0.0.0:${listenPort})`;
    }
    console.info(`  dynamodb-admin listening on ${url}`);

    if (openUrl) {
        open(url);
    }
});

