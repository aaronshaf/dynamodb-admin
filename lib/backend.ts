import path from 'node:path';
import express, { type Express } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createAwsConfig } from './config';
import { setupRoutes } from './routes';
import { createDynamoDbApi } from './dynamoDbApi';

export type CreateServerOptions = {
    dynamoDbClient?: DynamoDBClient;
    expressInstance?: Express;
    dynamoEndpoint?: string;
    skipDefaultCredentials?: boolean;
};

export function createServer(options?: CreateServerOptions): Express {
    const { dynamoDbClient, expressInstance, dynamoEndpoint, skipDefaultCredentials } = options || {};
    const app = expressInstance || express();
    let dynamoClient = dynamoDbClient;

    app.set('json spaces', 2);
    app.set('view engine', 'ejs');
    app.set('views', path.resolve(__dirname, '..', 'views'));

    if (!dynamoClient) {
        dynamoClient = new DynamoDBClient(createAwsConfig({ dynamoEndpoint, skipDefaultCredentials }));
    }

    const ddbApi = createDynamoDbApi(dynamoClient);

    setupRoutes(app, ddbApi);

    return app;
}