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

export class DynamoApiController {
    dynamodb: DynamoDBClient;
    docClient: DynamoDBDocumentClient;

    constructor(dynamodb: DynamoDBClient) {
        this.dynamodb = dynamodb;
        this.docClient = DynamoDBDocumentClient.from(dynamodb);
    }

    async batchWriteItem(input: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
        return await this.dynamodb.send(new BatchWriteCommand(input));
    }

    async createTable(input: CreateTableInput): Promise<CreateTableOutput> {
        return await this.dynamodb.send(new CreateTableCommand(input));
    }

    async deleteItem(input: DeleteCommandInput): Promise<DeleteCommandOutput> {
        return await this.docClient.send(new DeleteCommand(input));
    }

    async deleteTable(input: DeleteTableInput): Promise<DeleteTableOutput> {
        return await this.dynamodb.send(new DeleteTableCommand(input));
    }

    async describeTable(input: DescribeTableInput): Promise<TableDescription> {
        const description = await this.dynamodb.send(new DescribeTableCommand(input));
        if (!description.Table) {
            throw new DynamoDBAdminError(`No table named ${input.TableName}`);
        }
        return description.Table;
    }

    async listTables(input: ListTablesInput): Promise<ListTablesOutput> {
        return await this.dynamodb.send(new ListTablesCommand(input));
    }

    async query(input: QueryCommandInput): Promise<QueryCommandOutput> {
        return await this.docClient.send(new QueryCommand(input));
    }

    async scan(input: ScanCommandInput): Promise<ScanCommandOutput> {
        return await this.docClient.send(new ScanCommand(input));
    }

    async getItem(input: GetCommandInput): Promise<GetCommandOutput> {
        return await this.docClient.send(new GetCommand(input));
    }

    async putItem(input: PutCommandInput): Promise<PutCommandOutput> {
        return await this.docClient.send(new PutCommand(input));
    }
}
