const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { photoId, fileID } = event

  try {
    const photo = await db.collection('photos').doc(photoId).get()

    if (!photo.data || photo.data._openid !== openid) {
      return { success: false, error: '无权删除此照片' }
    }

    if (fileID) {
      await cloud.deleteFile({ fileList: [fileID] })
    }

    await db.collection('photos').doc(photoId).remove()

    const updateData = { photoCount: db.command.inc(-1) }
    if (photo.data.isFeatured) {
      updateData.featuredCount = db.command.inc(-1)
    }

    await db.collection('users').where({ _openid: openid }).update({ data: updateData })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}