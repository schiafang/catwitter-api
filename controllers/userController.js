const db = require('../models')
const bcrypt = require('bcryptjs')
const imgur = require('imgur-node-api')
const User = db.User
const Tweet = db.Tweet
const Reply = db.Reply
const Followship = db.Followship
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')

const userController = {
  signUp: (req, res) => {
    const { account, name, email, password, checkPassword } = req.body
    const hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
    const error = []

    if (!account || !name || !email || !password || !checkPassword) {
      error.push({ message: '所有欄位皆為必填' })
      return res.json({ status: 'error', message: error })
    }
    if (password !== checkPassword) {
      error.push({ message: '密碼與確認密碼必須相同' })
      return res.json({ status: 'error', message: error })
    }

    User.findOne({ where: { [Op.or]: [{ email }, { account }] }, raw: true })
      .then(user => {

        if (user) {
          if (user.email === email) { error.push({ message: 'Email已被註冊' }) }
          if (user.account === account) { error.push({ message: '帳號已被使用' }) }
          return res.json({ status: 'error', message: error })
        }
        if (!user) {
          console.log(email)
          return User.create({ account, name, email, password: hashPassword })
            .then(() => res.json({ status: 'success', message: '註冊成功' }))
        }
      })
  },
  signIn: (req, res) => {
    let username = req.body.email
    let password = req.body.password
    if (!username || !password) {
      return res.json({ status: 'error', message: "帳號密碼錯誤" })
    }

    User.findOne({ where: { [Op.or]: [{ email: username }, { account: username }] } })
      .then(user => {
        if (!user) return res.status(401).json({ status: 'error', message: '使用者未註冊' })
        if (!bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({ status: 'error', message: '密碼錯誤' })
        }

        const payload = { id: user.id }
        const token = jwt.sign(payload, process.env.TOKEN_KEY)
        return res.json({
          status: 'success',
          message: 'ok',
          token: token,
          user: {
            id: user.id, name: user.name, account: user.account, email: user.email, role: user.role
          }
        })
      })
      .catch(error => console.log(error))
  },
  putUser: async (req, res) => {
    const id = req.params.id
    const { email: originalEmail, account: originalAccount } = req.user
    const { account, name, email, password, passwordCheck } = req.body
    const error = []
    let newEmail = ''
    let newAccount = ''

    if (originalEmail === email) { newEmail = originalEmail }
    if (originalAccount === account) { newAccount = originalAccount }
    if (password !== passwordCheck) { error.push({ message: '密碼與確認密碼必須相同!' }) }
    if (originalEmail !== email) {
      await User.findOne({ where: { email } })
        .then(user => {
          if (user) { error.push({ message: '信箱已經被註冊' }) }
          else { newEmail = email }
        })
    }
    if (originalAccount !== account) {
      await User.findOne({ where: { account } })
        .then(user => {
          if (user) { error.push({ message: '帳號已存在' }) }
          else { newAccount = account }
        })
    }
    if (error.length !== 0) { return rres.json({ status: 'error', message: error }) }

    return User.findByPk(id)
      .then(user => user.update({ name, password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)), email: newEmail, account: newAccount }))
      .then(() => {
        return res.json({ status: 'success', message: '更新成功' })
      })
  },
  putUserProfile: async (req, res) => {
    const id = Number(req.params.id)
    const { name, introduction } = req.body
    const { avatar, cover } = req.files
    const { files } = req

    if (req.use.id !== id) { return res.json({ status: 'error', message: 'error' }) }

    if (files) {
      imgur.setClientID(IMGUR_CLIENT_ID)
      if (avatar) {
        avatarPath = avatar[0].path
        await imgur.upload(avatarPath, (err, img) => {
          User.findByPk(id)
            .then(user => user.update({ avatar: img.data.link }))
        })
      }
      if (cover) {
        coverPath = cover[0].path
        await imgur.upload(coverPath, (err, img) => {
          User.findByPk(id)
            .then(user => user.update({ cover: img.data.link }))
        })
      }
    }
    const user = await User.findByPk(id)
    await user.update({ name, introduction })
    return res.json({ status: 'success', message: '更新成功' })
  },
  getTweets: (req, res) => {
    const id = req.params.id
    console.log(id)
    return User.findByPk(id, {
      include: [
        { model: Tweet, include: [Reply, { model: User, as: 'LikedUsers' },] },
        { model: User, as: 'Followers' },
        { model: User, as: 'Followings' },
      ],
      order: [['Tweets', 'createdAt', 'DESC']]
    })
      .then(user => {
        const data = user.toJSON()
        data.Tweets.forEach(t => {
          t.isLiked = t.LikedUsers.map(d => d.id).includes(req.user.id)
        })
        data.isFollowed = req.user.Followings.map(item => item.id).includes(user.id)

        return res.json(data)
      })
  },
  getLikes: async (req, res) => {
    return User.findByPk(req.params.id, {
      include: [
        Tweet,
        { model: Tweet, as: 'LikedTweets', include: [User, Reply, { model: User, as: 'LikedUsers' }] },
        { model: User, as: 'Followers' },
        { model: User, as: 'Followings' },
      ],
      order: [['LikedTweets', 'createdAt', 'DESC']],
    })
      .then(pageUser => {
        pageUser.dataValues.LikedTweets.forEach(t => {
          t.dataValues.isLiked = true
        })
        pageUser.isFollowed = req.user.Followings.map(item => item.id).includes(pageUser.id)
        return pageUser
      })
      .then(data => res.json(data))
  },
  getReplies: (req, res) => {
    User.findOne({
      where: { id: req.params.id },
      include: [
        Tweet,
        { model: User, as: 'Followers' },
        { model: User, as: 'Followings' },
        {
          model: Reply, include: [
            {
              model: Tweet, include: [
                User,
                Reply,
                { model: User, as: 'LikedUsers' }]
            }
          ],
        }
      ],
      order: [['Replies', 'createdAt', 'DESC']]
    })
      .then(pageUser => {
        pageUser.dataValues.Replies.forEach(r => {
          r.dataValues.Tweet.dataValues.isLiked =
            r.dataValues.Tweet.dataValues.LikedUsers.map(d => d.id).includes(req.user.id)
        })
        pageUser.isFollowed = req.user.Followings.map(item => item.id).includes(pageUser.id)
        return pageUser
      })
      .then(data => res.json(data))
  },
  getFollowings: (req, res) => {
    return User.findByPk(req.params.id, {
      include: [{ model: User, as: 'Followings' }, { model: Tweet }]
    }).then(user => {
      const Followings = user.Followings.map(following => ({
        ...following.dataValues,
        isFollowed: user.Followings.map((i) => i.id).includes(following.id)
      }))
      const results = {
        user,
        tweetCounts: user.Tweets.length,
        Followings
      }
      return res.json(results)
    })
  },
  getFollowers: (req, res) => {
    return User.findByPk(req.params.id, {
      include: [{ model: User, as: 'Followers' }, { model: Tweet }]
    }).then(user => {
      const Followers = user.Followers.map(follower => ({
        ...follower.dataValues,
        isFollowed: req.user.Followings.map((i) => i.id).includes(follower.id)
      }))
      const results = {
        user,
        tweetCounts: user.Tweets.length,
        Followers
      }
      return res.json(results)
    })
  },
  addFollow: async (req, res) => {
    const followingId = Number(req.body.id)
    const followerId = req.user.id

    if (followerId === followingId) { return res.json({ status: 'error', message: '不能追蹤自己' }) }

    await Followship.create({ followingId, followerId })
    return res.json({ status: 'success', message: 'followship 更新成功' })
  },
  removeFollow: async (req, res) => {
    const followingId = Number(req.params.id)
    const followerId = req.user.id
    console.log(followerId)

    if (followerId === followingId) { return res.json({ status: 'error', message: '不能追蹤自己' }) }

    await Followship.findOne({ where: { followingId, followerId } })
      .then(followship => followship.destroy())
      .then(() => res.json({ status: 'success', message: 'followship 更新成功' }))
  }
}

module.exports = userController