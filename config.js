// 应用配置文件 - 集中管理所有IP和端口配置
export const config = {
  // 服务器配置
  server: {
    host: '0.0.0.0',  // 改为0.0.0.0以允许外部访问
    port: 8089  // 后端端口
  },
  
  // 前端配置
  frontend: {
    host: '0.0.0.0',  // 改为0.0.0.0以允许外部访问
    port: 8088  // 前端端口
  },
  
  // 实际服务器IP (用于URL生成)
  serverIP: '10.51.64.12',  // 修改为您的IP
  
  // API基础URL
  api: {
    baseURL: function() {
      return `http://${config.serverIP}:${config.server.port}`
    }
  },
  
  // 获取完整的服务器URL
  getServerURL: function() {
    return `http://${config.serverIP}:${config.server.port}`
  },
  
  // 获取完整的前端URL
  getFrontendURL: function() {
    return `http://${config.serverIP}:${config.frontend.port}`
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