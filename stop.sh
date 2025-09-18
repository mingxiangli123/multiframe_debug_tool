#!/bin/bash

# CSV数据可视化系统停止脚本

echo "🛑 停止CSV数据可视化系统..."

# 读取进程ID
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "停止后端服务器 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        echo "✅ 后端服务器已停止"
    else
        echo "⚠️  后端服务器已经停止"
    fi
    rm -f logs/backend.pid
else
    echo "⚠️  未找到后端进程ID文件"
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "停止前端服务器 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        echo "✅ 前端服务器已停止"
    else
        echo "⚠️  前端服务器已经停止"
    fi
    rm -f logs/frontend.pid
else
    echo "⚠️  未找到前端进程ID文件"
fi

# 清理可能残留的Node进程
echo "清理残留进程..."
pkill -f "node.*app.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo ""
echo "✅ 系统已完全停止"