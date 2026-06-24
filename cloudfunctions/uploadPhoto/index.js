const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { fileID, width, height, size } = event

  try {
    const result = await db.collection('photos').add({
      data: {
        _openid: openid,
        fileID,
        cloudPath: '',
        createTime: db.serverDate(),
        isFeatured: false,
        width: width || 0,
        height: height || 0,
        size: size || 0
      }
    })

    await db.collection('users').where({ _openid: openid }).update({
      data: { photoCount: db.command.inc(1) }
    })

    return { success: true, id: result._id }
  } catch (err) {
    return { success: false, error: err.message }
  }
}