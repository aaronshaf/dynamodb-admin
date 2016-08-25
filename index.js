const express = require('express')
const AWS = require('aws-sdk')
const promisify = require('es6-promisify')
const getPort = require('get-port')
const path = require('path')

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
const get = promisify(documentClient.get.bind(documentClient))

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

app.get('/tables/:TableName', (req, res) => {
  const TableName = req.params.TableName
  Promise.all([
    describeTable({TableName}),
    scan({TableName})
  ]).then(([description, items]) => {
    const data = Object.assign({},
      description,
      items
    )
    res.render('scan', data)
  }).catch((error) => {
    res.json({error})
  })
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

app.get('/tables/:TableName/items/:id', (req, res) => {
  const params = {
    TableName : req.params.TableName,
    Key: {
      id: req.params.id
    }
  }

  get(params).then((response) => {
    if (!response) {
      return res.status(404).end()
    }
    res.render('item', {
      TableName: req.params.TableName,
      Item: response.Item
    })
  }).catch((error) => {
    res.json({error})
  })
})

getPort().then((availablePort) => {
  const port = process.env.PORT || availablePort
  app.listen(port, () => {
    console.log(`dynamodb-admin listening on port ${port}`)
  })
}).catch((error) => {
  console.error(error)
})
