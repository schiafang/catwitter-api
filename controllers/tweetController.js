const db = require('../models')
const User = db.User
const Tweet = db.Tweet
const Reply = db.Reply
const Like = db.Like

const tweetController = {
  getTweets: (req, res) => {
    Tweet.findAll({
      include: [
        User,
        Reply,
        { model: User, as: 'LikedUsers' }
      ],
      order: [['createdAt', 'DESC']]
    }).then(tweets => {
      const data = tweets.map(t => ({
        ...t.dataValues,
        isLiked: t.LikedUsers.map(i => i.id).includes(req.user.id)
      }))
      return res.json(data)
    })
  },
  postTweet: (req, res) => {
    if (!req.body.description) {
      return res.json({ status: 'error', message: '需要推文內容' })
    }
    if (req.body.description.length > 140) {
      return res.json({ status: 'error', message: '字數不可超過140字' })
    }
    return Tweet.create({
      UserId: req.user.id,
      description: req.body.description,
    }).then(() => {
      return res.json({ status: 'success', message: '成功新增推文' })
    })
  },
  getTweet: (req, res) => {
    Tweet.findByPk(req.params.id, {
      include: [
        User,
        { model: User, as: 'LikedUsers' },
        { model: Reply, include: [User] }
      ],
      order: [['Replies', 'createdAt', 'DESC']]
    }).then(tweet => {
      const data = {
        tweet: tweet.toJSON(),
        isLiked: tweet.LikedUsers.map(d => d.id).includes(req.user.id)
      }
      return res.json(data)
    })
  },
  postReply: (req, res) => {
    if (!req.body.comment) {
      return res.json({ status: 'error', message: '需要回覆內容' })
    }
    if (req.body.comment.length > 140) {
      return res.json({ status: 'error', message: '字數不可超過140字' })
    }
    Reply.create({
      UserId: req.user.id,
      TweetId: req.params.id,
      comment: req.body.comment
    }).then(() => {
      return res.json({ status: 'success', message: '成功新增回覆' })
    })
  },
  getReply: (req, res) => {
    const id = req.params.id
    return Tweet.findByPk(id, { include: [Reply] })
      .then(tweet => {
        const replies = tweet.Replies
        return res.json({ replies })
      })
      .catch(err => console.log(err))
  },
  addLike: (req, res) => {
    Like.create({
      UserId: req.user.id,
      TweetId: req.params.id
    }).then(() => {
      return res.json({ status: 'success', message: 'Like更新成功' })
    })
  },
  removeLike: (req, res) => {
    Like.findOne({
      where: {
        UserId: req.user.id,
        TweetId: req.params.id
      }
    }).then(like => {
      like.destroy()
        .then(() => {
          return res.json({ status: 'success', message: 'Like更新成功' })
        })
    })
  }
}

module.exports = tweetController