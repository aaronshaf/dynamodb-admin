const findPrimaryKey = (context) => {
  const params = {
    TableName: context.tableName
  }

  return new Promise((resolve, reject) => {
    context.dynamodb.describeTable(params).promise()
      .then(tableDescription => {
        context.primaryKey = tableDescription.Table.KeySchema.filter((element) => element.KeyType === "HASH")[0].AttributeName
        resolve(context)
      })
  })
}

const deleteAllElements = (context) => {
  const deleteRequests = [];
  let counter = 0;
  let max_operations = 10;
  let params = {
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

    if (counter % max_operations === 0) {
      deleteRequests.push(context.dynamodb.batchWriteItem(params).promise())
      params.RequestItems[context.tableName] = []
    }
  }

  if (counter % max_operations !== 0) {
    deleteRequests.push(context.dynamodb.batchWriteItem(params).promise())
    params.RequestItems[context.tableName] = []
  }

  return Promise.all(deleteRequests)
}

const findAllElements = (context) => {
  const params = {
    TableName: context.tableName
  }

  let items = []

  return new Promise((resolve, reject) => {
    context.dynamodb.scan(params).promise()
      .then(results => {
        items = results.Items
        context.items = items
        resolve(context)
      })
  });
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