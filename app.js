if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }

const express = require('express')
const bodyPaser = require('body-parser')
const session = require('express-session')
const passport = require('./config/passport')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static('public'))
app.use(bodyPaser.urlencoded({ extended: true }))
app.use(session({ secret: process.env.SECRET, resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

app.listen(PORT, () => console.log(`caTwitter is listening on port:${PORT}`))

require('./routes')(app, passport)

module.exports = app