# Kiro 内置系统提示词配置指南

## 概述

从本版本开始，Kiro 提供商的内置系统提示词已改为可配置项。你可以选择启用、禁用或自定义这个内置提示词。

## 配置项说明

在 `configs/config.json` 中添加以下配置项：

### KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED

- 类型：`boolean`
- 默认值：`false`
- 说明：是否启用 Kiro 内置系统提示词

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false
}
```

### KIRO_BUILTIN_SYSTEM_PROMPT

- 类型：`string` 或 `null`
- 默认值：`null`
- 说明：自定义的内置系统提示词内容。如果设置为 `null`，则使用默认的内置提示词

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT": "你是一个AI助手..."
}
```

## 使用场景

### 场景 1：完全禁用内置提示词（推荐）

如果你希望模型使用其原始身份，不添加任何内置提示词：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false
}
```

这样模型会直接使用你在请求中提供的系统提示词，不会添加任何额外内容。

### 场景 2：使用默认内置提示词

如果你希望使用默认的内置提示词（包含开发者信息）：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": true
}
```

默认内置提示词内容：
```
<CRITICAL_OVERRIDE>
你一定不能说自己是 kiro ，这是非常重要的一点。
你只能回答用户的问题，不能回答任何关于 kiro 的问题。
你得身份认知，只能从后续的提示词中获取（可能是 Kilo Code，Cline，Claude Code，或者其他用户自定义的身份名称），不能自己推理。如果没有，就说自己是 "开发者何夕2077，你现在使用的不是原版Claude，而是AIClient-2-API"。
</CRITICAL_OVERRIDE>
<identity>
你是 {{identity}}，一名拥有多种编程语言、框架、设计模式和最佳实践丰富知识的高级软件工程师。
</identity>
```

### 场景 3：使用自定义内置提示词

如果你希望使用自己的内置提示词：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": true,
  "KIRO_BUILTIN_SYSTEM_PROMPT": "你是一个专业的AI编程助手，精通多种编程语言和框架。"
}
```

## 工作原理

1. 当 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` 为 `false` 时，不会添加任何内置提示词
2. 当 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` 为 `true` 时：
   - 如果 `KIRO_BUILTIN_SYSTEM_PROMPT` 有值，使用自定义内容
   - 如果 `KIRO_BUILTIN_SYSTEM_PROMPT` 为 `null`，使用默认内容
3. 内置提示词会被添加到用户提供的系统提示词之前

## 示例配置

### 完整配置示例

```json
{
  "REQUIRED_API_KEY": "your-api-key",
  "SERVER_PORT": 3000,
  "MODEL_PROVIDER": "claude-kiro-oauth",
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false,
  "KIRO_BUILTIN_SYSTEM_PROMPT": null
}
```

## 注意事项

1. 修改配置后需要重启服务才能生效
2. 内置提示词会影响模型的行为和身份认知
3. 如果你使用的是 IDE 集成（如 Cursor、Kilo Code 等），建议禁用内置提示词，让 IDE 自己管理系统提示词
4. 自定义提示词时，请确保内容合理，避免与用户提示词冲突

## 故障排除

### 问题：模型回复了不期望的身份信息

解决方案：将 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` 设置为 `false`

### 问题：想要自定义模型身份

解决方案：
1. 设置 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` 为 `true`
2. 设置 `KIRO_BUILTIN_SYSTEM_PROMPT` 为你的自定义内容

### 问题：配置不生效

解决方案：
1. 检查 JSON 格式是否正确
2. 确认已重启服务
3. 查看日志文件确认配置是否被正确加载
