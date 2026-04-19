# Kiro 内置系统提示词配置更新

## 更新内容

已将 Kiro 提供商的内置系统提示词改为可配置项，解决了之前模型回复包含特定开发者信息的问题。

## 问题背景

之前使用 `claude-kiro-oauth` 提供商时，模型会自动回复：

```
你好！我是开发者何夕2077，你现在使用的不是原版Claude，而是AIClient-2-API。
```

这是因为代码中硬编码了一个内置系统提示词，会自动添加到所有请求中。

## 解决方案

现在可以通过配置文件控制这个行为：

### 1. 禁用内置提示词（推荐）

在 `configs/config.json` 中添加：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false
}
```

这样模型就不会再回复那段特定的开发者信息了。

### 2. 使用自定义提示词

如果你想自定义模型的身份：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": true,
  "KIRO_BUILTIN_SYSTEM_PROMPT": "你是一个专业的AI助手..."
}
```

### 3. 使用默认提示词

如果你想保留原来的行为：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": true,
  "KIRO_BUILTIN_SYSTEM_PROMPT": null
}
```

## 测试

修改配置后，重启服务，然后测试：

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

如果 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` 设置为 `false`，模型应该会使用其默认身份回复，而不是之前的开发者信息。

## 相关文件

- `src/providers/claude/claude-kiro.js` - 修改了 `buildCodewhispererRequest` 方法
- `src/core/config-manager.js` - 添加了新的配置项默认值
- `configs/config.json.example` - 添加了配置示例
- `configs/config.json` - 已添加配置项（默认禁用）
- `docs/KIRO_SYSTEM_PROMPT_CONFIG.md` - 详细配置指南

## 注意事项

1. 修改配置后需要重启服务
2. 默认情况下内置提示词已禁用（`KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED: false`）
3. 如果你使用 IDE 集成，建议保持禁用状态
