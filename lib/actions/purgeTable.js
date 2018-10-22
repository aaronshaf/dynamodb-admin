let tableName = null;
let dynamodb = null;

const findPrimaryKey = () => {
  const params = {
    TableName: this.tableName
  }

  return new Promise((resolve, reject) => {
    this.dynamodb.describeTable(params).promise()
      .then(tableDescription => {
        resolve({
          primaryKey: tableDescription.Table.KeySchema.filter((element) => element.KeyType === "HASH")[0].AttributeName
        })
      })
  })
}

const deleteAllElements = (request) => {
  const deleteRequests = [];
  let counter = 0;
  let max_operations = 10;
  let params = {
    RequestItems: {
      [this.tableName]: []
    }
  }

  for (item of request.items) {
    itemsLeft = true

    params.RequestItems[this.tableName].push({
      DeleteRequest: {
        Key: {
          [request.primaryKey]: item[request.primaryKey]
        }
      }
    })

    counter++

    if (counter % max_operations === 0) {
      console.log(`DELETING ${params.RequestItems[this.tableName].length} items`)
      deleteRequests.push(this.dynamodb.batchWriteItem(params).promise())
      params.RequestItems[this.tableName] = []
    }
  }

  if (counter % max_operations !== 0) {
    console.log(`DELETING ${params.RequestItems[this.tableName].length} items`)
    deleteRequests.push(this.dynamodb.batchWriteItem(params).promise())
    params.RequestItems[this.tableName] = []
  }

  return Promise.all(deleteRequests)
}

const findAllElements = (deleteRequest) => {
  const params = {
    TableName: this.tableName
  }

  let items = [];

  return new Promise((resolve, reject) => {
    this.dynamodb.scan(params).promise()
      .then(results => {
        items = results.Items;
        deleteRequest.items = items
        resolve(deleteRequest)
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
  this.tableName = tableName;
  this.dynamodb = dynamodb;

  return findPrimaryKey()
    .then(findAllElements)
    .then(deleteAllElements)
}

module.exports = {purgeTable}