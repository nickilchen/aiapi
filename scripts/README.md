# Docker 部署脚本

本目录包含用于快速部署和管理 AIClient2API Docker 容器的脚本。

## 脚本列表

- `docker-deploy.sh` - Linux/macOS 部署脚本
- `docker-deploy.ps1` - Windows PowerShell 部署脚本

## 快速开始

### Linux/macOS

```bash
# 赋予执行权限
chmod +x scripts/docker-deploy.sh

# 启动容器
./scripts/docker-deploy.sh start

# 查看状态
./scripts/docker-deploy.sh status

# 查看日志
./scripts/docker-deploy.sh logs
```

### Windows PowerShell

```powershell
# 启动容器
.\scripts\docker-deploy.ps1 start

# 查看状态
.\scripts\docker-deploy.ps1 status

# 查看日志
.\scripts\docker-deploy.ps1 logs
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `start` | 启动容器 |
| `stop` | 停止容器 |
| `restart` | 重启容器 |
| `remove` | 删除容器 |
| `logs` | 查看日志 |
| `status` | 查看状态 |
| `update` | 更新容器（拉取最新镜像并重启） |
| `shell` | 进入容器 shell |
| `pull` | 拉取镜像 |
| `help` | 显示帮助信息 |

## 环境变量

可以通过环境变量自定义配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DOCKER_IMAGE` | Docker 镜像名称 | `aiclient2api` |
| `DOCKER_TAG` | Docker 镜像标签 | `latest` |
| `HOST_PORT` | 主机端口 | `3000` |

### 示例

Linux/macOS:
```bash
# 使用自定义端口
HOST_PORT=8080 ./scripts/docker-deploy.sh start

# 使用指定镜像和标签
DOCKER_IMAGE=myuser/aiclient2api DOCKER_TAG=v1.0.0 ./scripts/docker-deploy.sh start
```

Windows PowerShell:
```powershell
# 使用自定义端口
.\scripts\docker-deploy.ps1 start -HostPort 8080

# 使用指定镜像和标签
.\scripts\docker-deploy.ps1 start -ImageName myuser/aiclient2api -ImageTag v1.0.0
```

## 常见操作

### 首次部署

```bash
# Linux/macOS
./scripts/docker-deploy.sh start

# Windows
.\scripts\docker-deploy.ps1 start
```

### 更新到最新版本

```bash
# Linux/macOS
./scripts/docker-deploy.sh update

# Windows
.\scripts\docker-deploy.ps1 update
```

### 查看实时日志

```bash
# Linux/macOS
./scripts/docker-deploy.sh logs

# Windows
.\scripts\docker-deploy.ps1 logs
```

### 进入容器调试

```bash
# Linux/macOS
./scripts/docker-deploy.sh shell

# Windows
.\scripts\docker-deploy.ps1 shell
```

### 完全重新部署

```bash
# Linux/macOS
./scripts/docker-deploy.sh remove
./scripts/docker-deploy.sh start

# Windows
.\scripts\docker-deploy.ps1 remove
.\scripts\docker-deploy.ps1 start
```

## 故障排查

### 端口被占用

如果默认端口 3000 被占用，可以使用自定义端口：

```bash
# Linux/macOS
HOST_PORT=8080 ./scripts/docker-deploy.sh start

# Windows
.\scripts\docker-deploy.ps1 start -HostPort 8080
```

### 容器无法启动

1. 查看容器日志：
   ```bash
   ./scripts/docker-deploy.sh logs
   ```

2. 检查容器状态：
   ```bash
   ./scripts/docker-deploy.sh status
   ```

3. 删除并重新创建：
   ```bash
   ./scripts/docker-deploy.sh remove
   ./scripts/docker-deploy.sh start
   ```

### 权限问题（Linux/macOS）

如果遇到权限问题：

```bash
# 赋予脚本执行权限
chmod +x scripts/docker-deploy.sh

# 检查配置目录权限
ls -la configs/
chmod -R 755 configs/
```

## 相关文档

- [Docker 部署指南](../docs/DOCKER_DEPLOYMENT.md)
- [GitHub Actions 工作流说明](../.github/workflows/README.md)
