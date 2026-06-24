const app = getApp()

Page({
  data: {
    userInfo: {},
    joinDate: '',
    photoCount: 0,
    featuredCount: 0,
    storageSize: '0 KB',
    layout: 'sphere',
    theme: 'dark'
  },

  onLoad() {
    this.loadUserInfo()
    this.loadStats()
    this.loadSettings()
  },

  onShow() {
    this.loadStats()
    this.loadSettings()
  },

  loadUserInfo() {
    const db = wx.cloud.database()
    db.collection('users').get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        this.setData({
          userInfo: user,
          joinDate: this.formatDate(user.createTime)
        })
        app.globalData.userInfo = user
      }
    }).catch(() => {})
  },

  loadStats() {
    const db = wx.cloud.database()
    db.collection('photos').get().then(res => {
      const photos = res.data
      const featuredCount = photos.filter(p => p.isFeatured).length
      const totalSize = photos.reduce((sum, p) => sum + (p.size || 0), 0)

      this.setData({
        photoCount: photos.length,
        featuredCount,
        storageSize: this.formatSize(totalSize)
      })
    }).catch(() => {})
  },

  loadSettings() {
    const db = wx.cloud.database()
    db.collection('settings').get().then(res => {
      if (res.data.length > 0) {
        const s = res.data[0]
        this.setData({
          layout: s.layout || 'sphere',
          theme: s.theme || 'dark'
        })
        app.globalData.layout = s.layout || 'sphere'
        app.globalData.theme = s.theme || 'dark'
      }
    }).catch(() => {})
  },

  setLayout(e) {
    const layout = e.currentTarget.dataset.layout
    this.setData({ layout })
    app.globalData.layout = layout
    this.saveSettings()
  },

  setTheme(e) {
    const theme = e.currentTarget.dataset.theme
    this.setData({ theme })
    app.globalData.theme = theme
    this.saveSettings()
  },

  saveSettings() {
    const db = wx.cloud.database()
    const { layout, theme } = this.data

    db.collection('settings').get().then(res => {
      if (res.data.length > 0) {
        db.collection('settings').doc(res.data[0]._id).update({
          data: { layout, theme }
        })
      } else {
        db.collection('settings').add({
          data: { layout, theme, autoRotate: true, rotationSpeed: 0.5 }
        })
      }
    })
  },

  shareApp() {
    wx.showShareMenu({ withShareTicket: true })
  },

  goManage() {
    wx.navigateTo({ url: '/pages/manage/index' })
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  formatSize(bytes) {
    if (bytes === 0) return '0 KB'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  },

  onShareAppMessage() {
    return {
      title: '来看看我的记忆星球 ✨',
      path: '/pages/index/index'
    }
  }
})