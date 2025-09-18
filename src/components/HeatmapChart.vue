<template>
  <div class="heatmap-container">
    <div class="heatmap-controls">
      <label>
        网格大小:
        <select v-model="gridSize" @change="renderHeatmap">
          <option value="50">50x50</option>
          <option value="100">100x100</option>
          <option value="200">200x200</option>
        </select>
      </label>
    </div>
    <canvas ref="heatmapCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
  </div>
</template>

<script>
export default {
  name: 'HeatmapChart',
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      gridSize: 100,
      canvasWidth: 800,
      canvasHeight: 600
    }
  },
  mounted() {
    this.renderHeatmap()
  },
  watch: {
    data() {
      this.renderHeatmap()
    }
  },
  methods: {
    renderHeatmap() {
      if (!this.data.length) return

      const canvas = this.$refs.heatmapCanvas
      const ctx = canvas.getContext('2d')

      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

      const heatmapData = this.processHeatmapData()
      this.drawHeatmap(ctx, heatmapData)
    },
    processHeatmapData() {
      const grid = {}
      const cellSize = parseInt(this.gridSize)

      this.data.forEach(item => {
        try {
          const coords = JSON.parse(item.coordinate_array)
          const centerX = Math.floor((coords[0] + coords[2]) / 2)
          const centerY = Math.floor((coords[1] + coords[3]) / 2)

          const gridX = Math.floor(centerX / cellSize)
          const gridY = Math.floor(centerY / cellSize)

          const key = `${gridX}-${gridY}`
          grid[key] = (grid[key] || 0) + 1
        } catch (e) {
          console.error('坐标解析错误:', e)
        }
      })

      return grid
    },
    drawHeatmap(ctx, heatmapData) {
      const cellSize = parseInt(this.gridSize)
      const maxCount = Math.max(...Object.values(heatmapData))

      if (maxCount === 0) return

      Object.entries(heatmapData).forEach(([key, count]) => {
        const [x, y] = key.split('-').map(Number)
        const intensity = count / maxCount

        const canvasX = (x * cellSize) % this.canvasWidth
        const canvasY = (y * cellSize) % this.canvasHeight

        const alpha = Math.max(0.1, intensity)
        ctx.fillStyle = `rgba(255, ${Math.floor(255 * (1 - intensity))}, 0, ${alpha})`
        ctx.fillRect(canvasX, canvasY, cellSize, cellSize)

        if (count > 1) {
          ctx.fillStyle = 'white'
          ctx.font = '12px Arial'
          ctx.textAlign = 'center'
          ctx.fillText(count, canvasX + cellSize/2, canvasY + cellSize/2 + 4)
        }
      })

      this.drawLegend(ctx, maxCount)
    },
    drawLegend(ctx, maxCount) {
      const legendX = this.canvasWidth - 200
      const legendY = 20
      const legendWidth = 150
      const legendHeight = 20

      for (let i = 0; i <= 10; i++) {
        const intensity = i / 10
        const x = legendX + (i * legendWidth / 10)

        ctx.fillStyle = `rgba(255, ${Math.floor(255 * (1 - intensity))}, 0, 0.8)`
        ctx.fillRect(x, legendY, legendWidth / 10, legendHeight)
      }

      ctx.strokeStyle = '#333'
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight)

      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.textAlign = 'left'
      ctx.fillText('0', legendX, legendY + legendHeight + 15)
      ctx.textAlign = 'right'
      ctx.fillText(maxCount.toString(), legendX + legendWidth, legendY + legendHeight + 15)
      ctx.textAlign = 'center'
      ctx.fillText('检测密度', legendX + legendWidth/2, legendY - 5)
    }
  }
}
</script>

<style scoped>
.heatmap-container {
  text-align: center;
}

.heatmap-controls {
  margin-bottom: 1rem;
}

.heatmap-controls label {
  display: inline-block;
  margin-right: 1rem;
}

.heatmap-controls select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

canvas {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-width: 100%;
  height: auto;
}
</style>