const { doSearch } = require('../util')

const findPrimaryKey = context => {
  const params = {
    TableName: context.tableName
  }

  return context.dynamodb.describeTable(params).promise()
    .then(tableDescription => {
      context.primaryKey = tableDescription.Table.KeySchema.find(
        element => element.KeyType === 'HASH').AttributeName
      return context
    })
}

const deleteAllElements = context => {
  const deleteRequests = []
  let counter = 0
  const MAX_OPERATIONS = 25
  const params = {
    RequestItems: {
      [context.tableName]: []
    }
  }

  for (const item of context.items) {
    params.RequestItems[context.tableName].push({
      DeleteRequest: {
        Key: {
          [context.primaryKey]: item[context.primaryKey]
        }
      }
    })

    counter++

    if (counter % MAX_OPERATIONS === 0) {
      deleteRequests.push(context.dynamodb.batchWriteItem(params).promise())
      params.RequestItems[context.tableName] = []
    }
  }

  if (counter % MAX_OPERATIONS !== 0) {
    deleteRequests.push(context.dynamodb.batchWriteItem(params).promise())
    params.RequestItems[context.tableName] = []
  }

  return Promise.all(deleteRequests)
}

const findAllElements = context => {
  const scanParams = {
    ProjectionExpression: context.primaryKey,
  }

  return doSearch(context.dynamodb, context.tableName, scanParams)
    .then(items => {
      context.items = items
      return context
    })
}


/**
 * This function deletes all record from a given table within dynamodb.
 *
 * It functions as follows:
 *  1) Determine the primary key of the table by calling describeTable
 *  2) Scan all records and store them in an array
 *  3) Pass the records to #deleteAllElements which in turn sends a delete request for each
 *  of them
 *  4) Return a list of promises using Promise.all() to the caller
 *
 * @param tableName the table we want to purge
 * @param dynamodb the AWS dynamodb service that holds the connection
 * @returns {Promise<any[] | never>} concatenation of all delete request promises
 */
const purgeTable = (tableName, dynamodb) => {
  const context = {
    tableName,
    dynamodb
  }

  return findPrimaryKey(context)
    .then(findAllElements)
    .then(deleteAllElements)
}

module.exports = {purgeTable}
