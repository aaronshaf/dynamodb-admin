import {
    CreateTableCommand,
    DeleteTableCommand,
    DescribeTableCommand,
    ListTablesCommand,
    type CreateTableInput,
    type CreateTableOutput,
    type DeleteTableInput,
    type DeleteTableOutput,
    type DescribeTableInput,
    type DynamoDBClient,
    type ListTablesInput,
    type ListTablesOutput,
    type TableDescription,
} from '@aws-sdk/client-dynamodb';
import {
    BatchWriteCommand,
    type BatchWriteCommandInput,
    type BatchWriteCommandOutput,
    DeleteCommand,
    type DeleteCommandInput,
    type DeleteCommandOutput,
    DynamoDBDocumentClient,
    GetCommand,
    type GetCommandInput,
    type GetCommandOutput,
    PutCommand,
    type PutCommandInput,
    type PutCommandOutput,
    QueryCommand,
    type QueryCommandInput,
    type QueryCommandOutput,
    ScanCommand,
    type ScanCommandInput,
    type ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBAdminError } from './util';

export type DynamoDbApi = {
    batchWriteItem: (input: BatchWriteCommandInput) => Promise<BatchWriteCommandOutput>;
    createTable: (input: CreateTableInput) => Promise<CreateTableOutput>;
    deleteItem: (input: DeleteCommandInput) => Promise<DeleteCommandOutput>;
    deleteTable: (input: DeleteTableInput) => Promise<DeleteTableOutput>;
    describeTable: (input: DescribeTableInput) => Promise<TableDescription>;
    getItem: (input: GetCommandInput) => Promise<GetCommandOutput>;
    listTables: (input: ListTablesInput) => Promise<ListTablesOutput>;
    putItem: (input: PutCommandInput) => Promise<PutCommandOutput>;
    query: (input: QueryCommandInput) => Promise<QueryCommandOutput>;
    scan: (input: ScanCommandInput) => Promise<ScanCommandOutput>;
};

export function createDynamoDbApi(dynamodb: DynamoDBClient): DynamoDbApi {
    const docClient = DynamoDBDocumentClient.from(dynamodb);
    return {
        batchWriteItem: input => dynamodb.send(new BatchWriteCommand(input)),
        createTable: input => dynamodb.send(new CreateTableCommand(input)),
        deleteItem: input => docClient.send(new DeleteCommand(input)),
        deleteTable: input => dynamodb.send(new DeleteTableCommand(input)),
        describeTable: async input => {
            const description = await dynamodb.send(new DescribeTableCommand(input));
            if (!description.Table) {
                throw new DynamoDBAdminError(`No table named ${input.TableName}`);
            }
            return description.Table;
        },
        getItem: input => docClient.send(new GetCommand(input)),
        listTables: input => dynamodb.send(new ListTablesCommand(input)),
        putItem: input => docClient.send(new PutCommand(input)),
        query: input => docClient.send(new QueryCommand(input)),
        scan: input => docClient.send(new ScanCommand(input)),
    };
}
