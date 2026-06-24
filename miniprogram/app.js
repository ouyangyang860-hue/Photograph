App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-d0gdzf3qjd8cc78b8',
      traceUser: true
    })
    this.silentLogin()
  },

  silentLogin: function () {
    wx.cloud.callFunction({
      name: 'login',
      data: {}
    }).then(res => {
      if (res.result && res.result.success) {
        this.globalData.openid = res.result.openid
        this.globalData.isLoggedIn = true
        this.globalData.userInfo = res.result.userInfo
      }
    }).catch(err => {
      console.warn('云函数login未部署，等待部署后自动生效', err)
      this.globalData.isLoggedIn = true
    })
  },

  globalData: {
    openid: null,
    isLoggedIn: false,
    userInfo: null,
    theme: 'dark',
    layout: 'sphere'
  }
})