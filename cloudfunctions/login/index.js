const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const userRes = await db.collection('users').where({ _openid: openid }).get()

    if (userRes.data.length === 0) {
      await db.collection('users').add({
        data: {
          _openid: openid,
          nickName: '记忆星球用户',
          avatarUrl: '',
          createTime: db.serverDate(),
          photoCount: 0,
          featuredCount: 0
        }
      })

      const newUser = await db.collection('users').where({ _openid: openid }).get()
      return { success: true, openid, userInfo: newUser.data[0], isNewUser: true }
    }

    return { success: true, openid, userInfo: userRes.data[0], isNewUser: false }
  } catch (err) {
    return { success: false, error: err.message }
  }
}