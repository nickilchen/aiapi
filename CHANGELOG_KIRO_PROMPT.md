# 更新日志 - Kiro 内置系统提示词配置

## 版本信息

- 更新日期：2026-04-19
- 更新类型：功能增强
- 影响范围：`claude-kiro-oauth` 提供商

## 更新内容

### 新增功能

1. **可配置的内置系统提示词**
   - 新增配置项 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED`（默认：`false`）
   - 新增配置项 `KIRO_BUILTIN_SYSTEM_PROMPT`（默认：`null`）
   - 支持完全禁用、使用默认或自定义内置提示词

### 修改的文件

1. **src/providers/claude/claude-kiro.js**
   - 修改 `buildCodewhispererRequest` 方法
   - 添加配置读取逻辑
   - 根据配置决定是否添加内置提示词

2. **src/core/config-manager.js**
   - 添加 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` 默认值
   - 添加 `KIRO_BUILTIN_SYSTEM_PROMPT` 默认值

3. **configs/config.json.example**
   - 添加新配置项示例

4. **configs/config.json**
   - 添加新配置项（默认禁用）

### 新增文档

1. **docs/KIRO_SYSTEM_PROMPT_CONFIG.md**
   - 详细的配置指南
   - 使用场景说明
   - 故障排除指南

2. **KIRO_SYSTEM_PROMPT_UPDATE.md**
   - 更新说明
   - 快速开始指南

3. **test-kiro-prompt.sh / test-kiro-prompt.ps1**
   - 测试脚本

## 使用方法

### 快速开始

1. 编辑 `configs/config.json`：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false
}
```

2. 重启服务

3. 测试（可选）：

```bash
# Linux/macOS
bash test-kiro-prompt.sh

# Windows PowerShell
.\test-kiro-prompt.ps1
```

### 配置选项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED` | boolean | `false` | 是否启用内置提示词 |
| `KIRO_BUILTIN_SYSTEM_PROMPT` | string/null | `null` | 自定义提示词内容 |

## 向后兼容性

- 默认配置（`KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED: false`）会禁用内置提示词
- 如果需要保持原有行为，设置 `KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED: true`
- 不影响其他提供商的功能

## 问题修复

### 修复的问题

- 模型自动回复包含 "开发者何夕2077" 的身份信息
- 无法自定义或禁用内置系统提示词
- 内置提示词与 IDE 集成冲突

### 测试用例

```bash
# 测试 1：禁用内置提示词
curl http://localhost:3000/claude-kiro-oauth/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"model": "deepseek-3-2-agentic", "max_tokens": 1000, "messages": [{"role": "user", "content": "你是谁？"}]}'

# 预期：模型使用默认身份回复，不包含 "开发者何夕2077"
```

## 迁移指南

### 从旧版本升级

1. 备份当前配置文件
2. 更新代码到最新版本
3. 在 `configs/config.json` 中添加新配置项：
   ```json
   {
     "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": false,
     "KIRO_BUILTIN_SYSTEM_PROMPT": null
   }
   ```
4. 重启服务
5. 测试功能是否正常

### 保持原有行为

如果你希望保持原有的内置提示词行为：

```json
{
  "KIRO_BUILTIN_SYSTEM_PROMPT_ENABLED": true,
  "KIRO_BUILTIN_SYSTEM_PROMPT": null
}
```

## 相关链接

- [详细配置指南](docs/KIRO_SYSTEM_PROMPT_CONFIG.md)
- [更新说明](KIRO_SYSTEM_PROMPT_UPDATE.md)
- [配置示例](configs/config.json.example)

## 贡献者

- 实现：Kiro AI Assistant
- 测试：待测试
- 文档：已完成

## 下一步计划

- [ ] 添加 Web UI 配置界面
- [ ] 支持多语言提示词模板
- [ ] 添加提示词版本管理
