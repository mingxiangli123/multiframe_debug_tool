// 应用配置文件 - 集中管理所有IP和端口配置
export const config = {
  // 服务器配置
  server: {
    host: 'localhost',
    port: 3401
  },
  
  // 前端配置
  frontend: {
    host: 'localhost',
    port: 3400
  },
  
  // API基础URL
  api: {
    baseURL: function() {
      return `http://${this.server.host}:${this.server.port}`
    }
  },
  
  // 获取完整的服务器URL
  getServerURL: function() {
    return `http://${this.server.host}:${this.server.port}`
  },
  
  // 获取完整的前端URL
  getFrontendURL: function() {
    return `http://${this.frontend.host}:${this.frontend.port}`
  },
  
  // 获取API端点URL
  getAPIURL: function(endpoint = '') {
    return `${this.getServerURL()}/api${endpoint}`
  }
}

// 如果在Node.js环境中，也支持CommonJS导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { config }
} 