<template>
  <div class="image-timeline">
    <div class="timeline-header">
      <h3>图片时间轴</h3>
      <div class="timeline-controls">
        <div class="event-selector">
          <label for="event-select">选择检测事件:</label>
          <select 
            id="event-select"
            v-model="selectedEvent" 
            @change="loadEventData"
            class="event-select"
          >
            <option value="">全部事件</option>
            <option 
              v-for="event in events" 
              :key="event.uuid" 
              :value="event.uuid"
            >
              事件#{{ event.event_seq }} ({{ event.count }}张图片)
              {{ event.isroll ? '📍' : '' }}
            </option>
          </select>
        </div>
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索时间或坐标..."
            class="search-input"
          >
        </div>
        <div class="view-options">
          <label>
            <input type="checkbox" v-model="showAllDetails"> 显示详细信息
          </label>
        </div>
      </div>
      
      <div class="download-status" v-if="downloadStatus.isDownloading || downloadStatus.message">
        <div class="download-info">
          <div v-if="downloadStatus.isDownloading" class="downloading">
            <div class="spinner-small"></div>
            <span>正在从S3下载图片... {{ downloadStatus.downloaded }}/{{ downloadStatus.total }}</span>
          </div>
          <div v-else-if="downloadStatus.message" class="download-result" :class="downloadStatus.success ? 'success' : 'error'">
            {{ downloadStatus.message }}
          </div>
        </div>
      </div>
    </div>

    <div class="event-info" v-if="selectedEvent && currentEventInfo">
      <div class="event-summary">
        <h4>当前事件: #{{ currentEventInfo.event_seq }}</h4>
        <div class="event-stats">
          <span class="stat">共 {{ currentEventInfo.count }} 张图片</span>
          <span class="stat">{{ formatTimeRange(currentEventInfo.firstTime, currentEventInfo.lastTime) }}</span>
          <span v-if="currentEventInfo.isroll" class="stat roll-badge">📍 翻转事件</span>
        </div>
      </div>
    </div>

    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <div class="timeline-container" v-else>
      <div 
        v-for="(item, index) in displayData" 
        :key="item.uuid + '-' + item.payload_timestamp + '-' + index"
        class="timeline-item"
        :class="{ 'expanded': showAllDetails }"
      >
        <div class="timeline-date">
          <div class="date-badge">
            {{ formatDateWithSeconds(item.ts) }}
          </div>
        </div>

        <div class="timeline-content">
          <div class="image-section">
            <div class="image-container">
              <DetectionImageCanvas
                :image-src="getImageUrl(item.full_s3_path)"
                :detection-data="getDetectionData(item)"
                :coordinate-array="item.coordinate_array"
                @load="handleImageLoad"
                @error="handleImageError"
                @image-click="handleImageClick"
              />
              <div class="image-status" v-if="imageStatus[extractFilename(item.full_s3_path)]">
                <span class="status-badge" :class="imageStatus[extractFilename(item.full_s3_path)].type">
                  {{ imageStatus[extractFilename(item.full_s3_path)].text }}
                </span>
              </div>
            </div>
          </div>

          <div class="data-section">
            <div class="basic-info">
              <h4>基本信息</h4>
              <div class="info-grid">
                <div class="info-item">
                  <label>时间戳 (ts):</label>
                  <span class="timestamp">{{ item.ts }}</span>
                </div>
                <div class="info-item">
                  <label>事件序号 (event_seq):</label>
                  <span class="event-seq-info">{{ item.event_seq }}</span>
                </div>
                <div class="info-item full-width">
                  <label>S3路径 (full_s3_path):</label>
                  <span class="s3-path-info" :title="item.full_s3_path">{{ item.full_s3_path }}</span>
                </div>
                <div class="info-item full-width" v-if="item.raw_payload">
                  <label>原始载荷 (raw_payload):</label>
                  <div class="raw-payload">
                    <pre>{{ formatRawPayload(item.raw_payload) }}</pre>
                  </div>
                </div>
                <div class="info-item">
                  <label>是否定点照片 (isroll):</label>
                  <span :class="item.isroll ? 'is-roll' : 'not-roll'">
                    <span class="roll-icon">{{ item.isroll ? '📍' : '📷' }}</span>
                    {{ item.isroll ? '是' : '否' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="detection-info" v-if="showAllDetails">
              <h4>检测详情</h4>
              <div class="detection-data">
                <div class="info-item">
                  <label>UUID:</label>
                  <span class="uuid">{{ item.uuid }}</span>
                </div>
                <div class="info-item">
                  <label>载荷时间戳:</label>
                  <span>{{ item.payload_timestamp }}</span>
                </div>
                <div class="info-item">
                  <label>类别:</label>
                  <span class="cls-badge" :class="getClsClass(item.cls)">{{ item.cls }}</span>
                </div>
                <div class="info-item">
                  <label>检测分:</label>
                  <span :class="getScoreClass(getDetScore(item))">{{ getDetScore(item) }}%</span>
                </div>
                <div class="info-item">
                  <label>识别分:</label>
                  <span>{{ getReidScore(item) }}%</span>
                </div>
                <div class="coordinate-info">
                  <label>坐标数组 (x1,y1,x2,y2):</label>
                  <span class="coordinate">{{ formatCoordinate(item.coordinate_array) }}</span>
                </div>
                <div class="summary-info">
                  <label>标记摘要:</label>
                  <pre class="mark-summary">{{ formatMarkSummary(item.mark_summary) }}</pre>
                </div>
                <div class="image-info-detail">
                  <label>图片文件名:</label>
                  <span class="filename">{{ extractFilename(item.full_s3_path) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页控件 -->
    <div class="pagination" v-if="pagination.total > 1">
      <button
        @click="goToPage(1)"
        :disabled="pagination.current === 1"
        class="page-btn"
      >
        首页
      </button>
      <button
        @click="goToPage(pagination.current - 1)"
        :disabled="pagination.current === 1"
        class="page-btn"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ pagination.current }} 页 / 共 {{ pagination.total }} 页 
        ({{ pagination.count }} 条记录)
      </span>
      <button
        @click="goToPage(pagination.current + 1)"
        :disabled="pagination.current === pagination.total"
        class="page-btn"
      >
        下一页
      </button>
      <button
        @click="goToPage(pagination.total)"
        :disabled="pagination.current === pagination.total"
        class="page-btn"
      >
        末页
      </button>
    </div>

    <div v-if="displayData.length === 0 && !loading" class="no-data">
      <p>没有找到匹配的数据</p>
    </div>

    <!-- 简单的图片放大弹窗 -->
    <ImageModal
      :is-visible="showImageModal"
      :image-src="modalImageSrc"
      @close="closeImageModal"
    />
  </div>
</template>

<script>
import axios from 'axios'
import { config } from '../../config.js'
import DetectionImageCanvas from './DetectionImageCanvas.vue'
import ImageModal from './ImageModal.vue'

export default {
  name: 'ImageTimeline',
  components: {
    DetectionImageCanvas,
    ImageModal
  },
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      searchQuery: '',
      showAllDetails: false,
      events: [],
      selectedEvent: '',
      currentEventInfo: null,
      displayData: [],
      loading: false,
      loadingMessage: '',
      pagination: {
        current: 1,
        total: 1,
        count: 0,
        limit: 10
      },
      downloadStatus: {
        isDownloading: false,
        downloaded: 0,
        total: 0,
        message: '',
        success: false
      },
      imageStatus: {},
      
      // 新增简单的弹窗状态
      showImageModal: false,
      modalImageSrc: ''
    }
  },
  watch: {
    data: {
      handler() {
        this.loadEvents()
      },
      immediate: true
    },
    searchQuery() {
      this.pagination.current = 1
      this.loadEventData()
    }
  },
  methods: {
    async loadEvents() {
      if (this.data.length === 0) return
      
      try {
        const response = await axios.get(config.getAPIURL('/events'))
        this.events = response.data.events
        
        // 如果没有选中事件，默认选择第一个
        if (!this.selectedEvent && this.events.length > 0) {
          this.selectedEvent = this.events[0].uuid
          this.loadEventData()
        }
      } catch (error) {
        console.error('Failed to load events:', error)
      }
    },
    async loadEventData() {
      if (!this.selectedEvent) {
        this.displayData = this.filterData(this.data)
        this.updatePagination(this.displayData.length)
        return
      }
      
      this.loading = true
      this.loadingMessage = '加载事件数据中...'
      
      try {
        const response = await axios.get(
          config.getAPIURL(`/data/by-uuid/${this.selectedEvent}`),
          {
            params: {
              page: this.pagination.current,
              limit: this.pagination.limit
            }
          }
        )
        
        this.displayData = this.filterData(response.data.data)
        this.pagination = response.data.pagination
        this.currentEventInfo = this.events.find(e => e.uuid === this.selectedEvent)
        
        // 自动下载当前页的图片
        await this.downloadCurrentPageImages()
        
      } catch (error) {
        console.error('Failed to load event data:', error)
        this.displayData = []
      } finally {
        this.loading = false
      }
    },
    async downloadCurrentPageImages() {
      if (this.displayData.length === 0) return
      
      const s3Paths = this.displayData.map(item => item.full_s3_path)
      
      this.downloadStatus = {
        isDownloading: true,
        downloaded: 0,
        total: s3Paths.length,
        message: '',
        success: false
      }
      
      try {
        console.log(`Starting download of ${s3Paths.length} images for current page`)
        
        const response = await axios.post(config.getAPIURL('/download-images'), {
          s3Paths: s3Paths
        })
        
        this.downloadStatus.isDownloading = false
        
        if (response.data.success) {
          this.downloadStatus.message = `成功下载 ${response.data.downloaded} 张图片`
          this.downloadStatus.success = true
          
          if (response.data.failed > 0) {
            this.downloadStatus.message += `, ${response.data.failed} 张失败`
          }
          
          // 更新图片状态
          response.data.results.forEach(result => {
            const filename = this.extractFilename(result.s3Path)
            if (result.success) {
              this.imageStatus[filename] = {
                type: 'success',
                text: result.cached ? '📁 已缓存' : '⬇️ 已下载'
              }
            } else {
              this.imageStatus[filename] = {
                type: 'error',
                text: '❌ 下载失败'
              }
            }
          })
        } else {
          this.downloadStatus.message = '图片下载失败'
          this.downloadStatus.success = false
        }
        
        // 3秒后清除消息
        setTimeout(() => {
          this.downloadStatus.message = ''
        }, 3000)
        
      } catch (error) {
        console.error('Failed to download images:', error)
        this.downloadStatus.isDownloading = false
        this.downloadStatus.message = `下载失败: ${error.message}`
        this.downloadStatus.success = false
        
        setTimeout(() => {
          this.downloadStatus.message = ''
        }, 3000)
      }
    },
    extractFilename(s3Path) {
      const parts = s3Path.split('/')
      return parts[parts.length - 1]
    },
    getImageUrl(s3Path) {
      const filename = this.extractFilename(s3Path)
      return `${config.getAPIURL(`/image/${filename}`)}`
    },
    getDetectionData(item) {
      try {
        const summary = JSON.parse(item.mark_summary.replace(/'/g, '"'))
        return summary.map(detection => ({
          cls: detection.cls,
          coordinate: detection.coordinate,
          detScore: detection.detScore,
          reidScore: detection.reidScore
        }))
      } catch {
        return []
      }
    },
    filterData(data) {
      if (!this.searchQuery) return data
      
      const query = this.searchQuery.toLowerCase()
      return data.filter(item => 
        item.ts.toLowerCase().includes(query) ||
        item.coordinate_array.toLowerCase().includes(query) ||
        item.payload_timestamp.toString().includes(query)
      )
    },
    updatePagination(totalCount) {
      this.pagination = {
        current: 1,
        total: Math.ceil(totalCount / this.pagination.limit),
        count: totalCount,
        limit: this.pagination.limit
      }
    },
    goToPage(page) {
      this.pagination.current = page
      this.loadEventData()
    },
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatDateWithSeconds(timestamp) {
      // 左侧时间展示精确到秒
      return new Date(timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleString('zh-CN')
    },
    formatTimeRange(start, end) {
      const startTime = new Date(start).toLocaleTimeString('zh-CN')
      const endTime = new Date(end).toLocaleTimeString('zh-CN')
      return `${startTime} - ${endTime}`
    },
    formatCoordinate(coordArray) {
      try {
        const coords = JSON.parse(coordArray)
        return `[${coords.join(', ')}]`
      } catch {
        return coordArray
      }
    },
    formatMarkSummary(summary) {
      try {
        const parsed = JSON.parse(summary.replace(/'/g, '"'))
        return JSON.stringify(parsed, null, 2)
      } catch {
        return summary
      }
    },
    formatRawPayload(rawPayload) {
      try {
        // 尝试解析并格式化JSON
        const parsed = JSON.parse(rawPayload)
        return JSON.stringify(parsed, null, 2)
      } catch {
        // 如果不是有效JSON，直接返回原文本
        return rawPayload
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
    getClsClass(cls) {
      return `cls-${cls.toLowerCase()}`
    },
    handleImageLoad() {
      // 图片加载成功
    },
    handleImageError() {
      // 图片加载失败
    },
    
    // 新增简单的图片点击处理
    handleImageClick(imageSrc) {
      this.modalImageSrc = imageSrc
      this.showImageModal = true
    },
    
    closeImageModal() {
      this.showImageModal = false
      this.modalImageSrc = ''
    }
  }
}
</script>

<style scoped>
.image-timeline {
  width: 100%;
  padding: 1rem;
}

.timeline-header {
  margin-bottom: 2rem;
}

.timeline-header h3 {
  margin-bottom: 1rem;
  color: #333;
  font-weight: 500;
}

.timeline-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.download-status {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.downloading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #007bff;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.download-result {
  padding: 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.download-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.download-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.event-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-selector label {
  font-weight: 500;
  color: #666;
}

.event-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
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

.view-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  cursor: pointer;
}

.event-info {
  background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.event-summary h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.event-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.event-stats .stat {
  background: rgba(255,255,255,0.7);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #666;
}

.roll-badge {
  color: #ff5722 !important;
  font-weight: 600;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.timeline-container {
  position: relative;
  padding-left: 0;
}

.timeline-item {
  position: relative;
  margin-bottom: 3rem;
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -1rem;
  top: 0;
  bottom: -3rem;
  width: 2px;
  background: linear-gradient(to bottom, #667eea, #764ba2);
}

.timeline-item:last-child::before {
  bottom: 0;
}

.timeline-date {
  flex-shrink: 0;
  width: 120px;
  margin-right: 1rem;
}

.date-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 11px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  line-height: 1.2;
  word-break: keep-all;
}

.timeline-content {
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
}

.image-section {
  position: relative;
}

.image-container {
  position: relative;
  height: 250px;
  overflow: hidden;
}

.image-status {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.success {
  background: rgba(40, 167, 69, 0.9);
  color: white;
}

.status-badge.error {
  background: rgba(220, 53, 69, 0.9);
  color: white;
}

.cls-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.cls-waste {
  background-color: #ff5722;
  color: white;
}

.score-high {
  color: #4caf50;
  font-weight: 600;
}

.score-medium {
  color: #ff9800;
  font-weight: 600;
}

.score-low {
  color: #f44336;
  font-weight: 600;
}

.data-section {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.basic-info h4,
.detection-info h4 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.timestamp {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  background: #f0f8ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.event-seq-info {
  font-weight: 600;
  color: #667eea;
  font-size: 14px;
}

.s3-path-info {
  font-family: monospace;
  font-size: 11px;
  color: #666;
  word-break: break-all;
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  line-height: 1.4;
}

.raw-payload {
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.raw-payload pre {
  font-family: monospace;
  font-size: 10px;
  background: #f8f9fa;
  padding: 0.75rem;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.roll-icon {
  margin-right: 0.25rem;
}

.is-roll {
  color: #ff5722;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.not-roll {
  color: #28a745;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.uuid {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  word-break: break-all;
}

.filename {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.detection-data {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.coordinate {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.mark-summary {
  font-family: monospace;
  font-size: 11px;
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  margin: 0;
  white-space: pre-wrap;
  max-height: 150px;
  overflow-y: auto;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.page-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #667eea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 14px;
  margin: 0 1rem;
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.timeline-item.expanded .timeline-content {
  grid-template-columns: 350px 1fr;
}

@media (max-width: 1024px) {
  .timeline-item {
    flex-direction: column;
    gap: 1rem;
  }
  
  .timeline-date {
    width: auto;
    margin-right: 0;
  }
  
  .timeline-content {
    grid-template-columns: 1fr;
  }
  
  .timeline-item.expanded .timeline-content {
    grid-template-columns: 1fr;
  }
  
  .image-container {
    height: 200px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .timeline-container {
    padding-left: 0;
  }
  
  .timeline-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    max-width: none;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .page-info {
    margin: 0;
    order: -1;
    width: 100%;
    text-align: center;
  }
}
</style> 