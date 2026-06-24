import { createScopedThreejs } from 'threejs-miniprogram'

Page({
  data: {
    photoCount: 0,
    currentPhotoIndex: -1,
    loading: true,
    layout: 'sphere'
  },

  three: null,
  scene: null,
  camera: null,
  renderer: null,
  canvas: null,
  photoMeshes: [],
  icoGroup: null,
  raycaster: null,
  touchStartX: 0,
  touchStartY: 0,
  touchStartTime: 0,
  lastTouchX: 0,
  lastTouchY: 0,
  velocityX: 0,
  velocityY: 0,
  isDragging: false,
  pinchStartDist: 0,
  pinchStartZoom: 5,
  autoRotate: true,
  autoRotateSpeed: 0.003,
  animFrameId: null,
  photoList: [],

  onLoad() {
    this.loadPhotos()
  },

  onReady() {
    this.initThree()
  },

  onShow() {
    this.loadPhotos()
  },

  onHide() {
    this.autoRotate = false
  },

  onUnload() {
    this.autoRotate = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
    }
    if (this.renderer) {
      this.renderer.dispose()
    }
  },

  loadPhotos() {
    const db = wx.cloud.database()
    db.collection('photos').orderBy('createTime', 'desc').get().then(res => {
      this.photoList = res.data
      this.setData({
        photoCount: res.data.length,
        loading: false
      })
      if (this.scene) {
        this.updatePhotoSphere()
      }
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  initThree() {
    const query = wx.createSelectorQuery()
    query.select('#albumCanvas').node().exec(res => {
      const canvas = res[0].node
      this.canvas = canvas
      const THREE = createScopedThreejs(canvas)
      this.three = THREE

      const width = canvas.width
      const height = canvas.height

      const scene = new THREE.Scene()
      this.scene = scene

      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
      camera.position.z = 5
      this.camera = camera

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(wx.getWindowInfo().pixelRatio)
      renderer.setClearColor(0x0a0e27, 1)
      this.renderer = renderer

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)

      const pointLight = new THREE.PointLight(0x6c5ce7, 1.2, 50)
      pointLight.position.set(3, 3, 5)
      scene.add(pointLight)

      const group = new THREE.Group()
      scene.add(group)
      this.icoGroup = group

      this.raycaster = new THREE.Raycaster()

      this.addStarParticles(THREE, scene)

      if (this.photoList.length > 0) {
        this.updatePhotoSphere()
      }

      this.autoRotate = true
      this.animate()
    })
  },

  addStarParticles(THREE, scene) {
    const geometry = new THREE.BufferGeometry()
    const count = 300
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 30
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0x8899cc,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    })
    const stars = new THREE.Points(geometry, material)
    scene.add(stars)
  },

  loadTexture(fileID, mesh, THREE) {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        if (!res.fileList || !res.fileList[0] || !res.fileList[0].tempFileURL) return
        const url = res.fileList[0].tempFileURL

        wx.downloadFile({
          url: url,
          success: downloadRes => {
            if (downloadRes.statusCode !== 200) return
            const localPath = downloadRes.tempFilePath

            const img = this.canvas.createImage()
            img.onload = () => {
              const texture = new THREE.Texture(img)
              texture.needsUpdate = true
              texture.minFilter = THREE.LinearFilter
              texture.magFilter = THREE.LinearFilter

              if (mesh.material) {
                mesh.material.map = texture
                mesh.material.color.set(0xffffff)
                mesh.material.transparent = false
                mesh.material.needsUpdate = true
              }
            }
            img.src = localPath
          }
        })
      }
    })
  },

  updatePhotoSphere() {
    const THREE = this.three
    if (!THREE || !this.icoGroup) return

    while (this.icoGroup.children.length > 0) {
      const child = this.icoGroup.children[0]
      if (child.material && child.material.map) {
        child.material.map.dispose()
      }
      if (child.material) child.material.dispose()
      if (child.geometry) child.geometry.dispose()
      this.icoGroup.remove(child)
    }
    this.photoMeshes = []

    const photos = this.photoList
    if (photos.length === 0) return

    const radius = 2.2
    const count = photos.length

    photos.forEach((photo, i) => {
      const phi = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi

      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)

      const geometry = new THREE.PlaneGeometry(0.5, 0.5)
      const material = new THREE.MeshBasicMaterial({
        color: 0x4a7dff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      mesh.lookAt(0, 0, 0)
      mesh.userData = { photoId: photo._id, index: i, isFeatured: photo.isFeatured }

      if (photo.isFeatured) {
        mesh.scale.set(1.3, 1.3, 1.3)
      }

      this.icoGroup.add(mesh)
      this.photoMeshes.push(mesh)

      if (photo.fileID) {
        this.loadTexture(photo.fileID, mesh, THREE)
      }
    })
  },

  animate() {
    this.animFrameId = requestAnimationFrame(() => this.animate())

    if (this.icoGroup && this.autoRotate) {
      this.icoGroup.rotation.y += this.autoRotateSpeed
    }

    if (this.icoGroup && !this.isDragging) {
      this.velocityX *= 0.95
      this.velocityY *= 0.95
      this.icoGroup.rotation.y += this.velocityX
      this.icoGroup.rotation.x += this.velocityY

      this.icoGroup.rotation.x = Math.max(-1.2, Math.min(1.2, this.icoGroup.rotation.x))

      if (Math.abs(this.velocityX) < 0.0001 && Math.abs(this.velocityY) < 0.0001) {
        this.autoRotate = true
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  },

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true
      this.autoRotate = false
      this.touchStartX = e.touches[0].x
      this.touchStartY = e.touches[0].y
      this.touchStartTime = Date.now()
      this.lastTouchX = e.touches[0].x
      this.lastTouchY = e.touches[0].y
      this.velocityX = 0
      this.velocityY = 0
    } else if (e.touches.length === 2) {
      this.isDragging = false
      const dx = e.touches[0].x - e.touches[1].x
      const dy = e.touches[0].y - e.touches[1].y
      this.pinchStartDist = Math.sqrt(dx * dx + dy * dy)
      this.pinchStartZoom = this.camera.position.z
    }
  },

  onTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].x - this.lastTouchX
      const deltaY = e.touches[0].y - this.lastTouchY

      this.velocityX = deltaX * 0.005
      this.velocityY = deltaY * 0.005

      if (this.icoGroup) {
        this.icoGroup.rotation.y += this.velocityX
        this.icoGroup.rotation.x += this.velocityY
        this.icoGroup.rotation.x = Math.max(-1.2, Math.min(1.2, this.icoGroup.rotation.x))
      }

      this.lastTouchX = e.touches[0].x
      this.lastTouchY = e.touches[0].y
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].x - e.touches[1].x
      const dy = e.touches[0].y - e.touches[1].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = this.pinchStartDist / dist
      const newZ = Math.max(2.5, Math.min(10, this.pinchStartZoom * scale))
      this.camera.position.z = newZ
    }
  },

  onTouchEnd(e) {
    if (e.touches.length === 0) {
      const dt = Date.now() - this.touchStartTime
      const dx = Math.abs(e.changedTouches[0].x - this.touchStartX)
      const dy = Math.abs(e.changedTouches[0].y - this.touchStartY)

      if (dt < 300 && dx < 10 && dy < 10) {
        this.handleTap(e.changedTouches[0].x, e.changedTouches[0].y)
      }

      this.isDragging = false
    }
  },

  handleTap(x, y) {
    if (!this.three || !this.raycaster || !this.camera) return

    const THREE = this.three
    const canvas = this.renderer.domElement
    const mouse = new THREE.Vector2(
      (x / canvas.width) * 2 - 1,
      -(y / canvas.height) * 2 + 1
    )

    this.raycaster.setFromCamera(mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.photoMeshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object
      const photoData = mesh.userData
      this.setData({ currentPhotoIndex: photoData.index })

      const photo = this.photoList[photoData.index]
      if (photo) {
        wx.navigateTo({
          url: `/pages/detail/index?index=${photoData.index}&id=${photo._id}`
        })
      }
    }
  },

  onLongPress(e) {
    if (!this.three || !this.raycaster || !this.camera) return

    const THREE = this.three
    const canvas = this.renderer.domElement
    const touch = e.touches[0]
    const mouse = new THREE.Vector2(
      (touch.x / canvas.width) * 2 - 1,
      -(touch.y / canvas.height) * 2 + 1
    )

    this.raycaster.setFromCamera(mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.photoMeshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object
      const photoData = mesh.userData
      const photo = this.photoList[photoData.index]
      if (!photo) return

      wx.showActionSheet({
        itemList: [photo.isFeatured ? '取消主屏展示' : '设为主屏展示', '删除照片'],
        success: res => {
          if (res.tapIndex === 0) {
            this.toggleFeatured(photo)
          } else if (res.tapIndex === 1) {
            this.deletePhoto(photo)
          }
        }
      })
    }
  },

  toggleFeatured(photo) {
    const db = wx.cloud.database()
    db.collection('photos').doc(photo._id).update({
      data: { isFeatured: !photo.isFeatured }
    }).then(() => {
      wx.showToast({ title: photo.isFeatured ? '已取消展示' : '已设为展示', icon: 'success' })
      this.loadPhotos()
    })
  },

  deletePhoto(photo) {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          wx.cloud.callFunction({
            name: 'deletePhoto',
            data: { photoId: photo._id, fileID: photo.fileID }
          }).then(() => {
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

  switchLayout() {
    const layouts = ['sphere', 'carousel', 'spiral']
    const idx = layouts.indexOf(this.data.layout)
    const next = layouts[(idx + 1) % layouts.length]
    this.setData({ layout: next })
    this.applyLayout(next)
    wx.showToast({ title: `布局: ${next === 'sphere' ? '球体' : next === 'carousel' ? '圆环' : '螺旋'}`, icon: 'none' })
  },

  applyLayout(layout) {
    const THREE = this.three
    if (!THREE || !this.icoGroup) return

    const photos = this.photoList
    const count = photos.length
    if (count === 0) return

    this.photoMeshes.forEach((mesh, i) => {
      let x, y, z

      if (layout === 'sphere') {
        const phi = Math.acos(-1 + (2 * i) / count)
        const theta = Math.sqrt(count * Math.PI) * phi
        const r = 2.2
        x = r * Math.cos(theta) * Math.sin(phi)
        y = r * Math.sin(theta) * Math.sin(phi)
        z = r * Math.cos(phi)
      } else if (layout === 'carousel') {
        const angle = (i / count) * Math.PI * 2
        const r = 2.5
        x = r * Math.cos(angle)
        y = 0
        z = r * Math.sin(angle)
      } else if (layout === 'spiral') {
        const t = i / count
        const angle = t * Math.PI * 4
        const r = 1.5 + t * 1.5
        x = r * Math.cos(angle)
        y = (t - 0.5) * 3
        z = r * Math.sin(angle)
      }

      mesh.position.set(x, y, z)
      mesh.lookAt(0, 0, 0)
    })
  },

  resetView() {
    if (this.icoGroup) {
      this.icoGroup.rotation.set(0, 0, 0)
    }
    if (this.camera) {
      this.camera.position.z = 5
    }
    this.velocityX = 0
    this.velocityY = 0
    this.autoRotate = true
    this.setData({ currentPhotoIndex: -1 })
    wx.showToast({ title: '视角已重置', icon: 'none' })
  },

  randomBrowse() {
    this.autoRotateSpeed = 0.015
    this.autoRotate = true
    setTimeout(() => {
      this.autoRotateSpeed = 0.003
    }, 3000)
    wx.showToast({ title: '随机浏览中...', icon: 'none' })
  },

  goBack() {
    wx.navigateBack()
  },

  goManage() {
    wx.navigateTo({ url: '/pages/manage/index' })
  },

  goMine() {
    wx.navigateTo({ url: '/pages/mine/index' })
  },

  onShareAppMessage() {
    return {
      title: '来看看我的记忆星球 ✨',
      path: '/pages/index/index'
    }
  }
})