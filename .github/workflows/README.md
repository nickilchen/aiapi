# GitHub Actions 工作流说明

本目录包含用于自动构建和发布 Docker 镜像的 GitHub Actions 工作流。

## 工作流文件

### 1. `docker-build.yml` - 基础构建工作流
简单的 Docker 镜像构建和推送到 Docker Hub。

**触发条件：**
- 推送到 `main` 或 `master` 分支
- 推送标签（格式：`v*`）
- Pull Request
- 手动触发

**功能：**
- 多架构构建（amd64, arm64）
- 自动生成镜像标签
- 使用 GitHub Actions 缓存加速构建

### 2. `docker-publish.yml` - 多仓库发布工作流
完整的 Docker 镜像构建和发布到多个容器仓库。

**触发条件：**
- 推送到 `main` 或 `master` 分支
- 推送版本标签（格式：`v*.*.*`）
- 发布 Release
- 手动触发

**功能：**
- 同时推送到 Docker Hub 和 GitHub Container Registry
- 多架构支持（amd64, arm64）
- 自动生成版本标签
- 创建发布说明
- 构建缓存优化

## 配置步骤

### 1. 配置 Docker Hub 密钥

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加以下密钥：

| 名称 | 说明 | 示例 |
|------|------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | `myusername` |
| `DOCKER_PASSWORD` | Docker Hub 访问令牌 | `dckr_pat_xxxxx` |

**获取 Docker Hub 访问令牌：**
1. 登录 [Docker Hub](https://hub.docker.com/)
2. 进入 Account Settings → Security
3. 点击 "New Access Token"
4. 输入描述（如 "GitHub Actions"）
5. 选择权限：Read, Write, Delete
6. 复制生成的令牌

### 2. 配置 GitHub Container Registry

GitHub Container Registry (ghcr.io) 使用 `GITHUB_TOKEN`，无需额外配置。

**首次使用需要：**
1. 进入仓库 → Settings → Actions → General
2. 在 "Workflow permissions" 中选择 "Read and write permissions"
3. 勾选 "Allow GitHub Actions to create and approve pull requests"

### 3. 修改镜像名称

如果需要修改镜像名称，编辑工作流文件中的 `IMAGE_NAME` 环境变量：

```yaml
env:
  IMAGE_NAME: your-image-name  # 修改为你的镜像名称
```

## 使用方法

### 自动触发

1. **推送代码到主分支**
   ```bash
   git push origin main
   ```
   将自动构建并推送 `latest` 标签的镜像。

2. **创建版本标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   将构建并推送以下标签：
   - `v1.0.0`
   - `v1.0`
   - `v1`
   - `latest`

3. **创建 GitHub Release**
   在 GitHub 上创建 Release 时会自动触发构建。

### 手动触发

1. 进入仓库 → Actions
2. 选择工作流（docker-build 或 docker-publish）
3. 点击 "Run workflow"
4. 选择分支并点击 "Run workflow"

## 镜像标签说明

工作流会自动生成以下标签：

| 标签格式 | 说明 | 示例 |
|---------|------|------|
| `latest` | 最新的主分支构建 | `latest` |
| `v1.2.3` | 完整版本号 | `v1.2.3` |
| `v1.2` | 主版本号.次版本号 | `v1.2` |
| `v1` | 主版本号 | `v1` |
| `main` | 分支名称 | `main` |
| `main-abc1234` | 分支名-短提交哈希 | `main-abc1234` |

## 拉取镜像

### 从 Docker Hub 拉取
```bash
# 最新版本
docker pull <username>/aiclient2api:latest

# 指定版本
docker pull <username>/aiclient2api:v1.0.0

# 指定架构
docker pull --platform linux/amd64 <username>/aiclient2api:latest
docker pull --platform linux/arm64 <username>/aiclient2api:latest
```

### 从 GitHub Container Registry 拉取
```bash
# 最新版本
docker pull ghcr.io/<username>/aiclient2api:latest

# 指定版本
docker pull ghcr.io/<username>/aiclient2api:v1.0.0
```

## 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

## 故障排查

### 构建失败

1. **检查 Secrets 配置**
   - 确认 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 已正确设置
   - 确认 Docker Hub 访问令牌有效且权限正确

2. **检查 Dockerfile**
   - 确认 Dockerfile 语法正确
   - 确认所有依赖文件存在

3. **查看构建日志**
   - 进入 Actions 标签页
   - 点击失败的工作流运行
   - 查看详细日志

### 推送失败

1. **Docker Hub 认证失败**
   - 重新生成 Docker Hub 访问令牌
   - 更新 GitHub Secrets

2. **权限不足**
   - 确认 Docker Hub 令牌有 Write 权限
   - 确认 GitHub Actions 有 packages: write 权限

3. **镜像名称冲突**
   - 确认镜像名称在 Docker Hub 上可用
   - 检查是否有命名冲突

## 优化建议

### 1. 加速构建

工作流已配置 GitHub Actions 缓存：
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

### 2. 减小镜像体积

- 使用 `.dockerignore` 排除不必要的文件
- 使用多阶段构建
- 清理构建缓存

### 3. 安全扫描

可以添加镜像安全扫描步骤：
```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}
    format: 'sarif'
    output: 'trivy-results.sarif'
```

## 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Docker Hub](https://hub.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
