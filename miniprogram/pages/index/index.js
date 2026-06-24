const app = getApp()

Page({
  data: {
    photoCount: 0,
    brandAnimation: {},
    planetAnimation: {},
    enterAnimation: {},
    bottomAnimation: {}
  },

  stars: [],
  starAnimFrameId: null,

  onLoad() {
    this.getPhotoCount()
  },

  onReady() {
    this.initStars()
    this.playEntryAnimations()
  },

  onShow() {
    this.getPhotoCount()
  },

  onUnload() {
    if (this.starAnimFrameId) {
      cancelAnimationFrame(this.starAnimFrameId)
    }
  },

  getPhotoCount() {
    const db = wx.cloud.database()
    db.collection('photos').count().then(res => {
      this.setData({ photoCount: res.total })
    }).catch(() => {
      this.setData({ photoCount: 0 })
    })
  },

  initStars() {
    const query = wx.createSelectorQuery()
    query.select('.star-canvas').fields({ node: true, size: true }).exec(res => {
      if (!res[0]) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getWindowInfo().pixelRatio
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)

      const width = res[0].width
      const height = res[0].height

      this.stars = []
      for (let i = 0; i < 120; i++) {
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.5 + 0.3,
          alpha: Math.random(),
          speed: Math.random() * 0.02 + 0.005,
          direction: Math.random() > 0.5 ? 1 : -1
        })
      }

      const animate = () => {
        ctx.clearRect(0, 0, width, height)
        this.stars.forEach(star => {
          star.alpha += star.speed * star.direction
          if (star.alpha >= 1) { star.alpha = 1; star.direction = -1 }
          if (star.alpha <= 0.1) { star.alpha = 0.1; star.direction = 1 }
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200, 220, 255, ${star.alpha})`
          ctx.fill()
        })
        this.starAnimFrameId = requestAnimationFrame(animate)
      }
      animate()
    })
  },

  playEntryAnimations() {
    const brand = wx.createAnimation({ duration: 1200, timingFunction: 'ease-out', delay: 200 })
    brand.opacity(1).translateY(0).step()
    this.setData({ brandAnimation: brand.export() })

    const planet = wx.createAnimation({ duration: 1000, timingFunction: 'ease-out', delay: 600 })
    planet.opacity(1).scale(1).step()
    this.setData({ planetAnimation: planet.export() })

    const enter = wx.createAnimation({ duration: 1000, timingFunction: 'ease-out', delay: 1000 })
    enter.opacity(1).translateY(0).step()
    this.setData({ enterAnimation: enter.export() })

    const bottom = wx.createAnimation({ duration: 800, timingFunction: 'ease-out', delay: 1400 })
    bottom.opacity(1).step()
    this.setData({ bottomAnimation: bottom.export() })
  },

  enterAlbum() {
    wx.navigateTo({ url: '/pages/album/index' })
  }
})