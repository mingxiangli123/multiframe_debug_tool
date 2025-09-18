<template>
  <div class="detection-image-container">
    <canvas
      ref="canvas"
      :width="canvasWidth"
      :height="canvasHeight"
      class="detection-canvas"
      @load="handleImageLoad"
      @error="handleImageError"
      @click="handleCanvasClick"
    />
    <div class="image-controls">
      <button 
        @click="toggleDetectionBoxes" 
        class="toggle-btn"
        :class="{ active: showDetectionBoxes }"
      >
        {{ showDetectionBoxes ? '隐藏检测框' : '显示检测框' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DetectionImageCanvas',
  props: {
    imageSrc: {
      type: String,
      required: true
    },
    detectionData: {
      type: Array,
      default: () => []
    },
    coordinateArray: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      canvasWidth: 300,
      canvasHeight: 250,
      showDetectionBoxes: true,
      imageLoaded: false,
      image: null
    }
  },
  watch: {
    imageSrc: {
      handler() {
        this.loadImage()
      },
      immediate: true
    },
    showDetectionBoxes() {
      this.drawImage()
    },
    detectionData() {
      this.drawImage()
    }
  },
  mounted() {
    this.loadImage()
  },
  methods: {
    loadImage() {
      if (!this.imageSrc) return
      
      this.image = new Image()
      this.image.crossOrigin = 'anonymous'
      
      this.image.onload = () => {
        this.imageLoaded = true
        this.drawImage()
        this.$emit('load')
      }
      
      this.image.onerror = () => {
        this.imageLoaded = false
        this.drawPlaceholder()
        this.$emit('error')
      }
      
      this.image.src = this.imageSrc
    },
    
    drawImage() {
      if (!this.imageLoaded || !this.image) return
      
      const canvas = this.$refs.canvas
      const ctx = canvas.getContext('2d')
      
      // 清空画布
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
      
      // 绘制图片
      ctx.drawImage(this.image, 0, 0, this.canvasWidth, this.canvasHeight)
      
      // 绘制检测框
      if (this.showDetectionBoxes) {
        this.drawDetectionBoxes(ctx)
      }
    },
    
    drawDetectionBoxes(ctx) {
      const boxes = this.getDetectionBoxes()
      
      boxes.forEach((box, index) => {
        const { x1, y1, x2, y2, detScore } = box
        
        // 将原图坐标转换为画布坐标
        const canvasX1 = (x1 / this.image.naturalWidth) * this.canvasWidth
        const canvasY1 = (y1 / this.image.naturalHeight) * this.canvasHeight
        const canvasX2 = (x2 / this.image.naturalWidth) * this.canvasWidth
        const canvasY2 = (y2 / this.image.naturalHeight) * this.canvasHeight
        
        const width = canvasX2 - canvasX1
        const height = canvasY2 - canvasY1
        
        // 设置检测框样式
        ctx.strokeStyle = this.getBoxColor(detScore)
        ctx.lineWidth = 2
        
        // 绘制检测框（只有边框）
        ctx.strokeRect(canvasX1, canvasY1, width, height)
        
        // 绘制分数标签
        const scoreText = `${detScore}%`
        ctx.font = 'bold 14px Arial'
        const textMetrics = ctx.measureText(scoreText)
        const labelWidth = textMetrics.width + 8
        const labelHeight = 20
        
        // 分数标签背景
        ctx.fillStyle = this.getBoxColor(detScore, 0.9)
        ctx.fillRect(canvasX1, canvasY1 - labelHeight, labelWidth, labelHeight)
        
        // 分数文字
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.fillText(scoreText, canvasX1 + 4, canvasY1 - 4)
      })
    },
    
    getDetectionBoxes() {
      const boxes = []
      
      // 从detectionData解析检测框
      this.detectionData.forEach(detection => {
        if (detection.coordinate && detection.detScore !== undefined) {
          const coords = detection.coordinate
          if (coords.length >= 4) {
            boxes.push({
              x1: coords[0],
              y1: coords[1],
              x2: coords[2],
              y2: coords[3],
              detScore: detection.detScore || 0
            })
          }
        }
      })
      
      // 如果没有detectionData，尝试从coordinateArray解析主要检测框
      if (boxes.length === 0 && this.coordinateArray) {
        try {
          const coords = JSON.parse(this.coordinateArray)
          if (coords.length >= 4) {
            // 使用第一个detectionData的分数，如果有的话
            const firstDetection = this.detectionData[0] || {}
            boxes.push({
              x1: coords[0],
              y1: coords[1],
              x2: coords[2],
              y2: coords[3],
              detScore: firstDetection.detScore || 0
            })
          }
        } catch (e) {
          console.warn('Failed to parse coordinate array:', e)
        }
      }
      
      return boxes
    },
    
    getBoxColor(score, alpha = 1) {
      let r, g, b
      
      if (score >= 90) {
        // 高分：绿色
        r = 76; g = 175; b = 80
      } else if (score >= 70) {
        // 中分：橙色
        r = 255; g = 152; b = 0
      } else {
        // 低分：红色
        r = 244; g = 67; b = 54
      }
      
      return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`
    },
    
    drawPlaceholder() {
      const canvas = this.$refs.canvas
      const ctx = canvas.getContext('2d')
      
      // 清空画布
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
      
      // 绘制占位符背景
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      
      // 绘制边框
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight)
      
      // 绘制占位符文字
      ctx.fillStyle = '#999'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('图片加载失败', this.canvasWidth / 2, this.canvasHeight / 2 - 10)
      ctx.font = '12px Arial'
      ctx.fillText('或正在下载中...', this.canvasWidth / 2, this.canvasHeight / 2 + 10)
    },
    
    toggleDetectionBoxes() {
      this.showDetectionBoxes = !this.showDetectionBoxes
    },
    
    handleCanvasClick() {
      // 发射点击事件，传递图片src
      this.$emit('image-click', this.imageSrc)
    },
    
    handleImageLoad() {
      // 由内部处理
    },
    
    handleImageError() {
      // 由内部处理
    }
  }
}
</script>

<style scoped>
.detection-image-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.detection-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  transition: transform 0.3s ease;
  cursor: pointer;
}

.detection-canvas:hover {
  transform: scale(1.02);
}

.image-controls {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10;
}

.toggle-btn {
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.toggle-btn.active {
  background: rgba(76, 175, 80, 0.8);
}

.toggle-btn.active:hover {
  background: rgba(76, 175, 80, 1);
}
</style> 