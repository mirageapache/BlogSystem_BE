const express = require('express')
const router = express.Router()

const user = require('./modules/user')
const article = require('./modules/article')
const comment = require('./modules/comment')
const login = require('./modules/login')

router.use('/user', user)

router.use('/article', article)

router.use('/comment', comment)

router.use('/login', login)

module.exports = router