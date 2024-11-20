import type { AttributeDefinition, KeySchemaElement, QueryInput, TableDescription } from '@aws-sdk/client-dynamodb';
import type { ScanCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import type { DynamoApiController } from './dynamoDbApi';
import type { ItemList, Key } from './types';

export class DynamoDBAdminError extends Error {
    public status: number;

    constructor(message: string, status: number = 500) {
        super(message);
        this.status = status;
    }
}

export type ScanParams = Omit<ScanCommandInput & QueryInput, 'TableName' | 'Limit'>;

export function extractKey(item: Record<string, any>, keySchema: KeySchemaElement[]): Record<string, any> {
    return keySchema.reduce((prev, current) => {
        return {
            ...prev,
            ...current.AttributeName ? { [current.AttributeName]: item[current.AttributeName] } : {},
        };
    }, {});
}

export function parseKey(keys: string, tableDescription: TableDescription): Record<string, string | number> {
    const splitKeys = keys.split(',');

    return tableDescription.KeySchema!.reduce((prev, current, index) => {
        return {
            ...prev,
            ...current.AttributeName ? { [current.AttributeName]: typecastKey(current.AttributeName, splitKeys[index], tableDescription) } : {},
        };
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
 */
export async function doSearch(
    ddbApi: DynamoApiController,
    tableName: string,
    scanParams: ScanParams,
    limit?: number,
    progress?: (items: ItemList | undefined, lastStartKey: Key | undefined) => boolean,
    readOperation: 'query' | 'scan' = 'scan',
): Promise<ItemList> {
    const params: ScanCommandInput | QueryCommandInput = {
        TableName: tableName,
        ...scanParams ? scanParams : {},
        ...limit !== undefined ? { Limit: limit } : {},
    };

    let items: ItemList = [];

    const getNextBite = async(params: ScanCommandInput | QueryCommandInput, nextKey: Key | undefined = undefined): Promise<ItemList> => {
        if (nextKey) {
            params.ExclusiveStartKey = nextKey;
        }

        const data = await ddbApi[readOperation](params);
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

function typecastKey(keyName: string, keyValue: string, table: TableDescription): string | number {
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

export function isAttributeNotAlreadyCreated(attributeDefinitions: AttributeDefinition[], attributeName: string): boolean {
    return !attributeDefinitions.find(attributeDefinition => attributeDefinition.AttributeName === attributeName);
}
