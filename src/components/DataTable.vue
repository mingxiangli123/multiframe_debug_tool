<template>
  <div class="data-table">
    <div class="table-controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索数据..."
          class="search-input"
        >
      </div>
      <div class="pagination-info">
        显示 {{ startIndex + 1 }}-{{ endIndex }} 共 {{ filteredData.length }} 条记录
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table-content">
        <thead>
          <tr>
            <th>时间</th>
            <th>类别</th>
            <th>检测得分</th>
            <th>重识别得分</th>
            <th>坐标</th>
            <th>S3路径</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedData" :key="item.uuid">
            <td>{{ formatTime(item.ts) }}</td>
            <td>
              <span class="cls-badge">{{ item.cls }}</span>
            </td>
            <td>
              <span :class="getScoreClass(getDetScore(item))">
                {{ getDetScore(item) }}%
              </span>
            </td>
            <td>{{ getReidScore(item) }}%</td>
            <td class="coordinate">{{ formatCoordinate(item.coordinate_array) }}</td>
            <td class="s3-path" :title="item.full_s3_path">
              {{ truncateS3Path(item.full_s3_path) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button
        @click="previousPage"
        :disabled="currentPage === 1"
        class="page-btn"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
      </span>
      <button
        @click="nextPage"
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DataTable',
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 10
    }
  },
  computed: {
    filteredData() {
      if (!this.searchQuery) return this.data

      return this.data.filter(item => {
        return Object.values(item).some(value =>
          String(value).toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      })
    },
    totalPages() {
      return Math.ceil(this.filteredData.length / this.itemsPerPage)
    },
    startIndex() {
      return (this.currentPage - 1) * this.itemsPerPage
    },
    endIndex() {
      return Math.min(this.startIndex + this.itemsPerPage, this.filteredData.length)
    },
    paginatedData() {
      return this.filteredData.slice(this.startIndex, this.endIndex)
    }
  },
  watch: {
    searchQuery() {
      this.currentPage = 1
    }
  },
  methods: {
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleString('zh-CN')
    },
    formatCoordinate(coordArray) {
      try {
        const coords = JSON.parse(coordArray)
        return `[${coords.join(', ')}]`
      } catch {
        return coordArray
      }
    },
    getDetScore(item) {
      try {
        const summary = JSON.parse(item.mark_summary.replace(/'/g, '"'))
        return summary[0]?.detScore || 0
      } catch {
        return 0
      }
    },
    getReidScore(item) {
      try {
        const summary = JSON.parse(item.mark_summary.replace(/'/g, '"'))
        return summary[0]?.reidScore || 0
      } catch {
        return 0
      }
    },
    getScoreClass(score) {
      if (score >= 90) return 'score-high'
      if (score >= 70) return 'score-medium'
      return 'score-low'
    },
    truncateS3Path(path) {
      if (path.length > 50) {
        return path.substring(0, 25) + '...' + path.substring(path.length - 20)
      }
      return path
    },
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    }
  }
}
</script>

<style scoped>
.data-table {
  width: 100%;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.pagination-info {
  color: #666;
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.data-table-content {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.data-table-content th,
.data-table-content td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table-content th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
}

.data-table-content tr:hover {
  background-color: #f5f5f5;
}

.cls-badge {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.score-high {
  color: #2e7d32;
  font-weight: 600;
}

.score-medium {
  color: #f57c00;
  font-weight: 600;
}

.score-low {
  color: #d32f2f;
  font-weight: 600;
}

.coordinate {
  font-family: monospace;
  font-size: 12px;
  color: #666;
}

.s3-path {
  font-family: monospace;
  font-size: 12px;
  color: #666;
  max-width: 200px;
  word-break: break-all;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #adb5bd;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }
}
</style>