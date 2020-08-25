const db = require('../models')
const User = db.User
const Reply = db.Reply
const Tweet = db.Tweet

const adminController = {
  getUsers: (req, res) => {
    return User.findAll({
      include: [
        Tweet,
        { model: Tweet, as: 'LikedTweets' },
        { model: User, as: 'Followings' },
        { model: User, as: 'Followers' },
      ]
    })
      .then(result => {
        const data = result.map(item => ({
          ...item.dataValues,
          followingsCount: item.Followings.length,
          followersCount: item.Followers.length,
          likesCount: item.LikedTweets.length,
          tweetsCount: item.Tweets.length,
          isAdmin: item.dataValues.role.includes('admin')
        }))
        const users = data.sort((a, b) => b.tweetsCount - a.tweetsCount)
        return res.json(users)
      })
  },
  getTweets: (req, res) => {
    return Tweet.findAll({
      include: [User],
      order: [['createdAt', 'DESC']]
    }).then(tweets => {
      tweets = tweets.map(item => ({
        ...item.dataValues,
        description: item.description.substring(0, 50)
      }))
      return res.json(tweets)
    })
  },
  deleteTweet: (req, res) => {
    const id = Number(req.params.id)
    if (req.user.role !== 'admin') { return res.redirect('/signin') }
    return Tweet.findAll({ where: { id }, include: [User, Reply] })
      .then(tweet => {
        if (tweet[0].User.dataValues.id !== req.user.id) {
          if (tweet[0].Replies.length) {
            tweet[0].Replies.destroy()
            return tweet[0].destroy()
          }
          return tweet[0].destroy()
        }
      })
      .then(() => res.json({ status: 'success', message: "已刪除貼文" }))
  }
}

module.exports = adminController