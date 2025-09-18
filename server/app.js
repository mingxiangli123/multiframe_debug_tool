import express from 'express'
import cors from 'cors'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config.js'

const app = express()
const PORT = config.server.port
const HOST = config.server.host

app.use(cors())
app.use(express.json())

let csvData = []
let currentFile = null

// 创建图片缓存目录
const imagesCacheDir = path.join(process.cwd(), '..', 'images_cache')
if (!fs.existsSync(imagesCacheDir)) {
  fs.mkdirSync(imagesCacheDir, { recursive: true })
  console.log('Created images cache directory:', imagesCacheDir)
}

// 初始化S3客户端
const s3Client = new S3Client({
  region: 'ap-east-1'
})

// 获取csv目录下的所有csv文件
function getCsvFiles() {
  const csvDir = path.join(process.cwd(), '..', 'csv')
  
  if (!fs.existsSync(csvDir)) {
    console.error('CSV directory not found:', csvDir)
    return []
  }
  
  try {
    const files = fs.readdirSync(csvDir)
    const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'))
    console.log('Found CSV files:', csvFiles)
    return csvFiles
  } catch (error) {
    console.error('Error reading CSV directory:', error)
    return []
  }
}

function loadCSVData(filename = null) {
  const csvFiles = getCsvFiles()
  
  if (csvFiles.length === 0) {
    return Promise.reject(new Error('No CSV files found in csv directory'))
  }
  
  // 如果没有指定文件名，使用第一个文件
  const selectedFile = filename || csvFiles[0]
  const csvPath = path.join(process.cwd(), '..', 'csv', selectedFile)
  
  console.log('Loading CSV from:', csvPath)
  currentFile = selectedFile

  return new Promise((resolve, reject) => {
    const results = []

    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath)
      reject(new Error('CSV file not found'))
      return
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          uuid: data.uuid,
          ts: data.ts,
          event_seq: parseInt(data.event_seq),
          full_s3_path: data.full_s3_path,
          payload_timestamp: data.payload_timestamp,
          mark_summary: data.mark_summary,
          cls: data.cls,
          coordinate_array: data.coordinate_array,
          raw_payload: data.raw_payload || '', // 添加raw_payload字段
          isroll: data.isroll === 'True'
        })
      })
      .on('end', () => {
        console.log(`Loaded ${results.length} records from CSV: ${selectedFile}`)
        csvData = results
        resolve(results)
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error)
        reject(error)
      })
  })
}

// 从S3路径提取bucket和key
function parseS3Path(s3Path) {
  // s3://bucket-name/path/to/file.jpg
  const withoutProtocol = s3Path.replace('s3://', '')
  const [bucket, ...pathParts] = withoutProtocol.split('/')
  const key = pathParts.join('/')
  return { bucket, key }
}

// 从S3路径提取文件名
function extractFilename(s3Path) {
  const parts = s3Path.split('/')
  return parts[parts.length - 1]
}

// 使用S3 SDK下载单个图片
async function downloadImageFromS3(s3Path) {
  const filename = extractFilename(s3Path)
  const localPath = path.join(imagesCacheDir, filename)
  
  // 如果文件已经存在，直接返回
  if (fs.existsSync(localPath)) {
    return { filename, localPath, cached: true }
  }
  
  try {
    const { bucket, key } = parseS3Path(s3Path)
    console.log(`Downloading from S3: ${bucket}/${key}`)
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
    
    const response = await s3Client.send(command)
    
    // 将S3响应流写入本地文件
    const writeStream = fs.createWriteStream(localPath)
    
    return new Promise((resolve, reject) => {
      response.Body.pipe(writeStream)
      
      writeStream.on('finish', () => {
        console.log(`Downloaded: ${filename}`)
        resolve({ filename, localPath, cached: false })
      })
      
      writeStream.on('error', (error) => {
        // 删除损坏的文件
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath)
        }
        reject(error)
      })
      
      response.Body.on('error', (error) => {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath)
        }
        reject(error)
      })
    })
    
  } catch (error) {
    console.error(`Failed to download ${s3Path} from S3:`, error.message)
    throw error
  }
}

// 批量下载图片
async function downloadImages(s3Paths) {
  const results = []
  
  // 限制并发下载数量，避免过多并发请求
  const CONCURRENT_DOWNLOADS = 3
  
  for (let i = 0; i < s3Paths.length; i += CONCURRENT_DOWNLOADS) {
    const batch = s3Paths.slice(i, i + CONCURRENT_DOWNLOADS)
    
    const batchPromises = batch.map(async (s3Path) => {
      try {
        const result = await downloadImageFromS3(s3Path)
        return { success: true, s3Path, ...result }
      } catch (error) {
        console.error(`Failed to download ${s3Path}:`, error.message)
        return { success: false, s3Path, error: error.message }
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // 如果还有更多批次，稍微延迟一下
    if (i + CONCURRENT_DOWNLOADS < s3Paths.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  return results
}

// 获取本地图片URL
app.get('/api/image/:filename', (req, res) => {
  const { filename } = req.params
  const localPath = path.join(imagesCacheDir, filename)
  
  if (!fs.existsSync(localPath)) {
    return res.status(404).json({ error: 'Image not found' })
  }
  
  // 设置缓存头
  res.set({
    'Cache-Control': 'public, max-age=86400', // 缓存24小时
    'Content-Type': 'image/jpeg'
  })
  
  // 返回图片文件
  res.sendFile(localPath)
})

// 下载指定页面的图片
app.post('/api/download-images', async (req, res) => {
  const { s3Paths } = req.body
  
  if (!Array.isArray(s3Paths) || s3Paths.length === 0) {
    return res.status(400).json({ error: 'Invalid s3Paths array' })
  }
  
  try {
    console.log(`Starting S3 download of ${s3Paths.length} images...`)
    const results = await downloadImages(s3Paths)
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`S3 download completed: ${successful.length} success, ${failed.length} failed`)
    
    res.json({
      success: true,
      downloaded: successful.length,
      failed: failed.length,
      results: results
    })
  } catch (error) {
    console.error('S3 download error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 获取所有唯一的UUID事件
app.get('/api/events', (req, res) => {
  const events = {}
  
  csvData.forEach(item => {
    if (!events[item.uuid]) {
      events[item.uuid] = {
        uuid: item.uuid,
        event_seq: item.event_seq,
        count: 0,
        firstTime: item.ts,
        lastTime: item.ts,
        isroll: false
      }
    }
    
    events[item.uuid].count++
    events[item.uuid].isroll = events[item.uuid].isroll || item.isroll
    
    if (new Date(item.ts) < new Date(events[item.uuid].firstTime)) {
      events[item.uuid].firstTime = item.ts
    }
    if (new Date(item.ts) > new Date(events[item.uuid].lastTime)) {
      events[item.uuid].lastTime = item.ts
    }
  })
  
  const eventsList = Object.values(events).sort((a, b) => a.event_seq - b.event_seq)
  
  res.json({
    events: eventsList,
    total: eventsList.length
  })
})

// 获取指定UUID的数据
app.get('/api/data/by-uuid/:uuid', (req, res) => {
  const { uuid } = req.params
  const { page = 1, limit = 10 } = req.query
  
  const filteredData = csvData.filter(item => item.uuid === uuid)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
  
  const startIndex = (parseInt(page) - 1) * parseInt(limit)
  const endIndex = startIndex + parseInt(limit)
  const paginatedData = filteredData.slice(startIndex, endIndex)
  
  res.json({
    data: paginatedData,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(filteredData.length / parseInt(limit)),
      count: filteredData.length,
      limit: parseInt(limit)
    }
  })
})

// 获取可用的CSV文件列表
app.get('/api/files', (req, res) => {
  const csvFiles = getCsvFiles()
  res.json({
    files: csvFiles,
    currentFile: currentFile
  })
})

// 加载指定的CSV文件
app.post('/api/load-file', async (req, res) => {
  const { filename } = req.body
  
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' })
  }
  
  try {
    await loadCSVData(filename)
    res.json({ 
      success: true, 
      message: `Successfully loaded ${filename}`,
      records: csvData.length,
      currentFile: currentFile
    })
  } catch (error) {
    console.error('Error loading file:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/data', (req, res) => {
  console.log('API request received for /api/data')
  res.json(csvData)
})

app.get('/api/stats', (req, res) => {
  const stats = {
    totalRecords: csvData.length,
    currentFile: currentFile,
    timeRange: {
      start: csvData.length > 0 ? csvData[0].ts : null,
      end: csvData.length > 0 ? csvData[csvData.length - 1].ts : null
    },
    averageDetScore: calculateAverageDetScore()
  }

  res.json(stats)
})

function calculateAverageDetScore() {
  if (csvData.length === 0) return 0

  let totalScore = 0
  let validScores = 0

  csvData.forEach(item => {
    try {
      const summary = JSON.parse(item.mark_summary.replace(/'/g, '"'))
      const score = summary[0]?.detScore
      if (typeof score === 'number') {
        totalScore += score
        validScores++
      }
    } catch (e) {
      // Skip invalid records
    }
  })

  return validScores > 0 ? Math.round(totalScore / validScores) : 0
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    records: csvData.length,
    currentFile: currentFile,
    timestamp: new Date().toISOString()
  })
})

// 启动时加载默认文件（第一个CSV文件）
loadCSVData()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server running on ${config.getServerURL()}`)
      console.log(`Loaded ${csvData.length} records from: ${currentFile}`)
      console.log(`Images cache directory: ${imagesCacheDir}`)
      console.log(`S3 region: ap-east-1`)
      console.log('API endpoints available:')
      console.log(`  GET ${config.getAPIURL('/files')}`)
      console.log(`  GET ${config.getAPIURL('/events')}`)
      console.log(`  GET ${config.getAPIURL('/data/by-uuid/:uuid')}`)
      console.log(`  POST ${config.getAPIURL('/download-images')}`)
      console.log(`  GET ${config.getAPIURL('/image/:filename')}`)
      console.log(`  POST ${config.getAPIURL('/load-file')}`)
      console.log(`  GET ${config.getAPIURL('/data')}`)
      console.log(`  GET ${config.getAPIURL('/stats')}`)
      console.log(`  GET ${config.getAPIURL('/health')}`)
      console.log('')
      console.log('💡 确保AWS凭证已配置:')
      console.log('   - AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY 环境变量')
      console.log('   - 或者 ~/.aws/credentials 文件')
    })
  })
  .catch((error) => {
    console.error('Failed to load CSV data:', error)
    console.log('Server will start anyway with empty data')

    app.listen(PORT, HOST, () => {
      console.log(`Server running on ${config.getServerURL()} (no data loaded)`)
    })
  })