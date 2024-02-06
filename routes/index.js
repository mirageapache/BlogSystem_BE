const express = require('express')
const router = express.Router()

const user = require('./modules/user')
const article = require('./modules/article')
const comment = require('./modules/comment')

router.use('/user', user)

router.use('/article', article)

router.use('/comment', comment)

module.exports = router