const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const userRes = await db.collection('users').where({ _openid: openid }).get();

    if (userRes.data.length > 0) {
      return {
        openid,
        userInfo: userRes.data[0],
        isNew: false
      };
    }

    const newUser = {
      nickName: '星旅人',
      avatarUrl: '',
      createTime: db.serverDate(),
      photoCount: 0,
      featuredCount: 0
    };

    await db.collection('users').add({ data: newUser });

    return {
      openid,
      userInfo: newUser,
      isNew: true
    };
  } catch (err) {
    console.error('登录失败', err);
    return { openid, error: err.message };
  }
};