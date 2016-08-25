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

exports.unserializeKey = function (key, table) {
  if (table.KeySchema.length === 2) {
    return {
      [table.KeySchema[0].AttributeName]: key.split(',')[0],
      [table.KeySchema[1].AttributeName]: key.split(',')[1]
    }
  }
  return {
    id: key
  }
}
