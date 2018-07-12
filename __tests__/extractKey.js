const { extractKey } = require('../lib/util')

describe('extractKey', () => {
  it('serializes item with 1 key attribute', () => {
    const serializedKey = extractKey(item1, table1.KeySchema)
    expect(serializedKey).toEqual({
      username: 'jdoe@domain.com'
    })
  })

  it('serializes item with 2 key attributes', () => {
    const serializedKey = extractKey(item2, table2.KeySchema)
    expect(serializedKey).toEqual({
      document_id: 'CfHhu6d1C_8W4JygfbBAc16UJeg2Bw',
      ctx_and_id: 'admin|0a5c7a9c-af15-2156-fd4f-80c20bca6414'
    })
  })
})

const item1 = {
  'last_name': 'Doe',
  'last_login_date': '123',
  'first_name': 'John',
  'username': 'jdoe@domain.com',
  'password_hash': 'xyz'
}

const table1 = {
  'AttributeDefinitions': [
    {
      'AttributeName': 'username',
      'AttributeType': 'S'
    },
    {
      'AttributeName': 'parent_id',
      'AttributeType': 'S'
    }
  ],
  'TableName': 'stuff',
  'KeySchema': [
    {
      'AttributeName': 'username',
      'KeyType': 'HASH'
    }
  ],
  'TableStatus': 'ACTIVE',
  'CreationDateTime': '2016-08-29T22:24:58.739Z',
  'ProvisionedThroughput': {
    'LastIncreaseDateTime': '1970-01-01T00:00:00.000Z',
    'LastDecreaseDateTime': '1970-01-01T00:00:00.000Z',
    'NumberOfDecreasesToday': 0,
    'ReadCapacityUnits': 1,
    'WriteCapacityUnits': 1
  },
  'TableSizeBytes': 212,
  'ItemCount': 1,
  'GlobalSecondaryIndexes': [
    {
      'IndexName': 'ParentIdIndex',
      'KeySchema': [
        {
          'AttributeName': 'parent_id',
          'KeyType': 'HASH'
        }
      ],
      'Projection': {
        'ProjectionType': 'ALL'
      },
      'IndexStatus': 'ACTIVE',
      'ProvisionedThroughput': {
        'ReadCapacityUnits': 1,
        'WriteCapacityUnits': 1
      },
      'IndexSizeBytes': 212,
      'ItemCount': 1
    }
  ]
}

const item2 = {
  'user_role': 'Admin',
  'ctx_and_id': 'admin|0a5c7a9c-af15-2156-fd4f-80c20bca6414',
  'user_id': 'app_admin',
  'user_name': 'Jane',
  'created_at': 1472489291,
  'id': '0a5c7a9c-bf15-2506-fd4f-80c30bcb6414',
  'document_id': 'CfHhu6d1C_8W4JygfbBAc16UJeg2Bw'
}

const table2 = {
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
