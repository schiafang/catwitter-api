if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }

const express = require('express')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const session = require('express-session')

const app = express()
const PORT = process.env.PORT || 3000

app.engine('handlebars', exphbs({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({ secret: process.env.SECRET, resave: false, saveUninitialized: false }))

app.listen(PORT, () => console.log(`caTwitter is listening on port:${PORT}`))

const passport = require('./config/passport')


require('./routes')(app, passport)