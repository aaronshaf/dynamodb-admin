const express = require('express')
const path = require('path')
const fs = require('fs')
const os = require('os')
const errorhandler = require('errorhandler')
const { extractKey, extractKeysForItems, parseKey, doSearch } = require('./util')
const { purgeTable } = require('./actions/purgeTable')
const asyncMiddleware = require('./utils/asyncMiddleware')
const bodyParser = require('body-parser')
const pickBy = require('lodash.pickby')
const clc = require('cli-color')
const cookieParser = require('cookie-parser')
const DEFAULT_THEME = process.env.DEFAULT_THEME || 'light'

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
    if (AWS.config.region !== undefined) {
      dynamoConfig.region = AWS.config.region
    }

    if (AWS.config.credentials) {
      if (AWS.config.credentials.accessKeyId !== undefined) {
        dynamoConfig.accessKeyId = AWS.config.credentials.accessKeyId
      }
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

function getHomeDir() {
  const env = process.env
  const home = env.HOME || env.USERPROFILE
    || (env.HOMEPATH ? ((env.HOMEDRIVE || 'C:/') + env.HOMEPATH) : null)

  if (home) {
    return home
  }

  if (typeof os.homedir === 'function') {
    return os.homedir()
  }

  return null
}

exports.createServer = (dynamodb, docClient, expressInstance = express()) => {
  const app = expressInstance
  app.set('json spaces', 2)
  app.set('view engine', 'ejs')
  app.set('views', path.resolve(__dirname, '..', 'views'))

  if (!dynamodb || !docClient) {
    const homeDir = getHomeDir()

    if (homeDir && fs.existsSync(path.join(homeDir, '.aws', 'credentials')) &&
      fs.existsSync(path.join(homeDir, '.aws', 'config'))) {
      process.env.AWS_SDK_LOAD_CONFIG = 1
    }

    const AWS = require('aws-sdk')

    if (!dynamodb) {
      dynamodb = new AWS.DynamoDB(createAwsConfig(AWS))
    }

    docClient = docClient || new AWS.DynamoDB.DocumentClient({ service: dynamodb })
  }

  const listTables = (...args) => dynamodb.listTables(...args).promise()
  const describeTable = (...args) => dynamodb.describeTable(...args).promise()
  const getItem = (...args) => docClient.get(...args).promise()
  const putItem = (...args) => docClient.put(...args).promise()
  const deleteItem = (...args) => docClient.delete(...args).promise()

  app.use(errorhandler())
  app.use('/assets', express.static(path.join(__dirname, '..', 'public')))
  app.use(cookieParser())

  app.use(function (req, res, next) {
    const { theme = DEFAULT_THEME } = req.cookies
    res.locals = {
      theme,
    }
    next()
  })

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

  app.get('/', asyncMiddleware((req, res) => {
    return listAllTables(null, [])
      .then(data => {
        res.render('tables', { data })
      })
  }))

  app.get('/api/tables', (req, res) => {
    return listAllTables(null, [])
      .then(data => {
        res.send(data)
      })
  })

  app.get('/create-table', (req, res) => {
    res.render('create-table', {})
  })

  app.post(
    '/create-table',
    bodyParser.json({ limit: '500kb' }),
    asyncMiddleware((req, res) => {
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

      let globalSecondaryIndexes = []
      let localSecondaryIndexes = []
      if (req.body.SecondaryIndexes) {
        req.body.SecondaryIndexes.forEach(secondaryIndex => {
          const secondaryIndexKeySchema = [
            {
              AttributeName: secondaryIndex.HashAttributeName,
              KeyType: 'HASH'
            }
          ]
          if (isAttributeNotAlreadyCreated(attributeDefinitions,
                                           secondaryIndex.HashAttributeName)) {
            attributeDefinitions.push({
              AttributeName: secondaryIndex.HashAttributeName,
              AttributeType: secondaryIndex.HashAttributeType
            })
          }

          if (secondaryIndex.RangeAttributeName) {
            if (isAttributeNotAlreadyCreated(
              attributeDefinitions, secondaryIndex.RangeAttributeName)) {
              attributeDefinitions.push({
                AttributeName: secondaryIndex.RangeAttributeName,
                AttributeType: secondaryIndex.RangeAttributeType
              })
            }

            secondaryIndexKeySchema.push({
              AttributeName: secondaryIndex.RangeAttributeName,
              KeyType: 'RANGE'
            })
          }
          const index = {
            IndexName: secondaryIndex.IndexName,
            KeySchema: secondaryIndexKeySchema,
            Projection: {
              ProjectionType: 'ALL'
            }
          }

          if (secondaryIndex.IndexType === 'global') {
            index.ProvisionedThroughput = {
              ReadCapacityUnits: req.body.ReadCapacityUnits,
              WriteCapacityUnits: req.body.WriteCapacityUnits
            }
            globalSecondaryIndexes.push(index)
          } else {
            localSecondaryIndexes.push(index)
          }
        })
      }

      if (localSecondaryIndexes === undefined || localSecondaryIndexes.length === 0) {
        localSecondaryIndexes = undefined
      }
      if (globalSecondaryIndexes === undefined || globalSecondaryIndexes.length === 0) {
        globalSecondaryIndexes = undefined
      }
      return dynamodb
        .createTable({
          TableName: req.body.TableName,
          ProvisionedThroughput: {
            ReadCapacityUnits: req.body.ReadCapacityUnits,
            WriteCapacityUnits: req.body.WriteCapacityUnits
          },
          GlobalSecondaryIndexes: globalSecondaryIndexes,
          LocalSecondaryIndexes: localSecondaryIndexes,
          KeySchema: keySchema,
          AttributeDefinitions: attributeDefinitions
        })
        .promise()
        .then(() => {
          res.status(204).end()
        }).catch(error => {
          res.status(400).send(error)
        })
    })
  )

  app.delete('/tables', asyncMiddleware(async (req, res) => {
    const tablesList = await listAllTables(null, [])
    if (tablesList.length === 0) {
      return res.send('There are no tables to delete')
    }
    await Promise.all(tablesList.map(table => dynamodb
      .deleteTable({ TableName: table.TableName })
      .promise()
    ))
    return res.send('Tables deleted')
  }))

  app.delete('/tables-purge', asyncMiddleware(async (req, res) => {
    const tablesList = await listAllTables(null, [])
    if (tablesList.length === 0) {
      return res.send('There are no tables to purge')
    }
    await Promise.all(tablesList.map(table => purgeTable(table.TableName, dynamodb)))
    return res.send('Tables purged')
  }))

  app.delete('/tables/:TableName', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    return dynamodb
      .deleteTable({ TableName })
      .promise()
      .then(() => {
        res.status(204).end()
      })
  }))

  app.delete('/tables/:TableName/all', asyncMiddleware((req, res) => {
    return purgeTable(req.params.TableName, dynamodb)
      .then(() => {
        res.status(200).end()
      })
  }))

  app.get('/tables/:TableName/get', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    if (req.query.hash) {
      if (req.query.range) {
        return res.redirect(
          `/tables/${encodeURIComponent(TableName)}/items/${
            encodeURIComponent(req.query.hash)},${encodeURIComponent(req.query.range)}`
        )
      } else {
        return res.redirect(`/tables/${
          encodeURIComponent(TableName)}/items/${encodeURIComponent(req.query.hash)}`)
      }
    }

    return describeTable({ TableName })
      .then(description => {
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
  }))

  const getPage = (docClient, keySchema, TableName, scanParams, pageSize,
                   startKey, operationType) => {
    const pageItems = []

    function onNewItems(items, lastStartKey) {
      for (let i = 0; i < items.length && pageItems.length < pageSize + 1; i++) {
        pageItems.push(items[i])
      }

      // If there is more items to query (!lastStartKey) then don't stop until
      // we are over pageSize count. Stopping at exactly pageSize count would
      // not extract key of last item later and make pagination not work.
      return pageItems.length > pageSize || !lastStartKey
    }

    return doSearch(docClient, TableName, scanParams, 10, startKey, onNewItems, operationType)
      .then(items => {
        let nextKey = null

        if (items.length > pageSize) {
          items = items.slice(0, pageSize)
          nextKey = extractKey(items[pageSize - 1], keySchema)
        }

        return {
          pageItems: items,
          nextKey,
        }
      })
  }

  app.get('/tables/:TableName', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    req.query = pickBy(req.query)

    return describeTable({ TableName })
      .then(description => {
        const pageNum = req.query.pageNum ? parseInt(req.query.pageNum) : 1

        const data = Object.assign({}, description, {
          query: req.query,
          pageNum,
          operators: {
            '=': '=',
            '<>': '≠',
            '>=': '>=',
            '<=': '<=',
            '>': '>',
            '<': '<',
            'begins_with': 'begins_with'
          },
          attributeTypes: {
            'S': 'String',
            'N': 'Number',
          },
        })
        res.render('scan', data)
      })
  }))

  app.get('/tables/:TableName/items', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    req.query = pickBy(req.query)
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {}

    return describeTable({ TableName })
      .then(description => {
        const ExclusiveStartKey = req.query.startKey
          ? JSON.parse(req.query.startKey)
          : {}
        const pageNum = req.query.pageNum ? parseInt(req.query.pageNum) : 1
        const ExpressionAttributeNames = {}
        const ExpressionAttributeValues = {}
        const FilterExpressions = []
        const KeyConditions = []
        const KeyConditionExpression = []
        const queryableSelection = req.query.queryableSelection || 'table'
        let indexBeingUsed = null

        if (req.query.operationType === 'query') {
          if (queryableSelection === 'table') {
            indexBeingUsed = description.Table
          } else if (description.Table.GlobalSecondaryIndexes) {
            indexBeingUsed = description.Table.GlobalSecondaryIndexes.find((index) => {
              return index.IndexName === req.query.queryableSelection
            })
          }
        }

        // Create a variable to uniquely identify each expression attribute
        let i = 0

        for (const key in filters) {
          if (filters[key].type === 'N') {
            filters[key].value = Number(filters[key].value)
          }

          ExpressionAttributeNames[`#key${i}`] = key
          ExpressionAttributeValues[`:key${i}`] = filters[key].value
          const matchedKeySchema = indexBeingUsed ? indexBeingUsed.KeySchema.find(
            (keySchemaItem) => keySchemaItem.AttributeName === key) : undefined

          if (matchedKeySchema) {
            // Only the Range key can support begins_with operator
            if (matchedKeySchema.KeyType === 'RANGE' && filters[key].operator === 'begins_with') {
              KeyConditionExpression.push(`${filters[key].operator} ( #key${i} , :key${i})`)
            } else {
              KeyConditionExpression.push(`#key${i} ${filters[key].operator} :key${i}`)
            }
          } else {
            ExpressionAttributeNames[`#key${i}`] = key
            ExpressionAttributeValues[`:key${i}`] = filters[key].value

            if (filters[key].operator === 'begins_with') {
              FilterExpressions.push(`${filters[key].operator} ( #key${i} , :key${i})`)
            } else {
              FilterExpressions.push(`#key${i} ${filters[key].operator} :key${i}`)
            }
          }
          // Increment the unique ID variable
          i = i + 1
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
            : undefined,
          KeyConditions: Object.keys(KeyConditions).length
            ? KeyConditions
            : undefined,
          KeyConditionExpression: KeyConditionExpression.length
            ? KeyConditionExpression.join(' AND ')
            : undefined,
        })

        if (req.query.queryableSelection && req.query.queryableSelection !== 'table') {
          params.IndexName = req.query.queryableSelection
        }

        const startKey = Object.keys(ExclusiveStartKey).length
          ? ExclusiveStartKey
          : undefined

        const pageSize = req.query.pageSize || 25

        return getPage(docClient, description.Table.KeySchema, TableName,
                       params, pageSize, startKey, req.query.operationType)
          .then(results => {
            const { pageItems, nextKey } = results

            const nextKeyParam = nextKey
              ? encodeURIComponent(JSON.stringify(nextKey))
              : null

            const primaryKeys = description.Table.KeySchema.map(
              schema => schema.AttributeName)
            // Primary keys are listed first.
            const uniqueKeys = [
              ...primaryKeys,
              ...extractKeysForItems(pageItems).filter(key => !primaryKeys.includes(key)),
            ]

            // Append the item key.
            for (const item of pageItems) {
              item.__key = extractKey(item, description.Table.KeySchema)
            }

            const data = Object.assign({}, description, {
              query: req.query,
              pageNum,
              prevKey: encodeURIComponent(req.query.prevKey || ''),
              startKey: encodeURIComponent(req.query.startKey || ''),
              nextKey: nextKeyParam,
              filterQueryString: encodeURIComponent(req.query.filters || ''),
              Items: pageItems,
              uniqueKeys,
            })

            res.json(data)
          })
          .catch(error => {
            res.status(400).send((error.code ? '[' + error.code + '] ' : '') + error.message)
          })
      })
  }))

  app.get('/tables/:TableName/meta', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    return Promise.all([
      describeTable({ TableName }),
      docClient.scan({ TableName }).promise()
    ])
      .then(([description, items]) => {
        const data = Object.assign({}, description, items)
        res.render('meta', data)
      })
  }))

  app.delete('/tables/:TableName/items/:key', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    return describeTable({ TableName })
      .then(result => {
        const params = {
          TableName,
          Key: parseKey(req.params.key, result.Table)
        }

        return deleteItem(params).then(() => {
          res.status(204).end()
        })
      })
  }))

  app.get('/tables/:TableName/add-item', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    return describeTable({ TableName })
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
  }))

  app.get('/tables/:TableName/items/:key', asyncMiddleware((req, res) => {
    const TableName = req.params.TableName
    return describeTable({ TableName })
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
  }))

  app.put(
    '/tables/:TableName/add-item',
    bodyParser.json({ limit: '500kb' }),
    asyncMiddleware((req, res) => {
      const TableName = req.params.TableName
      return describeTable({ TableName })
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
    }))

  app.put(
    '/tables/:TableName/items/:key',
    bodyParser.json({ limit: '500kb' }),
    asyncMiddleware((req, res) => {
      const TableName = req.params.TableName
      return describeTable({ TableName })
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
    }))

  app.use((err, req, res, next) => {
    console.error(err)
    next(err)
  })

  return app
}

function isAttributeNotAlreadyCreated(attributeDefinitions, attributeName) {
  return !attributeDefinitions
    .find(attributeDefinition => attributeDefinition.AttributeName === attributeName)
}

