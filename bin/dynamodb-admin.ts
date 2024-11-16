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

const args = parser.parse_args();

const app = createServer();
const host = process.env.HOST || args.host;
const port = process.env.PORT || args.port;
const server = app.listen(port, host);
server.on('listening', () => {
    const address = server.address();
    if (!address) {
        throw new Error(`Not able to listen on host and port "${host}:${port}"`);
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
    if (!host && listenAddress !== '0.0.0.0') {
        url += ` (alternatively http://0.0.0.0:${listenPort})`;
    }
    console.info(`  dynamodb-admin listening on ${url}`);

    if (args.open) {
        open(url);
    }
});

