const express = require('express')
const AWS = require('aws-sdk')
const promisify = require('es6-promisify')

const app = express()
app.set('json spaces', 2)
app.set('view engine', 'ejs')

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'key',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'secret',
  endpoint: process.env.DYNAMO_ENDPOINT || 'http://localhost:8000',
  sslEnabled: false,
  region: process.env.AWS_REGION || 'us-east-1'
})

const dynamodb = new AWS.DynamoDB()
const documentClient = new AWS.DynamoDB.DocumentClient()

const listTables = promisify(dynamodb.listTables.bind(dynamodb))
const describeTable = promisify(dynamodb.describeTable.bind(dynamodb))
const scan = promisify(documentClient.scan.bind(documentClient))

app.get('/', (req, res) => {
  dynamodb.listTables({}, (error, data) => {
    if (error) {
      res.json({error})
    } else {
      // res.json(data)
      res.render('tables', {data})
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

const port = process.env.PORT || 8001
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})
