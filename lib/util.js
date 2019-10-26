exports.extractKey = function(item, KeySchema) {
  return KeySchema.reduce((prev, current) => {
    return Object.assign({}, prev, {
      [current.AttributeName]: item[current.AttributeName]
    })
  }, {})
}

exports.extractFlatKey = function(item, KeySchema) {
  return KeySchema.reduce((prev, current) => {
    return Object.assign({}, prev, {
      [current.AttributeName]: Object.values(item[current.AttributeName])[0]
    })
  }, {})

}

exports.parseKey = function(keys, table) {
  const splitKeys = keys.split(',')

  return table.KeySchema.reduce((prev, current, index) => {
    const keyDefinition = getAttributeDefinition(current.AttributeName, table)
    return Object.assign({}, prev, {
      [current.AttributeName]: {
        [keyDefinition.AttributeType]: typecastKey(
          current.AttributeName,
          splitKeys[index],
          table,
        )
      }
    })
  }, {})
}

exports.extractKeysForItems = function(Items) {
  const keys = new Set()
  for (const item of Items) {
    for (const key of Object.keys(item)) {
      if (!keys.has(key)) {
        keys.add(key)
      }
    }
  }
  return Array.from(keys)
}

exports.doSearch = doSearch

/**
 * Invokes a database scan
 *
 * @param {Object} client The AWS DynamoDB client
 * @param {String} tableName The table name
 * @param {Object} scanParams Extra params for the query
 * @param {Number} limit The of items to request per chunked query. NOT a limit
 *                       of items that should be returned.
 * @param {Object?} startKey The key to start query from
 * @param {Function} progress Function to execute on each new items returned
 *                            from query. Returns true to stop the query.
 * @param {string} readOperation The read operation
 * @return {Promise} Promise with items or rejected promise with error.
 */
function doSearch(client, tableName, scanParams, limit, startKey, progress,
                  readOperation = 'scan') {
  limit = limit !== undefined ? limit : null
  startKey = startKey !== undefined ? startKey : null
  let params = {
    TableName: tableName,
  }

  if (scanParams !== undefined && scanParams) {
    params = Object.assign(params, scanParams)
  }

  if (limit !== null) {
    params.Limit = limit
  }

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey
  }

  const readMethod = {
    scan: (...args) => client.scan(...args),
    query: (...args) => client.query(...args),
  }[readOperation]

  let items = []

  const getNextBite = (params, nextKey = null) => {
    if (nextKey) {
      params.ExclusiveStartKey = nextKey
    }

    return readMethod(params)
      .then(data => {
        if (data && data.Items && data.Items.length > 0) {
          items = items.concat(data.Items)
        }

        let lastStartKey = null
        if (data) {
          lastStartKey = data.LastEvaluatedKey
        }

        if (progress) {
          const stop = progress(data.Items, lastStartKey)

          if (stop) {
            return items
          }
        }

        if (!lastStartKey) {
          return items
        }

        return getNextBite(params, lastStartKey)
      })
  }

  return getNextBite(params)
}

function getAttributeDefinition(keyName, table) {
  return table.AttributeDefinitions.find(attribute => {
    return attribute.AttributeName === keyName
  })
}


function typecastKey(keyName, keyValue, table) {
  const definition = getAttributeDefinition(keyName, table)
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
