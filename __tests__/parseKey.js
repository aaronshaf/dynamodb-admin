const { parseKey, KEY_SEPARATOR } = require('../lib/util')

describe('parseKey', () => {
  it.each([
    [
      'table has only HASH KEY as number',
      '1234',
      {
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'N' }]
      },
      { id: 1234 }
    ],
    [
      'table has only HASH KEY as string',
      '1234',
      {
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }]
      },
      { id: '1234' }
    ],
    [
      'HASH KEY and RANGE KEY are string',
      `hash,key,value${KEY_SEPARATOR}rang,key,value`,
      {
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'name', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'name', AttributeType: 'S' },
        ],
      },
      { id: 'hash,key,value', name: 'rang,key,value' }
    ],
    [
      'HASH KEY and RANGE KEY are number',
      `1234${KEY_SEPARATOR}5678`,
      {
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'name', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'N' },
          { AttributeName: 'name', AttributeType: 'N' },
        ],
      },
      { id: 1234, name: 5678 }
    ],
  ])('should parse when %s', (_, keyString, table, expected) => {
    const actual = parseKey(keyString, table)

    expect(actual).toEqual(expected)
  })
})
