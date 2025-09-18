<template>
  <div class="timeline-chart">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'TimelineChart',
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  mounted() {
    this.renderChart()
  },
  watch: {
    data() {
      this.renderChart()
    }
  },
  methods: {
    renderChart() {
      if (!this.data.length) return

      const ctx = this.$refs.chartCanvas.getContext('2d')

      if (this.chart) {
        this.chart.destroy()
      }

      const hourlyData = this.processTimelineData()

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: hourlyData.labels,
          datasets: [{
            label: '检测事件数量',
            data: hourlyData.values,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '事件数量'
              }
            },
            x: {
              title: {
                display: true,
                text: '时间'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      })
    },
    processTimelineData() {
      const hourlyCount = {}

      this.data.forEach(item => {
        const date = new Date(item.ts)
        const hour = `${date.getHours()}:00`
        hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
      })

      const labels = Object.keys(hourlyCount).sort()
      const values = labels.map(label => hourlyCount[label])

      return { labels, values }
    }
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  }
}
</script>

<style scoped>
.timeline-chart {
  height: 300px;
  position: relative;
}
</style>