#!/bin/bash

# 读取配置文件中的端口信息
FRONTEND_PORT=3400
BACKEND_PORT=3401
SERVER_IP="10.30.67.128"

echo "🚀 Starting CSV Visualization Application..."
echo "📁 Working directory: $(pwd)"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# 函数：检查端口是否被占用
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口可用
    fi
}

# 函数：停止占用端口的进程
kill_port_process() {
    local port=$1
    echo "🔍 检查端口 $port..."
    if check_port $port; then
        echo "⚠️  端口 $port 已被占用，正在清理..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        if check_port $port; then
            echo "❌ 无法清理端口 $port，请手动停止占用该端口的进程"
            exit 1
        else
            echo "✅ 端口 $port 已清理"
        fi
    else
        echo "✅ 端口 $port 可用"
    fi
}

# 首先停止现有服务
echo "🛑 停止现有服务..."
./stop.sh 2>/dev/null || true

# 等待进程完全停止
sleep 3

# 检查并清理端口
kill_port_process $BACKEND_PORT
kill_port_process $FRONTEND_PORT

# 创建日志目录
mkdir -p logs

# 1. 安装前端依赖
echo "📦 Installing frontend dependencies..."
if ! npm install; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# 2. 安装后端依赖
echo "📦 Installing backend dependencies..."
cd server
if ! npm install; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
cd ..

# 3. 启动后端服务器
echo "🔧 Starting backend server on port $BACKEND_PORT..."
cd server
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..

# 等待后端启动
echo "⏳ Waiting for backend to start..."
sleep 5

# 检查后端是否启动成功
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend server failed to start"
    echo "📝 Backend log:"
    cat logs/backend.log
    exit 1
fi

# 检查后端端口是否监听
if ! check_port $BACKEND_PORT; then
    echo "❌ Backend server is not listening on port $BACKEND_PORT"
    echo "📝 Backend log:"
    cat logs/backend.log
    exit 1
fi

echo "✅ Backend server started with PID: $BACKEND_PID"

# 4. 启动前端开发服务器
echo "🎨 Starting frontend server on port $FRONTEND_PORT..."
nohup npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > logs/frontend.pid

# 等待前端启动
echo "⏳ Waiting for frontend to start..."
sleep 8

# 检查前端是否启动成功
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend server failed to start"
    echo "📝 Frontend log:"
    cat logs/frontend.log
    exit 1
fi

# 检查前端端口是否监听
if ! check_port $FRONTEND_PORT; then
    echo "❌ Frontend server is not listening on port $FRONTEND_PORT"
    echo "📝 Frontend log:"
    cat logs/frontend.log
    exit 1
fi

echo "✅ Frontend server started with PID: $FRONTEND_PID"

# 测试后端API
echo "🔍 Testing backend API..."
if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null; then
    echo "✅ Backend API is responding"
else
    echo "⚠️  Backend API is not responding yet (this might be normal)"
fi

echo ""
echo "🎉 Application started successfully!"
echo "🌐 Remote Access URLs:"
echo "📱 Frontend: http://$SERVER_IP:$FRONTEND_PORT"
echo "🔌 Backend:  http://$SERVER_IP:$BACKEND_PORT"
echo ""
echo "📊 API endpoints:"
echo "   - GET  http://$SERVER_IP:$BACKEND_PORT/api/files"
echo "   - POST http://$SERVER_IP:$BACKEND_PORT/api/load-file"
echo "   - GET  http://$SERVER_IP:$BACKEND_PORT/api/data"
echo "   - GET  http://$SERVER_IP:$BACKEND_PORT/api/stats"
echo "   - GET  http://$SERVER_IP:$BACKEND_PORT/api/health"
echo ""
echo "🏠 Local Access URLs (on server):"
echo "📱 Frontend: http://localhost:$FRONTEND_PORT"
echo "🔌 Backend:  http://localhost:$BACKEND_PORT"
echo ""
echo "📝 Logs:"
echo "   - Backend:  logs/backend.log"
echo "   - Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop the application, run: ./stop.sh"
echo ""
echo "⚠️  请确保防火墙已开放端口 $FRONTEND_PORT 和 $BACKEND_PORT"
echo "   Ubuntu/Debian: sudo ufw allow $FRONTEND_PORT && sudo ufw allow $BACKEND_PORT"
echo "   CentOS/RHEL: sudo firewall-cmd --permanent --add-port=$FRONTEND_PORT/tcp && sudo firewall-cmd --permanent --add-port=$BACKEND_PORT/tcp && sudo firewall-cmd --reload"