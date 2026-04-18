# Docker 部署配置检查清单

使用此检查清单确保 Docker 自动构建和部署系统配置正确。

## ✅ 配置前检查

- [ ] 已安装 Docker Desktop 或 Docker Engine
- [ ] 已有 Docker Hub 账号
- [ ] 已有 GitHub 账号并拥有仓库管理权限
- [ ] 已将代码推送到 GitHub 仓库

## ✅ GitHub Actions 配置

### Docker Hub 配置
- [ ] 已登录 Docker Hub
- [ ] 已创建访问令牌（Access Token）
- [ ] 令牌权限包含：Read, Write, Delete
- [ ] 已复制令牌（格式：`dckr_pat_xxxxx`）

### GitHub Secrets 配置
- [ ] 进入仓库 Settings → Secrets and variables → Actions
- [ ] 已添加 `DOCKER_USERNAME` Secret
- [ ] 已添加 `DOCKER_PASSWORD` Secret
- [ ] Secret 值已正确填写（无多余空格）

### GitHub Actions 权限
- [ ] 进入 Settings → Actions → General
- [ ] Workflow permissions 设置为 "Read and write permissions"
- [ ] 已勾选 "Allow GitHub Actions to create and approve pull requests"

### 工作流文件配置
- [ ] 已检查 `.github/workflows/docker-build.yml` 存在
- [ ] 已检查 `.github/workflows/docker-publish.yml` 存在
- [ ] 已修改 `IMAGE_NAME` 为正确的镜像名称（如需要）
- [ ] 工作流文件语法正确（无 YAML 错误）

## ✅ 本地文件检查

### 必需文件
- [ ] `Dockerfile` 存在且语法正确
- [ ] `.dockerignore` 存在
- [ ] `healthcheck.js` 存在
- [ ] `package.json` 存在

### 部署脚本
- [ ] `scripts/docker-deploy.sh` 存在
- [ ] `scripts/docker-deploy.ps1` 存在
- [ ] Shell 脚本有执行权限（Linux/macOS）

### 配置文件
- [ ] `docker-compose.example.yml` 存在
- [ ] 配置文件中的镜像名称已更新

### 文档
- [ ] `docs/DOCKER_DEPLOYMENT.md` 存在
- [ ] `.github/workflows/README.md` 存在
- [ ] `scripts/README.md` 存在
- [ ] `QUICK_START_DOCKER.md` 存在

## ✅ 首次构建测试

### 触发构建
- [ ] 已选择触发方式（标签/手动/推送）
- [ ] 已成功触发 GitHub Actions 工作流

### 监控构建
- [ ] 进入 Actions 标签页
- [ ] 工作流正在运行
- [ ] 所有步骤成功完成（绿色勾）
- [ ] 无错误或警告

### 验证镜像
- [ ] 镜像已推送到 Docker Hub
- [ ] 可以在 Docker Hub 看到镜像
- [ ] 镜像标签正确（如 `latest`, `v1.0.0`）
- [ ] 支持多架构（amd64, arm64）

## ✅ 本地部署测试

### 拉取镜像
- [ ] 可以成功拉取镜像
  ```bash
  docker pull <username>/aiclient2api:latest
  ```

### 启动容器
- [ ] 使用部署脚本成功启动容器
  ```bash
  ./scripts/docker-deploy.sh start
  ```
- [ ] 或使用 Docker 命令成功启动
  ```bash
  docker run -d -p 3000:3000 --name aiclient2api <username>/aiclient2api:latest
  ```

### 验证运行
- [ ] 容器状态为 "Up"
  ```bash
  docker ps | grep aiclient2api
  ```
- [ ] 健康检查通过
  ```bash
  docker inspect --format='{{.State.Health.Status}}' aiclient2api
  ```
- [ ] 可以访问服务
  - 浏览器打开 http://localhost:3000
  - 服务正常响应

### 查看日志
- [ ] 可以查看容器日志
  ```bash
  docker logs aiclient2api
  ```
- [ ] 日志无错误信息
- [ ] 服务启动成功

## ✅ 功能测试

### 基本功能
- [ ] 可以访问管理界面
- [ ] 可以登录系统
- [ ] 配置文件正确加载
- [ ] API 端点正常工作

### 持久化
- [ ] 配置文件持久化（重启后保留）
- [ ] 日志文件正确写入
- [ ] 挂载卷工作正常

### 网络
- [ ] 端口映射正确
- [ ] 可以从外部访问
- [ ] OAuth 回调端口可用（如需要）

## ✅ 更新测试

### 推送新版本
- [ ] 创建新标签
  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```
- [ ] 工作流自动触发
- [ ] 新镜像构建成功

### 更新容器
- [ ] 使用脚本更新容器
  ```bash
  ./scripts/docker-deploy.sh update
  ```
- [ ] 容器成功更新到新版本
- [ ] 服务正常运行
- [ ] 配置和数据未丢失

## ✅ 清理测试

### 停止容器
- [ ] 可以正常停止容器
  ```bash
  ./scripts/docker-deploy.sh stop
  ```

### 删除容器
- [ ] 可以正常删除容器
  ```bash
  ./scripts/docker-deploy.sh remove
  ```

### 重新部署
- [ ] 可以重新部署容器
  ```bash
  ./scripts/docker-deploy.sh start
  ```

## ✅ 文档检查

### 用户文档
- [ ] README 包含 Docker 部署说明
- [ ] 快速开始指南清晰易懂
- [ ] 故障排查部分完整

### 开发文档
- [ ] GitHub Actions 配置说明完整
- [ ] 部署脚本使用说明清晰
- [ ] 示例代码可以直接使用

## ✅ 安全检查

### 密钥管理
- [ ] 敏感信息使用 Secrets 存储
- [ ] 未在代码中硬编码密钥
- [ ] `.gitignore` 包含敏感文件

### 镜像安全
- [ ] 使用官方基础镜像
- [ ] 定期更新依赖
- [ ] 考虑添加安全扫描（可选）

### 权限控制
- [ ] 容器使用最小权限
- [ ] 不使用 root 用户运行（可选）
- [ ] 限制容器资源使用（可选）

## ✅ 性能优化

### 构建优化
- [ ] 使用多阶段构建
- [ ] 启用构建缓存
- [ ] `.dockerignore` 排除不必要文件

### 运行优化
- [ ] 设置合理的资源限制
- [ ] 配置健康检查
- [ ] 日志轮转配置正确

## ✅ 生产环境准备

### 监控
- [ ] 配置容器监控（可选）
- [ ] 设置告警规则（可选）
- [ ] 日志收集配置（可选）

### 备份
- [ ] 配置文件备份策略
- [ ] 数据持久化方案
- [ ] 灾难恢复计划

### 扩展性
- [ ] 考虑使用 Docker Compose
- [ ] 考虑使用 Kubernetes（可选）
- [ ] 负载均衡配置（可选）

## 📝 问题记录

如果遇到问题，请在此记录：

| 日期 | 问题描述 | 解决方案 | 状态 |
|------|---------|---------|------|
|      |         |         |      |

## ✅ 最终确认

- [ ] 所有检查项已完成
- [ ] 系统运行正常
- [ ] 文档已更新
- [ ] 团队成员已培训（如需要）

---

**检查完成日期**: ___________

**检查人**: ___________

**备注**: ___________
