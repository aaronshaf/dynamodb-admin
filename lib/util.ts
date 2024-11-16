import type { DynamoDB } from 'aws-sdk';
import type { DynamoDbApi } from './dynamoDbApi';

export class DynamoDBAdminError extends Error {
    public status: number;

    constructor(message: string, status: number = 500) {
        super(message);
        this.status = status;
    }
}

export type ScanParams = Omit<DynamoDB.DocumentClient.ScanInput & DynamoDB.DocumentClient.QueryInput, 'TableName' | 'Limit'>;

export function extractKey(item: Record<string, any>, KeySchema: DynamoDB.KeySchema): Record<string, any> {
    return KeySchema.reduce((prev, current) => {
        return Object.assign({}, prev, {
            [current.AttributeName]: item[current.AttributeName],
        });
    }, {});
}

export function parseKey(keys: string, tableDescription: DynamoDB.TableDescription): Record<string, string | number> {
    const splitKeys = keys.split(',');

    return tableDescription.KeySchema!.reduce((prev, current, index) => {
        return Object.assign({}, prev, {
            [current.AttributeName]: typecastKey(current.AttributeName, splitKeys[index], tableDescription),
        });
    }, {});
}

export function extractKeysForItems(Items: Record<string, any>[]): string[] {
    const keys = new Set<string>();
    for (const item of Items) {
        for (const key of Object.keys(item)) {
            if (!keys.has(key)) {
                keys.add(key);
            }
        }
    }
    return Array.from<string>(keys);
}

/**
 * Invokes a database scan
 *
 * @param ddbApi The AWS DynamoDB client
 * @param tableName The table name
 * @param scanParams Extra params for the query
 * @param limit The of items to request per chunked query. NOT a limit
 *                       of items that should be returned.
 * @param startKey The key to start query from
 * @param progress Function to execute on each new items returned from query. Returns true to stop the query.
 * @param readOperation The read operation
 * @return Promise with items or rejected promise with error.
 */
export async function doSearch(
    ddbApi: DynamoDbApi,
    tableName: string,
    scanParams: ScanParams,
    limit?: number,
    startKey?: DynamoDB.Key,
    progress?: (items: DynamoDB.ItemList | undefined, lastStartKey: DynamoDB.Key | undefined) => boolean,
    readOperation: 'query' | 'scan' = 'scan',
): Promise<DynamoDB.DocumentClient.ItemList> {
    const params: DynamoDB.DocumentClient.ScanInput | DynamoDB.DocumentClient.QueryInput = {
        TableName: tableName,
        ...scanParams ? scanParams : {},
        ...limit !== undefined ? { Limit: limit } : {},
        ...startKey !== undefined ? { ExclusiveStartKey: startKey } : {},
    };

    const readMethod = ddbApi[readOperation];

    let items: DynamoDB.DocumentClient.ItemList = [];

    const getNextBite = async(params: DynamoDB.DocumentClient.ScanInput | DynamoDB.DocumentClient.QueryInput, nextKey: DynamoDB.Key | undefined = undefined): Promise<DynamoDB.DocumentClient.ItemList> => {
        if (nextKey) {
            params.ExclusiveStartKey = nextKey;
        }

        const data = await readMethod(params);
        if (data.Items && data.Items.length > 0) {
            items = items.concat(data.Items);
        }

        let lastStartKey = undefined;
        if (data) {
            lastStartKey = data.LastEvaluatedKey;
        }

        if (progress) {
            const stop = progress(data.Items, lastStartKey);

            if (stop) {
                return items;
            }
        }

        if (!lastStartKey) {
            return items;
        }

        return await getNextBite(params, lastStartKey);
    };

    return await getNextBite(params);
}

function typecastKey(keyName: string, keyValue: string, table: DynamoDB.TableDescription): string | number {
    const definition = table.AttributeDefinitions!.find(attribute => attribute.AttributeName === keyName);
    if (definition) {
        switch (definition.AttributeType) {
            case 'N':
                return Number(keyValue);
            case 'S':
                return String(keyValue);
        }
    }
    return keyValue;
}

export function isAttributeNotAlreadyCreated(attributeDefinitions: DynamoDB.AttributeDefinitions, attributeName: string): boolean {
    return !attributeDefinitions.find(attributeDefinition => attributeDefinition.AttributeName === attributeName);
}
