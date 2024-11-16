import type { DynamoDB } from 'aws-sdk';
import type { DynamoDBAPI } from '../types';
import { doSearch, type ScanParams } from '../util';

/**
 * This function deletes all record from a given table within dynamodb.
 *
 * It functions as follows:
 *  1) Determine the primary key of the table by calling describeTable
 *  2) Scan all records and store them in an array
 *  3) Pass the records to #deleteAllElements which in turn sends a delete request for each
 *  of them
 *  4) Return a list of promises using Promise.all() to the caller
 *
 * @param tableName the table we want to purge
 * @param ddbApi the AWS dynamodb service that holds the connection
 * @returns concatenation of all delete request promises
 */
export async function purgeTable(tableName: string, ddbApi: DynamoDBAPI): Promise<void> {
    const primaryKeys = await findPrimaryKeys(tableName, ddbApi);
    const items = await findAllElements(tableName, primaryKeys, ddbApi);
    await deleteAllElements(tableName, items, ddbApi);
}

async function findPrimaryKeys(tableName: string, ddbApi: DynamoDBAPI): Promise<string[]> {
    const tableDescription = await ddbApi.describeTable({ TableName: tableName });

    return ['HASH', 'RANGE']
        .map(keyType => tableDescription.KeySchema!.find(element => element.KeyType === keyType))
        .filter<DynamoDB.KeySchemaElement>(attribute => attribute !== undefined)
        .map(attribute => attribute.AttributeName);
}

async function findAllElements(tableName: string, primaryKeys: string[], ddbApi: DynamoDBAPI): Promise<DynamoDB.DocumentClient.ItemList> {
    const ExpressionAttributeNames: DynamoDB.ExpressionAttributeNameMap = {};

    for (const [index, key] of primaryKeys.entries()) {
        ExpressionAttributeNames[`#KEY${index}`] = key;
    }

    const scanParams: ScanParams = {
        ExpressionAttributeNames,
        ProjectionExpression: Object.keys(ExpressionAttributeNames).join(', '),
    };

    return await doSearch(ddbApi, tableName, scanParams);
}

async function deleteAllElements(tableName: string, items: DynamoDB.Key[], ddbApi: DynamoDBAPI): Promise<DynamoDB.BatchWriteItemOutput[]> {
    const deleteRequests: Promise<DynamoDB.BatchWriteItemOutput>[] = [];
    let counter = 0;
    const MAX_OPERATIONS = 25;
    const params: DynamoDB.Types.BatchWriteItemInput = {
        RequestItems: {
            [tableName]: [],
        },
    };

    for (const item of items) {
        params.RequestItems[tableName].push({
            DeleteRequest: {
                Key: item,
            },
        });

        counter++;

        if (counter % MAX_OPERATIONS === 0) {
            deleteRequests.push(ddbApi.batchWriteItem(params));
            params.RequestItems[tableName] = [];
        }
    }

    if (counter % MAX_OPERATIONS !== 0) {
        deleteRequests.push(ddbApi.batchWriteItem(params));
        params.RequestItems[tableName] = [];
    }

    return await Promise.all(deleteRequests);
}
