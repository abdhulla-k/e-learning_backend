// import express
const express = require('express')

// import cors
const cors = require('cors')

// import dotenv
const dotenv = require('dotenv')

// import jwt
// const jwt = require('jsonwebtoken')

// import mongoose
const mongoose = require('mongoose')

// create the instance of expresslibrary
const app = express()

// Set up Global configuration access for dotenv
dotenv.config()

// configuring cors
const corsOptions = {
  origin: 'http://localhost:9000'
}
app.use(cors(corsOptions))

// get the user entered data
app.use(express.json())

// import routers
const homeRoutes = require('./routes/home')
const userRoutes = require('./routes/user')

// enable routing
app.use('/', homeRoutes) // home routes
app.use('/user', userRoutes) // users related routes

// connect with database
mongoose.connect('mongodb://localhost:27017/newApplication').then(data => {
  console.log('connected')

  // make it listenable
  app.listen(3000)
}).catch(err => {
  console.log(err)
})
