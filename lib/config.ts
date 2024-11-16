import AWSSDK from 'aws-sdk';
import clc from 'cli-color';

type DynamodbAdminConfig = {
    accessKeyId: string;
    endpoint: string;
    region: string;
    secretAccessKey: string;
    sslEnabled: boolean;
};

export function createAwsConfig(AWS: typeof AWSSDK): DynamodbAdminConfig {
    const dynamoConfig = loadDynamoConfig(process.env, AWS);

    console.info(clc.blackBright(`  database endpoint: \t${dynamoConfig.endpoint}`));
    console.info(clc.blackBright(`  region: \t\t${dynamoConfig.region}`));
    console.info(clc.blackBright(`  accessKey: \t\t${dynamoConfig.accessKeyId}\n`));

    return dynamoConfig;
}

/**
 * Create the configuration for the local dynamodb instance.
 *
 * Region and AccessKeyId are determined as follows:
 *   1) Look at local aws configuration in ~/.aws/credentials
 *   2) Look at env variables env.AWS_REGION and env.AWS_ACCESS_KEY_ID
 *   3) Use default values 'us-east-1' and 'key'
 *
 * @param env - the process environment
 * @param AWS - the AWS SDK object
 */
function loadDynamoConfig(env: NodeJS.ProcessEnv, AWS: typeof AWSSDK): DynamodbAdminConfig {
    const dynamoConfig: DynamodbAdminConfig = {
        endpoint: 'http://localhost:8000',
        sslEnabled: false,
        region: 'us-east-1',
        accessKeyId: 'key',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'secret',
    };

    loadDynamoEndpoint(env, dynamoConfig);

    if (AWS.config) {
        if (AWS.config.region !== undefined) {
            dynamoConfig.region = AWS.config.region;
        }

        if (AWS.config.credentials) {
            if (AWS.config.credentials.accessKeyId !== undefined) {
                dynamoConfig.accessKeyId = AWS.config.credentials.accessKeyId;
            }
        }
    }

    if (env.AWS_REGION) {
        dynamoConfig.region = env.AWS_REGION;
    }

    if (env.AWS_ACCESS_KEY_ID) {
        dynamoConfig.accessKeyId = env.AWS_ACCESS_KEY_ID;
    }

    return dynamoConfig;
}

function loadDynamoEndpoint(env: NodeJS.ProcessEnv, dynamoConfig: DynamodbAdminConfig): void {
    if (typeof env.DYNAMO_ENDPOINT === 'string') {
        if (env.DYNAMO_ENDPOINT.indexOf('.amazonaws.com') > -1) {
            console.error(
                clc.red('dynamodb-admin is only intended for local development'),
            );
            process.exit(1);
        }
        dynamoConfig.endpoint = env.DYNAMO_ENDPOINT;
        dynamoConfig.sslEnabled = env.DYNAMO_ENDPOINT.indexOf('https://') === 0;
    } else {
        console.info(
            clc.yellow(
                '  DYNAMO_ENDPOINT is not defined (using default of http://localhost:8000)',
            ),
        );
    }
}
