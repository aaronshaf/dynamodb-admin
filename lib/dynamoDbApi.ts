import type { DynamoDB } from 'aws-sdk';
import { DynamoDBAdminError } from './util';

export type DynamoDbApi = {
    batchWriteItem: (input: DynamoDB.Types.BatchWriteItemInput) => Promise<DynamoDB.BatchWriteItemOutput>;
    createTable: (input: DynamoDB.Types.CreateTableInput) => Promise<DynamoDB.CreateTableOutput>;
    deleteItem: (input: DynamoDB.DocumentClient.DeleteItemInput) => Promise<DynamoDB.DocumentClient.DeleteItemOutput>;
    deleteTable: (input: DynamoDB.Types.DeleteTableInput) => Promise<DynamoDB.DeleteTableOutput>;
    describeTable: (input: DynamoDB.Types.DescribeTableInput) => Promise<DynamoDB.TableDescription>;
    getItem: (input: DynamoDB.DocumentClient.GetItemInput) => Promise<DynamoDB.DocumentClient.GetItemOutput>;
    listTables: (input: DynamoDB.Types.ListTablesInput) => Promise<DynamoDB.ListTablesOutput>;
    putItem: (input: DynamoDB.DocumentClient.PutItemInput) => Promise<DynamoDB.DocumentClient.PutItemOutput>;
    query: (input: DynamoDB.DocumentClient.QueryInput) => Promise<DynamoDB.DocumentClient.QueryOutput>;
    scan: (input: DynamoDB.DocumentClient.ScanInput) => Promise<DynamoDB.ScanOutput>;
};

export function createDynamoDbApi(dynamodb: DynamoDB, documentClient: DynamoDB.DocumentClient): DynamoDbApi {
    return {
        batchWriteItem: input => dynamodb.batchWriteItem(input).promise(),
        createTable: input => dynamodb.createTable(input).promise(),
        deleteItem: input => documentClient.delete(input).promise(),
        deleteTable: input => dynamodb.deleteTable(input).promise(),
        describeTable: async input => {
            const description = await dynamodb.describeTable(input).promise();
            if (!description.Table) {
                throw new DynamoDBAdminError(`No table named ${input.TableName}`);
            }
            return description.Table;
        },
        getItem: input => documentClient.get(input).promise(),
        listTables: input => dynamodb.listTables(input).promise(),
        putItem: input => documentClient.put(input).promise(),
        query: input => documentClient.query(input).promise(),
        scan: input => documentClient.scan(input).promise(),
    };
}
