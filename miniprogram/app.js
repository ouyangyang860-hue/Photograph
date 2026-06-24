App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d0gdzf3qjd8cc78b8',
      traceUser: true
    });
    this.checkLogin();
  },

  checkLogin: function () {
    const db = wx.cloud.database();
    db.collection('users').where({}).get().then(res => {
      if (res.data.length === 0) {
        this.login();
      } else {
        this.globalData.userInfo = res.data[0];
        this.globalData.isLoggedIn = true;
      }
    }).catch(err => {
      console.error('检查登录状态失败', err);
    });
  },

  login: function () {
    wx.cloud.callFunction({
      name: 'login',
      data: {}
    }).then(res => {
      this.globalData.openid = res.result.openid;
      this.globalData.isLoggedIn = true;
    }).catch(err => {
      console.error('登录失败', err);
    });
  },

  globalData: {
    openid: null,
    isLoggedIn: false,
    userInfo: null,
    theme: 'dark',
    layout: 'sphere'
  }
});