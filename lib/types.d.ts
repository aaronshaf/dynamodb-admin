import { DynamoDB } from 'aws-sdk';

export type DynamoDBAPI = {
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
