import path from 'node:path';
import express, { type Express } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NumberValue } from '@aws-sdk/lib-dynamodb';
import { createAwsConfig } from './config';
import { setupRoutes } from './routes';
import { DynamoApiController } from './dynamoDbApi';

// Fix: DynamoDB number attributes that exceed Number.MAX_SAFE_INTEGER are
// returned as BigInt by the AWS SDK v3. With wrapNumbers enabled in the
// DynamoDBDocumentClient, all numbers are wrapped in NumberValue objects.
// This toJSON method ensures they serialise correctly: safe numbers become
// JSON numbers, and values that would lose precision become strings.
(NumberValue.prototype as unknown as { toJSON: () => number | string }).toJSON = function (this: NumberValue) {
    const str = this.toString();
    const num = Number(str);
    // Preserve as a number if the conversion is lossless (i.e. Number -> String round-trips)
    if (String(num) === str) {
        return num;
    }
    return str;
};

export type CreateServerOptions = {
    dynamoDbClient?: DynamoDBClient;
    expressInstance?: Express;
    dynamoEndpoint?: string;
    skipDefaultCredentials?: boolean;
};

export function createServer(options?: CreateServerOptions): Express {
    const { dynamoDbClient, expressInstance, dynamoEndpoint, skipDefaultCredentials } = options || {};
    const app = expressInstance || express();
    let dynamodb = dynamoDbClient;

    app.set('json spaces', 2);
    app.set('view engine', 'ejs');
    app.set('views', path.resolve(__dirname, '..', 'views'));

    if (!dynamodb) {
        dynamodb = new DynamoDBClient(createAwsConfig({ dynamoEndpoint, skipDefaultCredentials }));
    }

    const ddbApi = new DynamoApiController(dynamodb);

    setupRoutes(app, ddbApi);

    return app;
}
