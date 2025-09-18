<template>
  <div id="app">
    <header class="app-header">
      <h1>多帧粪便分析DEBUG工具</h1>
      <div class="file-selector">
        <label for="csv-file-select">选择CSV文件:</label>
        <select 
          id="csv-file-select" 
          v-model="selectedFile" 
          @change="loadSelectedFile"
          :disabled="loading"
        >
          <option v-for="file in availableFiles" :key="file" :value="file">
            {{ file }}
          </option>
        </select>
        <span v-if="currentFile" class="current-file">当前: {{ currentFile }}</span>
      </div>
      <div class="header-stats">
        <div class="stat">
          <span class="stat-label">总记录数</span>
          <span class="stat-value">{{ totalRecords }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">时间范围</span>
          <span class="stat-value">{{ timeRange }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">平均检测得分</span>
          <span class="stat-value">{{ averageDetScore }}%</span>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div class="loading" v-if="loading">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>

      <div class="dashboard" v-else>
        <div class="view-switcher">
          <button 
            @click="currentView = 'timeline'"
            :class="{ active: currentView === 'timeline' }"
            class="view-btn"
          >
            📸 图片时间轴
          </button>
          <button 
            @click="currentView = 'table'"
            :class="{ active: currentView === 'table' }"
            class="view-btn"
          >
            📋 数据表格
          </button>
        </div>

        <div class="view-container">
          <ImageTimeline v-if="currentView === 'timeline'" :data="data" />
          <div v-else class="data-container">
            <h3>数据详情</h3>
            <DataTable :data="data" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { config } from '../config.js'
import DataTable from './components/DataTable.vue'
import ImageTimeline from './components/ImageTimeline.vue'

export default {
  name: 'App',
  components: {
    DataTable,
    ImageTimeline
  },
  data() {
    return {
      data: [],
      loading: true,
      loadingMessage: '初始化中...',
      totalRecords: 0,
      timeRange: '',
      averageDetScore: 0,
      availableFiles: [],
      selectedFile: '',
      currentFile: '',
      currentView: 'timeline'  // 默认显示图片时间轴
    }
  },
  async mounted() {
    await this.loadAvailableFiles()
    await this.loadData()
  },
  methods: {
    async loadAvailableFiles() {
      const toast = useToast()
      
      try {
        const response = await axios.get(config.getAPIURL('/files'))
        this.availableFiles = response.data.files
        this.currentFile = response.data.currentFile
        
        if (this.availableFiles.length > 0) {
          this.selectedFile = this.currentFile || this.availableFiles[0]
        }
      } catch (error) {
        console.error('获取文件列表失败:', error)
        toast.error('获取文件列表失败，请检查后端服务')
      }
    },
    async loadSelectedFile() {
      if (!this.selectedFile) return
      
      const toast = useToast()
      this.loading = true
      this.loadingMessage = `加载文件 ${this.selectedFile} 中...`
      
      try {
        await axios.post(config.getAPIURL('/load-file'), {
          filename: this.selectedFile
        })
        
        this.currentFile = this.selectedFile
        await this.loadData()
        toast.success(`成功加载文件: ${this.selectedFile}`)
      } catch (error) {
        console.error('加载文件失败:', error)
        toast.error(`加载文件失败: ${error.response?.data?.error || error.message}`)
        this.loading = false
      }
    },
    async loadData() {
      const toast = useToast()
      this.loadingMessage = '加载数据中...'

      try {
        const response = await axios.get(config.getAPIURL('/data'))
        this.data = response.data
        this.calculateStats()
        
        if (!this.currentFile) {
          // 如果是首次加载，获取当前文件信息
          const statsResponse = await axios.get(config.getAPIURL('/stats'))
          this.currentFile = statsResponse.data.currentFile
        }
        
        if (this.data.length > 0) {
          toast.success(`数据加载成功! 共 ${this.data.length} 条记录`)
        } else {
          toast.warning('数据文件为空')
        }
      } catch (error) {
        console.error('加载数据失败:', error)
        toast.error('加载数据失败，请检查后端服务')
      } finally {
        this.loading = false
      }
    },
    calculateStats() {
      if (!this.data.length) return

      this.totalRecords = this.data.length

      const timestamps = this.data.map(item => new Date(item.ts))
      const minTime = new Date(Math.min(...timestamps))
      const maxTime = new Date(Math.max(...timestamps))
      this.timeRange = `${minTime.toLocaleDateString()} - ${maxTime.toLocaleDateString()}`

      const scores = this.data.map(item => {
        try {
          const summary = JSON.parse(item.mark_summary.replace(/'/g, '"'))
          return summary[0]?.detScore || 0
        } catch (e) {
          return 0
        }
      })
      this.averageDetScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.app-header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 300;
}

.file-selector {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-selector label {
  font-weight: 500;
  font-size: 1rem;
}

.file-selector select {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.9rem;
  min-width: 200px;
  cursor: pointer;
}

.file-selector select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.current-file {
  font-size: 0.9rem;
  opacity: 0.8;
  font-style: italic;
}

.header-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.view-switcher {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: fit-content;
}

.view-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: #f8f9fa;
}

.view-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.view-container {
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.data-container {
  padding: 1.5rem;
}

.data-container h3 {
  margin-bottom: 1rem;
  color: #333;
  font-weight: 500;
}

@media (max-width: 768px) {
  .header-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .file-selector {
    flex-direction: column;
    gap: 0.5rem;
  }

  .app-header h1 {
    font-size: 2rem;
  }
  
  .view-switcher {
    width: 100%;
    justify-content: center;
  }
}
</style>