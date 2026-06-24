Page({
  data: {
    photoList: [],
    filteredPhotos: [],
    filterType: 'all',
    allCount: 0,
    featuredCount: 0,
    selectedCount: 0,
    uploading: false,
    uploadProgress: 0
  },

  onLoad() {
    this.loadPhotos()
  },

  onShow() {
    this.loadPhotos()
  },

  loadPhotos() {
    const db = wx.cloud.database()
    db.collection('photos').orderBy('createTime', 'desc').get().then(res => {
      const list = res.data.map(p => ({ ...p, selected: false, tempUrl: '' }))
      const featuredCount = list.filter(p => p.isFeatured).length

      this.setData({
        photoList: list,
        allCount: list.length,
        featuredCount,
        selectedCount: 0
      })

      this.applyFilter()
      this.loadTempUrls(list)
    }).catch(() => {})
  },

  loadTempUrls(list) {
    const fileIDs = list.filter(p => p.fileID).map(p => p.fileID)
    if (fileIDs.length === 0) return

    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        const urlMap = {}
        res.fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })

        const updated = list.map(p => ({
          ...p,
          tempUrl: urlMap[p.fileID] || ''
        }))

        this.setData({ photoList: updated })
        this.applyFilter()
      }
    })
  },

  setFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ filterType: type })
    this.applyFilter()
  },

  applyFilter() {
    const { photoList, filterType } = this.data
    let filtered = photoList

    if (filterType === 'featured') {
      filtered = photoList.filter(p => p.isFeatured)
    } else if (filterType === 'normal') {
      filtered = photoList.filter(p => !p.isFeatured)
    }

    this.setData({ filteredPhotos: filtered })
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const photoList = this.data.photoList
    const idx = photoList.findIndex(p => p._id === id)
    if (idx < 0) return

    photoList[idx].selected = !photoList[idx].selected
    const selectedCount = photoList.filter(p => p.selected).length

    this.setData({ photoList, selectedCount })
    this.applyFilter()
  },

  chooseImage() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const files = res.tempFiles
        this.uploadFiles(files)
      }
    })
  },

  async uploadFiles(files) {
    this.setData({ uploading: true, uploadProgress: 0 })
    const total = files.length
    let completed = 0

    for (const file of files) {
      try {
        const cloudPath = `photos/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: file.tempFilePath
        })

        await wx.cloud.callFunction({
          name: 'uploadPhoto',
          data: {
            fileID: uploadRes.fileID,
            width: file.width || 0,
            height: file.height || 0,
            size: file.size || 0
          }
        })

        completed++
        this.setData({ uploadProgress: Math.round((completed / total) * 100) })
      } catch (err) {
        console.error('上传失败', err)
      }
    }

    this.setData({ uploading: false, uploadProgress: 0 })
    wx.showToast({ title: `成功上传 ${completed} 张`, icon: 'success' })
    this.loadPhotos()
  },

  batchSetFeatured() {
    const selected = this.data.photoList.filter(p => p.selected)
    if (selected.length === 0) return

    const db = wx.cloud.database()
    const promises = selected.map(p =>
      db.collection('photos').doc(p._id).update({ data: { isFeatured: true } })
    )

    Promise.all(promises).then(() => {
      wx.showToast({ title: '设置成功', icon: 'success' })
      this.loadPhotos()
    })
  },

  batchUnsetFeatured() {
    const selected = this.data.photoList.filter(p => p.selected)
    if (selected.length === 0) return

    const db = wx.cloud.database()
    const promises = selected.map(p =>
      db.collection('photos').doc(p._id).update({ data: { isFeatured: false } })
    )

    Promise.all(promises).then(() => {
      wx.showToast({ title: '取消成功', icon: 'success' })
      this.loadPhotos()
    })
  },

  batchDelete() {
    const selected = this.data.photoList.filter(p => p.selected)
    if (selected.length === 0) return

    wx.showModal({
      title: '确认删除',
      content: `确定删除 ${selected.length} 张照片吗？删除后无法恢复。`,
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          const promises = selected.map(p =>
            wx.cloud.callFunction({
              name: 'deletePhoto',
              data: { photoId: p._id, fileID: p.fileID }
            })
          )
          Promise.all(promises).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadPhotos()
          }).catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: '来看看我的记忆星球 ✨',
      path: '/pages/index/index'
    }
  }
})