import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import express, { type Express } from 'express';
import AWSSDK, { DynamoDB } from 'aws-sdk';
import { createAwsConfig } from './config';
import { setupRoutes } from './routes';
import { createDynamoDbApi } from './dynamoDbApi';

function getHomeDir(): string | null {
    const env = process.env;
    const home = env.HOME || env.USERPROFILE
    || (env.HOMEPATH ? (env.HOMEDRIVE || 'C:/') + env.HOMEPATH : null);

    if (home) {
        return home;
    }

    if (typeof os.homedir === 'function') {
        return os.homedir();
    }

    return null;
}

export function createServer(dynamodb?: DynamoDB, docClient?: DynamoDB.DocumentClient, expressInstance = express()): Express {
    const app = expressInstance;
    app.set('json spaces', 2);
    app.set('view engine', 'ejs');
    app.set('views', path.resolve(__dirname, '..', 'views'));

    if (!dynamodb || !docClient) {
        const homeDir = getHomeDir();

        if (homeDir && fs.existsSync(path.join(homeDir, '.aws', 'credentials')) &&
      fs.existsSync(path.join(homeDir, '.aws', 'config'))) {
            process.env.AWS_SDK_LOAD_CONFIG = '1';
        }

        if (!dynamodb) {
            dynamodb = new DynamoDB(createAwsConfig(AWSSDK));
        }

        docClient = docClient || new DynamoDB.DocumentClient({ service: dynamodb });
    }

    const ddbApi = createDynamoDbApi(dynamodb, docClient);

    setupRoutes(app, ddbApi);

    return app;
}
