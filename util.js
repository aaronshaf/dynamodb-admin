exports.serializeKey = function (item, table) {
  if (table.KeySchema.length === 2) {
    return {
      [table.KeySchema[0].AttributeName]: item[table.KeySchema[0].AttributeName],
      [table.KeySchema[1].AttributeName]: item[table.KeySchema[1].AttributeName]
    }
  }
  return {
    id: item.id
  }
}

exports.unserializeKey = function (keys, table) {
  if (table.KeySchema.length === 2) {
    return {
      [table.KeySchema[0].AttributeName]: keys.split(',')[0],
      [table.KeySchema[1].AttributeName]: typecastKey(table.KeySchema[1].AttributeName, keys.split(',')[1], table)
    }
  }
  return {
    id: keys
  }
}

function typecastKey (keyName, keyValue, table) {
  const definition = table.AttributeDefinitions.find((attribute) => {
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
