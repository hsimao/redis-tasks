const express = require('express')
const path = require('path')
const logger = require('morgan')
const bodyParser = require('body-parser')
const redis = require('redis')
const { promisify } = require('util')

const app = express()

// redis setting
const client = redis.createClient()
client.on('connect', () => {
  console.log('Redis Server connected...')
})

// use async
// https://github.com/NodeRedis/node-redis#promises
const lrangeAsync = promisify(client.lrange).bind(client)
const hgetallAsync = promisify(client.hgetall).bind(client)

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

// get redis list and hash data
app.get('/', async (req, res) => {
  const title = 'Task List'

  const tasks = await lrangeAsync('tasks', 0, -1)
  const call = await hgetallAsync('call')
  res.render('index', {
    title,
    tasks,
    call: call || {},
  })

  // client.lrange('tasks', 0, -1, (err, tasks) => {
  //   client.hgetall('call', (err, call) => {
  //     res.render('index', {
  //       title,
  //       tasks,
  //       call,
  //     })
  //   })
  // })
})

// add redis list data
app.post('/task/add', (req, res) => {
  const task = req.body.task

  client.rpush('tasks', task, (err, _) => {
    if (err) console.log(err)
    console.log('Task Added...')
    res.redirect('/')
  })
})

// delete redis list data
app.post('/task/delete', async (req, res) => {
  const tasksToDel = req.body.tasks
  const tasks = await lrangeAsync('tasks', 0, -1)

  console.log('tasks', tasks)
  for (let i = 0; i < tasks.length; i++) {
    if (tasksToDel.indexOf(tasks[i]) != -1) {
      client.lrem('tasks', 0, tasks[i], (err, reply) => {
        if (err) console.log(err)
      })
    }
  }
  res.redirect('/')

  // client.lrange('tasks', 0, -1, (err, tasks) => {
  //   for (let i = 0; i < tasks.length; i++) {
  //     if (tasksToDel.indexOf(tasks[i]) != -1) {
  //       client.lrem('tasks', 0, tasks[i], () => {
  //         if (err) console.log(err)
  //       })
  //     }
  //   }
  //   res.redirect('/')
  // })
})

// add redis hash (like js object)
app.post('/call/add', (req, res) => {
  const newCall = {}
  newCall.name = req.body.name
  newCall.company = req.body.company
  newCall.phone = req.body.phone
  newCall.time = req.body.time

  client.hmset(
    'call',
    ['name', newCall.name, 'company', newCall.company, 'phone', newCall.phone, 'time', newCall.time],
    (err, reply) => {
      if (err) {
        console.log(err)
      } else {
        console.log(reply)
      }
      res.redirect('/')
    }
  )
})

app.listen(3000)
console.log('Server started On Port 3000...')

module.exports = app
