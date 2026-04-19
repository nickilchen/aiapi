# 快速修复：Kiro 模型回复身份问题

## 问题

使用 `claude-kiro-oauth` 调用模型时，收到包含 "开发者何夕2077，你现在使用的不是原版Claude，而是AIClient-2-API" 的回复。

## 解决方案（30秒）

### 步骤 1：编辑配置文件

打开 `configs/config.json`，确认或添加以下配置：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false
}
```

### 步骤 2：重启服务

```bash
# 停止当前服务（Ctrl+C）
# 然后重新启动
npm start
```

### 步骤 3：测试（可选）

```bash
curl http://localhost:3000/claude-kiro-oauth/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "model": "deepseek-3-2-agentic",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": "你是谁？"}]
  }'
```

现在模型应该使用其默认身份回复，不再包含特定的开发者信息。

## 完成！

问题已解决。如需更多配置选项，请查看 [详细配置指南](docs/KIRO_SYSTEM_PROMPT_CONFIG.md)。
