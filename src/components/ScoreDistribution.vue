<template>
  <div class="score-chart">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'ScoreDistribution',
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

      const scoreData = this.processScoreData()

      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: scoreData.labels,
          datasets: [{
            data: scoreData.values,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      })
    },
    processScoreData() {
      const scoreRanges = {
        '90-100分': 0,
        '80-89分': 0,
        '70-79分': 0,
        '60-69分': 0,
        '60分以下': 0
      }

      this.data.forEach(item => {
        try {
          const summary = JSON.parse(item.mark_summary.replace(/'/g, '"'))
          const score = summary[0]?.detScore || 0

          if (score >= 90) scoreRanges['90-100分']++
          else if (score >= 80) scoreRanges['80-89分']++
          else if (score >= 70) scoreRanges['70-79分']++
          else if (score >= 60) scoreRanges['60-69分']++
          else scoreRanges['60分以下']++
        } catch (e) {
          scoreRanges['60分以下']++
        }
      })

      return {
        labels: Object.keys(scoreRanges),
        values: Object.values(scoreRanges)
      }
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
.score-chart {
  height: 300px;
  position: relative;
}
</style>