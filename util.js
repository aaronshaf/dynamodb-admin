exports.extractKey = function(item, KeySchema) {
  return KeySchema.reduce((prev, current) => {
    return Object.assign({}, prev, {
      [current.AttributeName]: item[current.AttributeName]
    })
  }, {})
}

exports.parseKey = function(keys, table) {
  const splitKeys = keys.split(',')

  return table.KeySchema.reduce((prev, current, index) => {
    return Object.assign({}, prev, {
      [current.AttributeName]: typecastKey(
        current.AttributeName,
        splitKeys[index],
        table
      )
    })
  }, {})
}

function typecastKey(keyName, keyValue, table) {
  const definition = table.AttributeDefinitions.find(attribute => {
    return attribute.AttributeName === keyName
  })
  if (definition) {
    switch (definition.AttributeType) {
      case 'N':
        return Number(keyValue)
      case 'S':
        return String(keyValue)
    }
  }
  return keyValue
}
