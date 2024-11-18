import type { ScanCommandOutput, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';

export type ItemList = NonNullable<ScanCommandOutput['Items'] | QueryCommandOutput['Items']>;
export type Key = NonNullable<ScanCommandOutput['LastEvaluatedKey'] | QueryCommandOutput['LastEvaluatedKey']>;
