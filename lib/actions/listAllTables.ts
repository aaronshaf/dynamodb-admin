import type { TableDescription } from '@aws-sdk/client-dynamodb';
import type { DynamoApiController } from '../dynamoDbApi';

export async function listAllTables(ddbApi: DynamoApiController): Promise<TableDescription[]> {
    const allTableNames: string[] = [];
    let lastEvaluatedTableName: string | undefined = undefined;

    do {
        const { LastEvaluatedTableName, TableNames } = await ddbApi.listTables({ ExclusiveStartTableName: lastEvaluatedTableName });
        allTableNames.push(...TableNames || []);
        lastEvaluatedTableName = LastEvaluatedTableName;
    } while (lastEvaluatedTableName !== undefined);

    return await Promise.all(allTableNames.map(tableName => ddbApi.describeTable({ TableName: tableName })));
}
