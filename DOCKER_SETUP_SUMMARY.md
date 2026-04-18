# Docker 镜像构建和部署配置总结

本文档总结了为 AIClient2API 项目配置的 Docker 镜像自动构建和部署系统。

## 📦 已创建的文件

### 1. GitHub Actions 工作流

#### `.github/workflows/docker-build.yml`
- **功能**: 基础 Docker 镜像构建工作流
- **触发**: 推送到主分支、标签推送、PR、手动触发
- **特性**:
  - 多架构支持 (amd64, arm64)
  - 自动标签生成
  - 推送到 Docker Hub
  - GitHub Actions 缓存加速

#### `.github/workflows/docker-publish.yml`
- **功能**: 完整的多仓库发布工作流
- **触发**: 推送到主分支、版本标签、Release 发布、手动触发
- **特性**:
  - 同时推送到 Docker Hub 和 GitHub Container Registry
  - 多架构支持 (amd64, arm64)
  - 自动生成版本标签
  - 创建发布说明
  - 构建缓存优化

#### `.github/workflows/README.md`
- GitHub Actions 工作流的详细说明文档
- 包含配置步骤、使用方法、故障排查

### 2. 部署脚本

#### `scripts/docker-deploy.sh`
- **平台**: Linux/macOS
- **功能**: 一键部署和管理 Docker 容器
- **命令**: start, stop, restart, remove, logs, status, update, shell, pull

#### `scripts/docker-deploy.ps1`
- **平台**: Windows PowerShell
- **功能**: 一键部署和管理 Docker 容器
- **命令**: 与 shell 脚本相同

#### `scripts/README.md`
- 部署脚本的使用说明文档

### 3. 配置文件

#### `docker-compose.example.yml`
- Docker Compose 配置模板
- 包含完整的服务配置、资源限制、健康检查等

### 4. 文档

#### `docs/DOCKER_DEPLOYMENT.md`
- 完整的 Docker 部署指南
- 包含快速开始、配置说明、高级配置、故障排查等

#### `DOCKER_SETUP_SUMMARY.md` (本文件)
- 整体配置总结

## 🚀 快速开始

### 方式一：使用部署脚本（推荐）

**Linux/macOS:**
```bash
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh start
```

**Windows:**
```powershell
.\scripts\docker-deploy.ps1 start
```

### 方式二：使用 Docker Compose

```bash
# 复制配置文件
cp docker-compose.example.yml docker-compose.yml

# 编辑配置（修改镜像名称等）
nano docker-compose.yml

# 启动服务
docker-compose up -d
```

### 方式三：直接使用 Docker 命令

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

## ⚙️ GitHub Actions 配置步骤

### 1. 配置 Docker Hub 密钥

在 GitHub 仓库设置中添加 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 添加以下密钥：
   - `DOCKER_USERNAME`: Docker Hub 用户名
   - `DOCKER_PASSWORD`: Docker Hub 访问令牌

### 2. 获取 Docker Hub 访问令牌

1. 登录 [Docker Hub](https://hub.docker.com/)
2. Account Settings → Security → New Access Token
3. 选择权限：Read, Write, Delete
4. 复制生成的令牌

### 3. 配置 GitHub Container Registry

1. 进入仓库 → Settings → Actions → General
2. Workflow permissions → 选择 "Read and write permissions"
3. 勾选 "Allow GitHub Actions to create and approve pull requests"

### 4. 修改镜像名称

编辑工作流文件中的 `IMAGE_NAME` 环境变量：

```yaml
env:
  IMAGE_NAME: your-image-name
```

或者在 Secrets 中设置 `DOCKER_USERNAME`。

## 📋 镜像标签说明

工作流会自动生成以下标签：

| 触发条件 | 生成的标签 | 示例 |
|---------|-----------|------|
| 推送到主分支 | `latest`, `main`, `main-abc1234` | `latest` |
| 推送标签 v1.2.3 | `v1.2.3`, `v1.2`, `v1`, `latest` | `v1.2.3` |
| PR #123 | `pr-123` | `pr-123` |

## 🔧 环境变量配置

部署脚本支持以下环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DOCKER_IMAGE` | Docker 镜像名称 | `aiclient2api` |
| `DOCKER_TAG` | Docker 镜像标签 | `latest` |
| `HOST_PORT` | 主机端口 | `3000` |

**使用示例:**

```bash
# Linux/macOS
HOST_PORT=8080 ./scripts/docker-deploy.sh start

# Windows
.\scripts\docker-deploy.ps1 start -HostPort 8080
```

## 📚 支持的架构

- `linux/amd64` - x86_64 架构
- `linux/arm64` - ARM64 架构（如 Apple Silicon, Raspberry Pi 4+）

## 🔄 工作流触发方式

### 自动触发

1. **推送代码到主分支**
   ```bash
   git push origin main
   ```
   → 构建并推送 `latest` 标签

2. **创建版本标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   → 构建并推送多个版本标签

3. **创建 GitHub Release**
   → 自动触发构建并生成发布说明

### 手动触发

1. 进入 GitHub 仓库 → Actions
2. 选择工作流
3. 点击 "Run workflow"
4. 选择分支并运行

## 📦 拉取和使用镜像

### 从 Docker Hub 拉取

```bash
# 最新版本
docker pull <username>/aiclient2api:latest

# 指定版本
docker pull <username>/aiclient2api:v1.0.0

# 指定架构
docker pull --platform linux/amd64 <username>/aiclient2api:latest
```

### 从 GitHub Container Registry 拉取

```bash
# 最新版本
docker pull ghcr.io/<username>/aiclient2api:latest

# 指定版本
docker pull ghcr.io/<username>/aiclient2api:v1.0.0
```

## 🛠️ 常见操作

### 查看容器状态
```bash
./scripts/docker-deploy.sh status
```

### 查看实时日志
```bash
./scripts/docker-deploy.sh logs
```

### 更新到最新版本
```bash
./scripts/docker-deploy.sh update
```

### 进入容器调试
```bash
./scripts/docker-deploy.sh shell
```

## 🐛 故障排查

### 构建失败

1. 检查 GitHub Secrets 配置
2. 查看 Actions 日志
3. 验证 Dockerfile 语法

### 推送失败

1. 验证 Docker Hub 令牌权限
2. 检查镜像名称是否可用
3. 确认 GitHub Actions 权限设置

### 容器无法启动

1. 查看容器日志：`./scripts/docker-deploy.sh logs`
2. 检查端口占用：`netstat -tuln | grep 3000`
3. 验证配置文件：`docker exec aiclient2api cat configs/config.json`

## 📖 相关文档

- [GitHub Actions 工作流说明](.github/workflows/README.md)
- [Docker 部署指南](docs/DOCKER_DEPLOYMENT.md)
- [部署脚本使用说明](scripts/README.md)
- [项目主 README](README.md)

## 🎯 下一步

1. **配置 GitHub Secrets**
   - 添加 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD`

2. **测试工作流**
   - 手动触发一次构建测试
   - 或推送一个测试标签

3. **部署容器**
   - 使用部署脚本快速启动
   - 或使用 Docker Compose 管理

4. **监控和维护**
   - 定期查看容器状态
   - 及时更新到最新版本

## 💡 优化建议

### 1. 启用构建缓存
工作流已配置 GitHub Actions 缓存，无需额外配置。

### 2. 添加安全扫描
可以在工作流中添加 Trivy 扫描步骤：

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

### 3. 配置自动更新
使用 Watchtower 自动更新容器：

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  aiclient2api
```

## 🔗 有用的链接

- [Docker 官方文档](https://docs.docker.com/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Hub](https://hub.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages)

---

**配置完成！** 🎉

现在你可以：
- ✅ 自动构建多架构 Docker 镜像
- ✅ 推送到 Docker Hub 和 GitHub Container Registry
- ✅ 使用脚本快速部署和管理容器
- ✅ 通过标签自动触发版本发布
