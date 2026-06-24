Page({
  data: {
    currentPhoto: {},
    currentIndex: 0,
    totalCount: 0,
    photoAnim: {}
  },

  photoList: [],

  onLoad(options) {
    const index = parseInt(options.index) || 0
    this.loadPhotoList(index)
  },

  loadPhotoList(currentIndex) {
    const db = wx.cloud.database()
    db.collection('photos').orderBy('createTime', 'desc').get().then(res => {
      this.photoList = res.data
      this.setData({ totalCount: res.data.length })
      this.showPhoto(currentIndex)
    })
  },

  showPhoto(index) {
    if (index < 0 || index >= this.photoList.length) return

    const photo = this.photoList[index]
    const dateStr = photo.createTime ? this.formatDate(photo.createTime) : ''

    this.setData({ currentIndex: index })

    if (photo.fileID) {
      wx.cloud.getTempFileURL({
        fileList: [photo.fileID],
        success: res => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            this.setData({
              currentPhoto: {
                ...photo,
                tempUrl: res.fileList[0].tempFileURL,
                dateStr
              }
            })
            this.playPhotoAnim()
          }
        }
      })
    }
  },

  playPhotoAnim() {
    const anim = wx.createAnimation({ duration: 400, timingFunction: 'ease-out' })
    anim.opacity(1).scale(1).step()
    this.setData({ photoAnim: anim.export() })
  },

  prevPhoto() {
    if (this.data.currentIndex > 0) {
      this.showPhoto(this.data.currentIndex - 1)
    }
  },

  nextPhoto() {
    if (this.data.currentIndex < this.photoList.length - 1) {
      this.showPhoto(this.data.currentIndex + 1)
    }
  },

  closeDetail() {
    wx.navigateBack()
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  onShareAppMessage() {
    return {
      title: '来看看我的记忆星球 ✨',
      path: '/pages/index/index'
    }
  }
})