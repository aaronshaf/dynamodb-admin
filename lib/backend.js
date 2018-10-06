const express = require('express')
const _ = require('lodash')
const {promisify} = require('es6-promisify')
const path = require('path')
const errorhandler = require('errorhandler')
const { extractKey, extractKeysForItems, parseKey } = require('./util')
const bodyParser = require('body-parser')
const pickBy = require('lodash/pickBy')
const omit = require('lodash/omit')
const querystring = require('querystring')
const clc = require('cli-color')
require('es7-object-polyfill')

function loadDynamoEndpoint(env, dynamoConfig) {
  if (typeof env.DYNAMO_ENDPOINT === 'string') {
    if (env.DYNAMO_ENDPOINT.indexOf('.amazonaws.com') > -1) {
      console.error(
        clc.red('dynamodb-admin is only intended for local development')
      )
      process.exit(1)
    }
    dynamoConfig.endpoint = env.DYNAMO_ENDPOINT
    dynamoConfig.sslEnabled = env.DYNAMO_ENDPOINT.indexOf('https://') === 0
  } else {
    console.log(
      clc.yellow(
        '  DYNAMO_ENDPOINT is not defined (using default of http://localhost:8000)'
      )
    )
  }
}

/**
 * Create the configuration for the local dynamodb instance.
 *
 * Region and AccessKeyId are determined as follows:
 *   1) Look at local aws configuration in ~/.aws/credentials
 *   2) Look at env variables env.AWS_REGION and env.AWS_ACCESS_KEY_ID
 *   3) Use default values 'us-east-1' and 'key'
 *
 * @param env - the process environment
 * @param AWS - the AWS SDK object
 * @returns {{endpoint: string, sslEnabled: boolean, region: string, accessKeyId: string}}
 */
function loadDynamoConfig(env, AWS) {
  const dynamoConfig = {
    endpoint: 'http://localhost:8000',
    sslEnabled: false,
    region: 'us-east-1',
    accessKeyId: 'key',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'secret'
  }

  loadDynamoEndpoint(env, dynamoConfig)

  if (AWS.config) {
    dynamoConfig.region = AWS.config.region

    if (AWS.config.credentials) {
      dynamoConfig.accessKeyId = AWS.config.credentials.accessKeyId
    }
  }

  if (env.AWS_REGION) {
    dynamoConfig.region = env.AWS_REGION
  }

  if (env.AWS_ACCESS_KEY_ID) {
    dynamoConfig.accessKeyId = env.AWS_ACCESS_KEY_ID
  }

  return dynamoConfig
}

const createAwsConfig = (AWS) => {
  const env = process.env
  const dynamoConfig = loadDynamoConfig(env, AWS)

  console.log(clc.blackBright(`  database endpoint: \t${dynamoConfig.endpoint}`))
  console.log(clc.blackBright(`  region: \t\t${dynamoConfig.region}`))
  console.log(clc.blackBright(`  accessKey: \t\t${dynamoConfig.accessKeyId}\n`))

  return dynamoConfig
}

exports.createServer = (dynamodb, docClient) => {
  const app = express()
  app.set('json spaces', 2)
  app.set('view engine', 'ejs')
  app.set('views', path.resolve(__dirname, '..', 'views'))

  if (!dynamodb || !docClient) {
    process.env.AWS_SDK_LOAD_CONFIG=1
    const AWS = require('aws-sdk')

    if (!dynamodb) {
      dynamodb = new AWS.DynamoDB(createAwsConfig(AWS))
    }

    docClient = docClient || new AWS.DynamoDB.DocumentClient({service: dynamodb})
  }

  const listTables = promisify(dynamodb.listTables.bind(dynamodb))
  const describeTable = promisify(dynamodb.describeTable.bind(dynamodb))
  const getItem = promisify(docClient.get.bind(docClient))
  const putItem = promisify(docClient.put.bind(docClient))
  const deleteItem = promisify(docClient.delete.bind(docClient))

  app.use(errorhandler())
  app.use('/assets', express.static(path.join(__dirname, '..', 'public')))

  app.get('/', (req, res) => {
    const listAllTables = (lastEvaluatedTableName, tableNames) => {
      return listTables({ ExclusiveStartTableName: lastEvaluatedTableName })
        .then(data => {
          tableNames = tableNames.concat(data.TableNames)
          if (typeof data.LastEvaluatedTableName !== 'undefined') {
            return listAllTables(data.LastEvaluatedTableName, tableNames)
          }
          return Promise.all(
            tableNames.map(TableName => {
              return describeTable({ TableName }).then(data => data.Table)
            })
          )
        })
    }

    listAllTables(null, [])
      .then(data => {
        res.render('tables', { data })
      })
      .catch(error => {
        res.json({ error })
      })
  })

  app.get('/create-table', (req, res) => {
    res.render('create-table', {})
  })

  app.post(
    '/create-table',
    bodyParser.urlencoded({ extended: false, limit: '500kb' }),
    (req, res, next) => {
      const attributeDefinitions = [
        {
          AttributeName: req.body.HashAttributeName,
          AttributeType: req.body.HashAttributeType
        }
      ]

      const keySchema = [
        {
          AttributeName: req.body.HashAttributeName,
          KeyType: 'HASH'
        }
      ]

      if (req.body.RangeAttributeName) {
        attributeDefinitions.push({
          AttributeName: req.body.RangeAttributeName,
          AttributeType: req.body.RangeAttributeType
        })

        keySchema.push({
          AttributeName: req.body.RangeAttributeName,
          KeyType: 'RANGE'
        })
      }

      dynamodb
        .createTable({
          TableName: req.body.TableName,
          ProvisionedThroughput: {
            ReadCapacityUnits: req.body.ReadCapacityUnits,
            WriteCapacityUnits: req.body.WriteCapacityUnits
          },
          KeySchema: keySchema,
          AttributeDefinitions: attributeDefinitions
        })
        .promise()
        .then(() => {
          res.redirect('/')
        })
        .catch(next)
    }
  )

  app.delete('/tables/:TableName', (req, res, next) => {
    const TableName = req.params.TableName
    dynamodb
      .deleteTable({ TableName })
      .promise()
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

  app.get('/tables/:TableName/get', (req, res) => {
    const TableName = req.params.TableName
    if (req.query.hash) {
      if (req.query.range) {
        return res.redirect(
          `/tables/${TableName}/items/${req.query.hash}${encodeURIComponent(
            ','
          )}${req.query.range}`
        )
      } else {
        return res.redirect(`/tables/${TableName}/items/${req.query.hash}`)
      }
    }
    describeTable({ TableName }).then(description => {
      const hashKey = description.Table.KeySchema.find(schema => {
        return schema.KeyType === 'HASH'
      })
      if (hashKey) {
        hashKey.AttributeType = description.Table.AttributeDefinitions.find(
          definition => {
            return definition.AttributeName === hashKey.AttributeName
          }
        ).AttributeType
      }
      const rangeKey = description.Table.KeySchema.find(schema => {
        return schema.KeyType === 'RANGE'
      })
      if (rangeKey) {
        rangeKey.AttributeType = description.Table.AttributeDefinitions.find(
          definition => {
            return definition.AttributeName === rangeKey.AttributeName
          }
        ).AttributeType
      }
      res.render(
        'get',
        Object.assign({}, description, {
          hashKey,
          rangeKey
        })
      )
    })
  })

  const doSearch = (docClient, tableName, scanParams, limit, startKey, done, progress,
                    readOperation = 'scan') => {
    limit = typeof limit !== 'undefined' ? limit : null
    startKey = typeof startKey !== 'undefined' ? startKey : null
    let params = { TableName: tableName }
    if (typeof scanParams !== 'undefined' && scanParams) {
      params = _.assign(params, scanParams)
    }
    if (limit != null) {params.Limit = limit}
    if (startKey != null) {params.ExclusiveStartKey = startKey}
    const items = []
    const processNextBite = function(err, items, nextKey) {
      if (!err && nextKey) {
        params.ExclusiveStartKey = nextKey
        getNextBite(params, items, processNextBite)
      } else {
        if (done) {done(err, items)}
      }
    }

    const readMethod = {
      scan: docClient.scan,
      query: docClient.query
    }[readOperation].bind(docClient)

    const getNextBite = function(params, items, callback) {
      readMethod(params, function(err, data) {
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

  const getPage = (docClient, keySchema, TableName, scanParams, pageSize, startKey,
                   done) => {
    let pageItems = []
    doSearch(
      docClient,
      TableName,
      scanParams,
      10,
      startKey,
      err => {
        let nextKey = null
        if (_.size(pageItems) > pageSize) {
          pageItems = pageItems.slice(0, pageSize)
          nextKey = extractKey(pageItems[pageSize - 1], keySchema)
        }
        done(pageItems, err, nextKey)
      },
      function(err, items, lastStartKey) {
        for (
          let i = 0;
          i < items.length && _.size(pageItems) < pageSize + 1;
          i++
        ) {
          pageItems.push(items[i])
        }
        // If there is more items to query (!lastStartKey) then don't stop until
        // we are over pageSize count. Stopping at exactly pageSize count would
        // not extract key of last item later and make pagination not work.
        return _.size(pageItems) > pageSize || !lastStartKey
      }
    )
  }

  app.get('/tables/:TableName', (req, res, next) => {
    const TableName = req.params.TableName
    req.query = pickBy(req.query)
    const filters = omit(req.query, ['_hash', 'range', 'prevKey', 'startKey', 'pageNum'])

    describeTable({ TableName })
      .then(description => {
        const pageNum = req.query.pageNum ? parseInt(req.query.pageNum) : 1
        const ExpressionAttributeNames = {}
        const ExpressionAttributeValues = {}
        const FilterExpressions = []

        for (const key in filters) {
          const attributeDefinition = description.Table.AttributeDefinitions.find(
            definition => {
              return definition.AttributeName === key
            }
          )
          if (attributeDefinition && attributeDefinition.AttributeType === 'N') {
            req.query[key] = Number(req.query[key])
          }
          ExpressionAttributeNames[`#${key}`] = key
          ExpressionAttributeValues[`:${key}`] = req.query[key]

          FilterExpressions.push(`#${key} = :${key}`)
        }

        const data = Object.assign({}, description, {
          query: req.query,
          omit,
          filters,
          pageNum: pageNum,
          filterQueryString: querystring.stringify(filters),
        })
        res.render('scan', data)
      })
      .catch(next)
  })

  app.get('/tables/:TableName/items', (req, res, next) => {
    const TableName = req.params.TableName
    req.query = pickBy(req.query)
    const filters = omit(req.query, ['_hash', 'range', 'prevKey', 'startKey', 'pageNum'])

    describeTable({ TableName })
      .then(description => {
        const ExclusiveStartKey = req.query.startKey
          ? JSON.parse(req.query.startKey)
          : {}
        const pageNum = req.query.pageNum ? parseInt(req.query.pageNum) : 1
        const ExpressionAttributeNames = {}
        const ExpressionAttributeValues = {}
        const FilterExpressions = []

        for (const key in filters) {
          const attributeDefinition = description.Table.AttributeDefinitions.find(
            definition => {
              return definition.AttributeName === key
            }
          )
          if (attributeDefinition && attributeDefinition.AttributeType === 'N') {
            req.query[key] = Number(req.query[key])
          }
          ExpressionAttributeNames[`#${key}`] = key
          ExpressionAttributeValues[`:${key}`] = req.query[key]

          FilterExpressions.push(`#${key} = :${key}`)
        }

        const params = pickBy({
          TableName,
          FilterExpression: FilterExpressions.length
            ? FilterExpressions.join(' AND ')
            : undefined,
          ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
            ? ExpressionAttributeNames
            : undefined,
          ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
            ? ExpressionAttributeValues
            : undefined
        })

        const startKey = Object.keys(ExclusiveStartKey).length
          ? ExclusiveStartKey
          : undefined

        getPage(
          docClient,
          description.Table.KeySchema,
          TableName,
          params,
          25,
          startKey,
          function(pageItems, err, nextKey) {
            const nextKeyParam = nextKey
              ? encodeURIComponent(JSON.stringify(nextKey))
              : null

            const Items = pageItems.map(item => Object.assign({}, item, {
              __key: extractKey(item, description.Table.KeySchema)
            }))
            const UniqueKeys = extractKeysForItems(Items)

            const data = Object.assign({}, description, {
              query: req.query,
              omit,
              filters,
              pageNum: pageNum,
              prevKey: encodeURIComponent(req.query.prevKey || ''),
              startKey: encodeURIComponent(req.query.startKey || ''),
              nextKey: nextKeyParam,
              filterQueryString: querystring.stringify(filters),
              Items,
              UniqueKeys,
            })
            res.json(data)
          }
        )
      })
      .catch(next)
  })

  app.get('/tables/:TableName/meta', (req, res) => {
    const TableName = req.params.TableName
    Promise.all([
      describeTable({ TableName }),
      docClient.scan({ TableName }).promise()
    ])
      .then(([description, items]) => {
        const data = Object.assign({}, description, items)
        res.render('meta', data)
      })
      .catch(error => {
        res.json({ error })
      })
  })

  app.delete('/tables/:TableName/items/:key', (req, res, next) => {
    const TableName = req.params.TableName
    describeTable({ TableName })
      .then(result => {
        const params = {
          TableName,
          Key: parseKey(req.params.key, result.Table)
        }

        return deleteItem(params).then(() => {
          res.status(204).end()
        })
      })
      .catch(next)
  })

  app.get('/tables/:TableName/add-item', (req, res, next) => {
    const TableName = req.params.TableName
    describeTable({ TableName })
      .then(result => {
        const table = result.Table
        const Item = {}
        table.KeySchema.forEach(key => {
          const definition = table.AttributeDefinitions.find(attribute => {
            return attribute.AttributeName === key.AttributeName
          })
          Item[key.AttributeName] = definition.AttributeType === 'S' ? '' : 0
        })
        res.render('item', {
          Table: table,
          TableName: req.params.TableName,
          Item: Item,
          isNew: true
        })
      })
      .catch(next)
  })

  app.get('/tables/:TableName/items/:key', (req, res, next) => {
    const TableName = req.params.TableName
    describeTable({ TableName })
      .then(result => {
        const params = {
          TableName,
          Key: parseKey(req.params.key, result.Table)
        }

        return getItem(params).then(response => {
          if (!response.Item) {
            return res.status(404).send('Not found')
          }
          res.render('item', {
            Table: result.Table,
            TableName: req.params.TableName,
            Item: response.Item,
            isNew: false
          })
        })
      })
      .catch(next)
  })

  app.put(
    '/tables/:TableName/add-item',
    bodyParser.json({ limit: '500kb'}),
    (req, res, next) => {
      const TableName = req.params.TableName
      describeTable({ TableName })
        .then(description => {
          const params = {
            TableName,
            Item: req.body
          }

          return putItem(params).then(() => {
            const Key = extractKey(req.body, description.Table.KeySchema)
            const params = {
              TableName,
              Key
            }
            return getItem(params).then(response => {
              if (!response.Item) {
                return res.status(404).send('Not found')
              }
              return res.json(Key)
            })
          })
        })
        .catch(next)
    }
  )

  app.put(
    '/tables/:TableName/items/:key',
    bodyParser.json({ limit: '500kb'}),
    (req, res, next) => {
      const TableName = req.params.TableName
      describeTable({ TableName })
        .then(result => {
          const params = {
            TableName,
            Item: req.body
          }

          return putItem(params).then(() => {
            const params = {
              TableName,
              Key: parseKey(req.params.key, result.Table)
            }
            return getItem(params).then(response => {
              return res.json(response.Item)
            })
          })
        })
        .catch(next)
    }
  )

  return app
}
