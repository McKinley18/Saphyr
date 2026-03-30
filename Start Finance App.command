#!/bin/bash
cd "$(dirname "$0")"

echo "🧹 Cleaning up old processes..."
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

echo "🚀 Starting Finance App..."
npm start
