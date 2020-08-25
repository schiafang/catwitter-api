const tweetController = require('../controllers/tweetController')
const userController = require('../controllers/userController')
const adminController = require('../controllers/adminController')
const multer = require('multer')
const upload = multer({ dest: 'temp/' })
const profileUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }])

const adminAuthenticated = (req, res, next) => {
  if (!req.user) { return res.status(401).json({ status: 'error', message: "驗證失敗" }) }
  if (req.user.role === 'admin') { return next() }
  return res.status(401).json({ status: 'error', message: "驗證失敗" })
}

module.exports = (app, passport) => {

  function userAuthenticated(req, res, next) {
    passport.authenticate('jwt', { session: false }, (error, user, i) => {
      if (!user) { return res.status(401).json({ status: 'error', message: "驗證失敗" }) }
      req.user = user
      return next()
    })(req, res, next)
  }

  app.post('/api/signup', userController.signUp)
  app.post('/api/signin', userController.signIn)

  app.get('/api/admin/tweets', userAuthenticated, adminAuthenticated, adminController.getTweets)
  app.get('/api/admin/users', userAuthenticated, adminAuthenticated, adminController.getUsers)
  app.delete('/api/admin/tweets/:id', userAuthenticated, adminAuthenticated, adminController.deleteTweet)

  app.get('/api/tweets', userAuthenticated, tweetController.getTweets)
  app.post('/api/tweets', userAuthenticated, tweetController.postTweet)
  app.get('/api/tweets/:id', userAuthenticated, tweetController.getTweet)
  app.post('/api/tweets/:id/like', userAuthenticated, tweetController.addLike)
  app.post('/api/tweets/:id/unlike', userAuthenticated, tweetController.removeLike)
  app.post('/api/tweets/:id/replies', userAuthenticated, tweetController.postReply)
  app.get('/api/tweets/:id/replies', userAuthenticated, tweetController.getReply)

  app.post('/api/users/:id', userAuthenticated, profileUpload, userController.putUserProfile)
  app.put('/api/users/:id', userAuthenticated, userController.putUser)

  app.get('/api/users/:id/tweets', userAuthenticated, userController.getTweets)
  app.get('/api/users/:id/replies', userAuthenticated, userController.getReplies)
  app.get('/api/users/:id/likes', userAuthenticated, userController.getLikes)

  app.get('/api/users/:id/followings', userAuthenticated, userController.getFollowings)
  app.get('/api/users/:id/followers', userAuthenticated, userController.getFollowers)

  app.post('/followships', userAuthenticated, userController.addFollow)
  app.delete('/followships/:id', userAuthenticated, userController.removeFollow)
}