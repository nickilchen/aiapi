# Docker 部署指南

本文档介绍如何使用 Docker 部署 AIClient2API 服务。

## 快速开始

### 使用预构建镜像

```bash
# 从 Docker Hub 拉取镜像
docker pull <username>/aiclient2api:latest

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  aiclient2api:
    image: <username>/aiclient2api:latest
    container_name: aiclient2api
    ports:
      - "3000:3000"
      - "8085:8085"  # TLS Sidecar (可选)
      - "8086:8086"  # TLS Sidecar (可选)
    volumes:
      - ./configs:/app/configs
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

启动服务：

```bash
docker-compose up -d
```

## 本地构建镜像

### 构建单架构镜像

```bash
# 构建当前架构镜像
docker build -t aiclient2api:local .

# 运行
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  aiclient2api:local
```

### 构建多架构镜像

```bash
# 创建并使用 buildx builder
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# 构建多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <username>/aiclient2api:latest \
  --push \
  .
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `TZ` | 时区设置 | `UTC` |
| `ARGS` | 启动参数 | 空 |

### 启动参数示例

```bash
# 使用自定义 API Key 和端口
docker run -d \
  -p 8080:8080 \
  -e ARGS="--api-key mykey --port 8080" \
  -v $(pwd)/configs:/app/configs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

### 挂载卷说明

| 容器路径 | 说明 | 是否必需 |
|---------|------|---------|
| `/app/configs` | 配置文件目录 | 推荐 |
| `/app/logs` | 日志文件目录 | 推荐 |

## 高级配置

### 使用自定义配置文件

```bash
# 准备配置文件
mkdir -p configs
cp configs/config.json.example configs/config.json
# 编辑 configs/config.json

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

### 启用 TLS Sidecar

```bash
docker run -d \
  -p 3000:3000 \
  -p 8085:8085 \
  -p 8086:8086 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

### 使用代理

```bash
docker run -d \
  -p 3000:3000 \
  -e HTTP_PROXY=http://proxy.example.com:8080 \
  -e HTTPS_PROXY=http://proxy.example.com:8080 \
  -v $(pwd)/configs:/app/configs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

### 资源限制

```bash
docker run -d \
  -p 3000:3000 \
  --memory="512m" \
  --cpus="1.0" \
  -v $(pwd)/configs:/app/configs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

## Docker Compose 完整示例

```yaml
version: '3.8'

services:
  aiclient2api:
    image: <username>/aiclient2api:latest
    container_name: aiclient2api
    hostname: aiclient2api
    
    # 端口映射
    ports:
      - "3000:3000"      # 主服务端口
      - "8085:8085"      # TLS Sidecar 端口 1
      - "8086:8086"      # TLS Sidecar 端口 2
      - "19876:19876"    # OAuth 回调端口
    
    # 卷挂载
    volumes:
      - ./configs:/app/configs
      - ./logs:/app/logs
    
    # 环境变量
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
      # - ARGS=--api-key mykey --port 3000
    
    # 重启策略
    restart: unless-stopped
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
    
    # 健康检查
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    
    # 日志配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    # 网络配置
    networks:
      - aiclient2api-network

networks:
  aiclient2api-network:
    driver: bridge
```

## 容器管理

### 查看日志

```bash
# 查看实时日志
docker logs -f aiclient2api

# 查看最近 100 行日志
docker logs --tail 100 aiclient2api

# 查看带时间戳的日志
docker logs -t aiclient2api
```

### 进入容器

```bash
# 使用 sh shell
docker exec -it aiclient2api sh

# 查看配置文件
docker exec aiclient2api cat configs/config.json

# 查看进程
docker exec aiclient2api ps aux
```

### 重启容器

```bash
# 重启容器
docker restart aiclient2api

# 停止容器
docker stop aiclient2api

# 启动容器
docker start aiclient2api
```

### 更新镜像

```bash
# 拉取最新镜像
docker pull <username>/aiclient2api:latest

# 停止并删除旧容器
docker stop aiclient2api
docker rm aiclient2api

# 启动新容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/logs:/app/logs \
  --name aiclient2api \
  <username>/aiclient2api:latest
```

使用 Docker Compose 更新：

```bash
# 拉取最新镜像并重启
docker-compose pull
docker-compose up -d
```

## 故障排查

### 容器无法启动

```bash
# 查看容器状态
docker ps -a

# 查看容器日志
docker logs aiclient2api

# 检查配置文件
docker exec aiclient2api cat configs/config.json
```

### 端口冲突

```bash
# 检查端口占用
netstat -tuln | grep 3000

# 使用其他端口
docker run -d -p 8080:3000 ...
```

### 权限问题

```bash
# 检查挂载目录权限
ls -la configs/

# 修改权限
chmod -R 755 configs/
chmod -R 755 logs/
```

### 健康检查失败

```bash
# 手动执行健康检查
docker exec aiclient2api node healthcheck.js

# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' aiclient2api
```

## 性能优化

### 1. 使用多阶段构建

Dockerfile 已使用多阶段构建来减小镜像体积。

### 2. 启用构建缓存

```bash
# 使用 BuildKit
export DOCKER_BUILDKIT=1
docker build -t aiclient2api:latest .
```

### 3. 镜像体积优化

```bash
# 查看镜像大小
docker images aiclient2api

# 查看镜像层
docker history aiclient2api:latest
```

### 4. 容器资源监控

```bash
# 查看容器资源使用
docker stats aiclient2api

# 持续监控
docker stats --no-stream aiclient2api
```

## 安全建议

### 1. 使用非 root 用户

在 Dockerfile 中添加：

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

### 2. 扫描镜像漏洞

```bash
# 使用 Trivy 扫描
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image <username>/aiclient2api:latest
```

### 3. 限制容器权限

```bash
docker run -d \
  --read-only \
  --tmpfs /tmp \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  -p 3000:3000 \
  <username>/aiclient2api:latest
```

### 4. 使用 Secrets 管理敏感信息

```bash
# 创建 secret
echo "my-api-key" | docker secret create api_key -

# 使用 secret
docker service create \
  --name aiclient2api \
  --secret api_key \
  <username>/aiclient2api:latest
```

## 生产环境部署

### 使用 Docker Swarm

```bash
# 初始化 Swarm
docker swarm init

# 部署服务
docker stack deploy -c docker-compose.yml aiclient2api

# 查看服务
docker service ls
docker service ps aiclient2api_aiclient2api
```

### 使用 Kubernetes

创建 `deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aiclient2api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aiclient2api
  template:
    metadata:
      labels:
        app: aiclient2api
    spec:
      containers:
      - name: aiclient2api
        image: <username>/aiclient2api:latest
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: config
          mountPath: /app/configs
        - name: logs
          mountPath: /app/logs
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "256Mi"
            cpu: "250m"
      volumes:
      - name: config
        configMap:
          name: aiclient2api-config
      - name: logs
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: aiclient2api
spec:
  selector:
    app: aiclient2api
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
```

部署：

```bash
kubectl apply -f deployment.yaml
```

## 相关链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Docker Hub](https://hub.docker.com/)
- [项目主页](https://github.com/your-repo/aiclient2api)
