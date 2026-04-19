#!/bin/bash

# Kiro 内置系统提示词测试脚本

API_KEY="sk-60ad4c34854008b49b14fbd892034d51"
BASE_URL="http://localhost:3000/claude-kiro-oauth/v1/messages"

echo "========================================="
echo "Kiro 内置系统提示词测试"
echo "========================================="
echo ""

echo "测试请求："
echo "模型: deepseek-3-2-agentic"
echo "问题: 你是谁？"
echo ""

curl -s "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "model": "deepseek-3-2-agentic",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": "你是谁？"}]
  }' | jq -r '.content[0].text'

echo ""
echo "========================================="
echo "如果看到 '开发者何夕2077' 相关内容，"
echo "说明内置提示词已启用。"
echo ""
echo "如果看到模型的默认身份回复，"
echo "说明内置提示词已禁用。"
echo "========================================="
