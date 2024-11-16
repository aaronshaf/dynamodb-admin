import type { DynamoDB } from 'aws-sdk';
import type { DynamoDbApi } from '../dynamoDbApi';

export async function listAllTables(ddbApi: DynamoDbApi): Promise<DynamoDB.TableDescription[]> {
    const allTableNames: DynamoDB.TableNameList = [];
    let lastEvaluatedTableName: string | undefined = undefined;

    do {
        const { LastEvaluatedTableName, TableNames } = await ddbApi.listTables({ ExclusiveStartTableName: lastEvaluatedTableName });
        allTableNames.push(...TableNames || []);
        lastEvaluatedTableName = LastEvaluatedTableName;
    } while (lastEvaluatedTableName !== undefined);

    return await Promise.all(allTableNames.map(tableName => ddbApi.describeTable({ TableName: tableName })));
}
