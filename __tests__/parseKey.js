const { parseKey } = require('../lib/util')

describe('parseKey', () => {
  it('parses key with 1 attribute', () => {
    const key = 'CfHhu6c1C_8W4JygfbAAc16UJJg2Bw,app_admin|0a5b7a9c-af15-2506-fd4f-80c20bca6414'
    const parsedKey = parseKey(key, table1)
    expect(parsedKey).toEqual({
      document_id: 'CfHhu6c1C_8W4JygfbAAc16UJJg2Bw',
      ctx_and_id: 'app_admin|0a5b7a9c-af15-2506-fd4f-80c20bca6414'
    })
  })
})

const table1 = {
  'AttributeDefinitions': [
    {
      'AttributeName': 'document_id',
      'AttributeType': 'S'
    },
    {
      'AttributeName': 'ctx_and_id',
      'AttributeType': 'S'
    }
  ],
  'TableName': 'app_annotations',
  'KeySchema': [
    {
      'AttributeName': 'document_id',
      'KeyType': 'HASH'
    },
    {
      'AttributeName': 'ctx_and_id',
      'KeyType': 'RANGE'
    }
  ],
  'TableStatus': 'ACTIVE',
  'CreationDateTime': '2016-06-29T21:46:09.943Z',
  'ProvisionedThroughput': {
    'LastIncreaseDateTime': '1970-01-01T00:00:00.000Z',
    'LastDecreaseDateTime': '1970-01-01T00:00:00.000Z',
    'NumberOfDecreasesToday': 0,
    'ReadCapacityUnits': 5,
    'WriteCapacityUnits': 5
  },
  'TableSizeBytes': 16392,
  'ItemCount': 16
}
