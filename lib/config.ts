import type { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import clc from 'cli-color';

type CreateAwsConfigOptions = {
    dynamoEndpoint?: string;
    skipDefaultCredentials?: boolean;
};

/**
 * Create the configuration for the local dynamodb instance.
 *
 * AWS SDK default credentials provider resolves configuration from the following sources:
 * https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html
 */
export function createAwsConfig({ dynamoEndpoint, skipDefaultCredentials }: CreateAwsConfigOptions): DynamoDBClientConfig {
    const dynamoConfig: DynamoDBClientConfig = {
        endpoint: dynamoEndpoint || 'http://localhost:8000',
    };

    if (!skipDefaultCredentials) {
        dynamoConfig.region = process.env.AWS_REGION ?? 'us-east-1';
        dynamoConfig.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'key',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'secret',
        };
    }

    if (!dynamoEndpoint) {
        if (typeof process.env.DYNAMO_ENDPOINT === 'string') {
            if (process.env.DYNAMO_ENDPOINT.indexOf('.amazonaws.com') > -1) {
                console.error(clc.red('dynamodb-admin is only intended for local development'));
                process.exit(1);
            }
            dynamoConfig.endpoint = process.env.DYNAMO_ENDPOINT;
        } else {
            console.info(clc.yellow('  DYNAMO_ENDPOINT is not defined (using default of http://localhost:8000)'));
        }
    }

    console.info(clc.blackBright(`  database endpoint: \t${dynamoConfig.endpoint}`));
    if (dynamoConfig.region) {
        console.info(clc.blackBright(`  region: \t\t${dynamoConfig.region}`));
    }
    if (dynamoConfig.credentials && 'accessKeyId' in dynamoConfig.credentials) {
        console.info(clc.blackBright(`  accessKey: \t\t${dynamoConfig.credentials.accessKeyId}\n`));
    }

    return dynamoConfig;
}
