# Docker 快速开始指南

## 🎯 5 分钟快速部署

### 步骤 1: 配置 GitHub Actions（首次）

1. **获取 Docker Hub 访问令牌**
   - 访问 https://hub.docker.com/
   - 登录后进入 Account Settings → Security
   - 点击 "New Access Token"
   - 权限选择：Read, Write, Delete
   - 复制生成的令牌（格式：`dckr_pat_xxxxx`）

2. **配置 GitHub Secrets**
   - 进入你的 GitHub 仓库
   - Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - 添加两个密钥：
     ```
     名称: DOCKER_USERNAME
     值: 你的 Docker Hub 用户名
     
     名称: DOCKER_PASSWORD
     值: 刚才复制的访问令牌
     ```

3. **配置 GitHub Actions 权限**
   - Settings → Actions → General
   - Workflow permissions → 选择 "Read and write permissions"
   - 勾选 "Allow GitHub Actions to create and approve pull requests"

4. **修改镜像名称（可选）**
   - 编辑 `.github/workflows/docker-build.yml`
   - 修改第 13 行：
     ```yaml
     IMAGE_NAME: ${{ secrets.DOCKER_USERNAME }}/aiclient2api
     ```

### 步骤 2: 触发构建

**方式一：推送标签（推荐）**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**方式二：手动触发**
1. 进入 GitHub 仓库 → Actions
2. 选择 "Build and Push Docker Image"
3. 点击 "Run workflow"
4. 选择分支并运行

**方式三：推送到主分支**
```bash
git push origin main
```

### 步骤 3: 等待构建完成

- 进入 Actions 标签页查看构建进度
- 通常需要 5-10 分钟
- 构建成功后镜像会自动推送到 Docker Hub

### 步骤 4: 部署容器

**Linux/macOS:**
```bash
# 赋予执行权限
chmod +x scripts/docker-deploy.sh

# 启动容器（替换 <username> 为你的 Docker Hub 用户名）
DOCKER_IMAGE=<username>/aiclient2api ./scripts/docker-deploy.sh start
```

**Windows:**
```powershell
# 启动容器（替换 <username> 为你的 Docker Hub 用户名）
.\scripts\docker-deploy.ps1 start -ImageName <username>/aiclient2api
```

**或使用 Docker 命令:**
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

### 步骤 5: 访问服务

打开浏览器访问：http://localhost:3000

---

## 🔄 日常使用

### 查看容器状态
```bash
# Linux/macOS
./scripts/docker-deploy.sh status

# Windows
.\scripts\docker-deploy.ps1 status
```

### 查看日志
```bash
# Linux/macOS
./scripts/docker-deploy.sh logs

# Windows
.\scripts\docker-deploy.ps1 logs
```

### 更新到最新版本
```bash
# Linux/macOS
./scripts/docker-deploy.sh update

# Windows
.\scripts\docker-deploy.ps1 update
```

### 重启容器
```bash
# Linux/macOS
./scripts/docker-deploy.sh restart

# Windows
.\scripts\docker-deploy.ps1 restart
```

---

## 📦 镜像信息

构建完成后，你的镜像将在以下位置可用：

- **Docker Hub**: `<username>/aiclient2api:latest`
- **GitHub Container Registry**: `ghcr.io/<username>/aiclient2api:latest`

支持的架构：
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64, Apple Silicon)

---

## 🆘 遇到问题？

### 构建失败
1. 检查 GitHub Secrets 是否正确配置
2. 查看 Actions 日志获取详细错误信息
3. 确认 Docker Hub 令牌有效且权限正确

### 容器无法启动
1. 检查端口是否被占用：`netstat -tuln | grep 3000`
2. 查看容器日志：`docker logs aiclient2api`
3. 尝试使用其他端口：`HOST_PORT=8080 ./scripts/docker-deploy.sh start`

### 权限问题（Linux/macOS）
```bash
# 赋予脚本执行权限
chmod +x scripts/docker-deploy.sh

# 检查配置目录权限
chmod -R 755 configs/
chmod -R 755 logs/
```

---

## 📚 更多文档

- [完整 Docker 部署指南](docs/DOCKER_DEPLOYMENT.md)
- [GitHub Actions 配置说明](.github/workflows/README.md)
- [部署脚本使用说明](scripts/README.md)
- [配置总结](DOCKER_SETUP_SUMMARY.md)

---

**就这么简单！** 🎉

现在你已经成功配置了自动化 Docker 镜像构建和部署系统。
