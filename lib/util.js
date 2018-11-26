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

exports.doSearch = (docClient, tableName, scanParams, limit, startKey, done,
                    progress, readOperation = 'scan') => {
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

  const items = []
  const processNextBite = (err, items, nextKey) => {
    if (!err && nextKey) {
      params.ExclusiveStartKey = nextKey
      getNextBite(params, items, processNextBite)
    } else {
      if (done) {
        done(err, items)
      }
    }
  }

  const readMethod = {
    scan: docClient.scan,
    query: docClient.query
  }[readOperation].bind(docClient)

  const getNextBite = (params, items, callback) => {
    readMethod(params, (err, data) => {
      if (err !== null) {
        callback(err, items, null)
        return
      }

      if (data && data.Items && data.Items.length > 0) {
        items = items.concat(data.Items)
      }

      let lastStartKey = null
      if (data) {
        lastStartKey = data.LastEvaluatedKey
      }

      if (progress) {
        const stop = progress(err, data.Items, lastStartKey)
        if (!stop) {
          callback(err, items, lastStartKey)
        } else {
          if (done) {
            done(err, items)
          }
        }
      } else {
        callback(err, items, lastStartKey)
      }
    })
  }

  getNextBite(params, items, processNextBite)
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
