# CSV数据可视化系统

这是一个基于Vue.js 3和Node.js的垃圾检测数据可视化系统，用于分析和展示CSV格式的检测数据。

## 功能特性

- **时间线图表** - 显示检测事件随时间的分布
- **检测得分分布** - 以饼图形式展示不同分数范围的分布
- **位置热力图** - 基于检测坐标生成热力图，显示检测热点区域
- **数据表格** - 支持搜索和分页的详细数据表格
- **统计摘要** - 显示总记录数、时间范围和平均检测得分

## 技术栈

### 前端
- Vue.js 3 - 主要前端框架
- Vite - 构建工具和开发服务器
- Chart.js - 图表库
- Axios - HTTP客户端
- Vue Toastification - 消息提示组件

### 后端
- Node.js - 运行时环境
- Express.js - Web框架
- CORS - 跨域资源共享中间件
- csv-parser - CSV文件解析

## 安装和运行

### 1. 安装前端依赖
\`\`\`bash
cd csv-visualization
npm install
\`\`\`

### 2. 安装后端依赖
\`\`\`bash
cd server
npm install
\`\`\`

### 3. 启动后端服务器
\`\`\`bash
cd server
npm start
\`\`\`
后端服务器将在 http://localhost:3001 运行

### 4. 启动前端开发服务器
\`\`\`bash
cd csv-visualization
npm run dev
\`\`\`
前端应用将在 http://localhost:3000 运行

## 数据格式

系统期望CSV文件包含以下字段：
- \`uuid\` - 唯一标识符
- \`ts\` - 时间戳
- \`event_seq\` - 事件序列号
- \`full_s3_path\` - S3存储路径
- \`payload_timestamp\` - 载荷时间戳
- \`mark_summary\` - 检测结果摘要（JSON格式）
- \`cls\` - 类别
- \`coordinate_array\` - 坐标数组
- \`isroll\` - 是否定点照片

## API接口

### GET /api/data
返回所有CSV数据

### GET /api/stats
返回统计信息，包括：
- 总记录数
- 时间范围
- 平均检测得分

### GET /api/health
返回服务器健康状态

## 项目结构

\`\`\`
csv-visualization/
├── src/
│   ├── components/          # Vue组件
│   │   ├── TimelineChart.vue
│   │   ├── ScoreDistribution.vue
│   │   ├── HeatmapChart.vue
│   │   └── DataTable.vue
│   ├── App.vue             # 主应用组件
│   └── main.js             # 应用入口
├── server/                 # 后端服务器
│   ├── app.js             # Express服务器
│   └── package.json       # 后端依赖
├── package.json           # 前端依赖
└── vite.config.js         # Vite配置
\`\`\`

## 使用说明

1. 确保CSV文件位于正确的路径（默认为上级目录的 \`processed_20250918_120516.csv\`）
2. 启动后端服务器加载CSV数据
3. 启动前端应用查看可视化结果
4. 使用各种图表和表格来分析数据

## 自定义配置

- 修改 \`server/app.js\` 中的 \`csvPath\` 来指定不同的CSV文件路径
- 调整热力图的网格大小来改变热力图精度
- 修改分页大小和其他UI配置