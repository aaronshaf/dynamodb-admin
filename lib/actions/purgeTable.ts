import type { BatchWriteItemOutput, KeySchemaElement } from '@aws-sdk/client-dynamodb';
import type { BatchWriteCommandInput, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { doSearch, type ScanParams } from '../util';
import type { DynamoApiController } from '../dynamoDbApi';
import type { ItemList } from '../types';

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
export async function purgeTable(tableName: string, ddbApi: DynamoApiController): Promise<void> {
    const primaryKeys = await findPrimaryKeys(tableName, ddbApi);
    const items = await findAllElements(tableName, primaryKeys, ddbApi);
    await deleteAllElements(tableName, items, ddbApi);
}

async function findPrimaryKeys(tableName: string, ddbApi: DynamoApiController): Promise<string[]> {
    const tableDescription = await ddbApi.describeTable({ TableName: tableName });

    return ['HASH', 'RANGE']
        .map(keyType => tableDescription.KeySchema!.find(element => element.KeyType === keyType))
        .filter<KeySchemaElement>(attribute => attribute !== undefined)
        .map(attribute => attribute.AttributeName as string);
}

async function findAllElements(tableName: string, primaryKeys: string[], ddbApi: DynamoApiController): Promise<ItemList> {
    const ExpressionAttributeNames: ScanParams['ExpressionAttributeNames'] = {};

    for (const [index, key] of primaryKeys.entries()) {
        ExpressionAttributeNames[`#KEY${index}`] = key;
    }

    const scanParams: ScanParams = {
        ExpressionAttributeNames,
        ProjectionExpression: Object.keys(ExpressionAttributeNames).join(', '),
    };

    return await doSearch(ddbApi, tableName, scanParams);
}

async function deleteAllElements(tableName: string, items: ItemList, ddbApi: DynamoApiController): Promise<BatchWriteItemOutput[]> {
    const deleteRequests: Promise<BatchWriteCommandOutput>[] = [];
    let counter = 0;
    const MAX_OPERATIONS = 25;
    const requestItems: BatchWriteCommandInput['RequestItems'] = {
        [tableName]: [],
    };

    for (const item of items) {
        requestItems[tableName].push({
            DeleteRequest: {
                Key: item,
            },
        });

        counter++;

        if (counter % MAX_OPERATIONS === 0) {
            deleteRequests.push(ddbApi.batchWriteItem({ RequestItems: requestItems }));
            requestItems[tableName] = [];
        }
    }

    if (counter % MAX_OPERATIONS !== 0) {
        deleteRequests.push(ddbApi.batchWriteItem({ RequestItems: requestItems }));
        requestItems[tableName] = [];
    }

    return await Promise.all(deleteRequests);
}
