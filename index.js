const express = require('express')
const AWS = require('aws-sdk')
const promisify = require('es6-promisify')
const path = require('path')
const errorhandler = require('errorhandler')
const { extractKey, parseKey } = require('./util')
const bodyParser = require('body-parser')

require('es7-object-polyfill')

if (process.env.NODE_ENV === 'production') {
  console.error('\x1b[31mDo not run this in production!') // red
  process.exit(1)
}

const app = express()
app.set('json spaces', 2)
app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname, 'views'))

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'key',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'secret',
  endpoint: process.env.DYNAMO_ENDPOINT || 'http://localhost:8000',
  sslEnabled: process.env.DYNAMO_ENDPOINT && process.env.DYNAMO_ENDPOINT.indexOf('https://') === 0,
  region: process.env.AWS_REGION || 'us-east-1'
})

const dynamodb = new AWS.DynamoDB()
const documentClient = new AWS.DynamoDB.DocumentClient()

const listTables = promisify(dynamodb.listTables.bind(dynamodb))
const describeTable = promisify(dynamodb.describeTable.bind(dynamodb))
const scan = promisify(documentClient.scan.bind(documentClient))
const getItem = promisify(documentClient.get.bind(documentClient))
const putItem = promisify(documentClient.put.bind(documentClient))
const deleteItem = promisify(documentClient.delete.bind(documentClient))

app.use(errorhandler())
app.use('/assets', express.static(path.join(__dirname, '/public')))

app.get('/', (req, res) => {
  dynamodb.listTables({}, (error, data) => {
    if (error) {
      res.json({error})
    } else {
      Promise.all(data.TableNames.map((TableName) => {
        return describeTable({TableName}).then((data) => data.Table)
      })).then((data) => {
        res.render('tables', {data})
      }).catch((error) => {
        res.json({error})
      })
    }
  })
})

app.get('/create-table', (req, res) => {
  res.render('create-table', {})
})

app.post('/create-table', bodyParser.urlencoded({extended: false}), (req, res, next) => {
  dynamodb.createTable({
    TableName: req.body.TableName,
    ProvisionedThroughput: {
      ReadCapacityUnits: req.body.ReadCapacityUnits,
      WriteCapacityUnits: req.body.WriteCapacityUnits
    },
    KeySchema: [{
      AttributeName: 'id',
      KeyType: 'HASH'
    }],
    AttributeDefinitions: [{
      AttributeName: 'id',
      AttributeType: 'S'
    }]
  }).promise().then((response) => {
    res.redirect('/')
  }).catch(next)
})

app.delete('/tables/:TableName', (req, res, next) => {
  const TableName = req.params.TableName
  dynamodb.deleteTable({TableName}).promise()
  .then(() => {
    res.status(204).end()
  })
  .catch(next)
})

app.get('/tables/:TableName', (req, res, next) => {
  const TableName = req.params.TableName
  Promise.all([
    describeTable({TableName}),
    scan({
      TableName,
      Limit: 25
    })
  ]).then(([description, result]) => {
    const data = Object.assign({},
      description,
      {
        Items: result.Items.map((item) => {
          return Object.assign({}, item, {
            __key: extractKey(item, description.Table.KeySchema)
          })
        })
      }
    )
    res.render('scan', data)
  }).catch(next)
})

app.get('/tables/:TableName/meta', (req, res) => {
  const TableName = req.params.TableName
  Promise.all([
    describeTable({TableName}),
    scan({TableName})
  ]).then(([description, items]) => {
    const data = Object.assign({},
      description,
      items
    )
    res.render('meta', data)
  }).catch((error) => {
    res.json({error})
  })
})

app.delete('/tables/:TableName/items/:key', (req, res, next) => {
  const TableName = req.params.TableName
  describeTable({TableName}).then((result) => {
    const params = {
      TableName,
      Key: parseKey(req.params.key, result.Table)
    }

    return deleteItem(params).then((response) => {
      res.status(204).end()
    })
  }).catch(next)
})

app.get('/tables/:TableName/add-item', (req, res, next) => {
  const TableName = req.params.TableName
  describeTable({TableName}).then((result) => {
    const table = result.Table
    const Item = {}
    table.KeySchema.forEach((key) => {
      const definition = table.AttributeDefinitions.find((attribute) => {
        return attribute.AttributeName === key.AttributeName
      })
      Item[key.AttributeName] = definition.AttributeType === 'S' ? '' : 0
    })
    res.render('item', {
      TableName: req.params.TableName,
      Item: Item,
      isNew: true
    })
  }).catch(next)
})

app.get('/tables/:TableName/items/:key', (req, res, next) => {
  const TableName = req.params.TableName
  describeTable({TableName}).then((result) => {
    const params = {
      TableName,
      Key: parseKey(req.params.key, result.Table)
    }

    return getItem(params).then((response) => {
      if (!response.Item) {
        return res.status(404).send('Not found')
      }
      res.render('item', {
        TableName: req.params.TableName,
        Item: response.Item,
        isNew: false
      })
    })
  }).catch(next)
})

app.put('/tables/:TableName/add-item', bodyParser.json(), (req, res, next) => {
  const TableName = req.params.TableName
  describeTable({TableName}).then((description) => {
    const params = {
      TableName,
      Item: req.body
    }

    return putItem(params).then((response) => {
      const Key = extractKey(req.body, description.Table.KeySchema)
      const params = {
        TableName,
        Key
      }
      return getItem(params).then((response) => {
        if (!response.Item) {
          return res.status(404).send('Not found')
        }
        return res.json(Key)
      })
    })
  }).catch(next)
})

app.put('/tables/:TableName/items/:key', bodyParser.json(), (req, res, next) => {
  const TableName = req.params.TableName
  describeTable({TableName}).then((result) => {
    const params = {
      TableName,
      Item: req.body
    }

    return putItem(params).then(() => {
      const params = {
        TableName,
        Key: parseKey(req.params.key, result.Table)
      }
      return getItem(params).then((response) => {
        return res.json(response.Item)
      })
    })
  }).catch(next)
})

const port = process.env.PORT || 8001
app.listen(port, () => {
  console.log(`dynamodb-admin listening on port ${port}`)
})
