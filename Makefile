.PHONY: help docker-build docker-push docker-run docker-stop docker-clean docker-logs docker-shell test

# 默认镜像配置
IMAGE_NAME ?= aiclient2api
IMAGE_TAG ?= latest
CONTAINER_NAME ?= aiclient2api
HOST_PORT ?= 3000

help: ## 显示帮助信息
	@echo "AIClient2API - Docker 管理命令"
	@echo ""
	@echo "用法: make [命令]"
	@echo ""
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "环境变量:"
	@echo "  IMAGE_NAME      镜像名称 (默认: aiclient2api)"
	@echo "  IMAGE_TAG       镜像标签 (默认: latest)"
	@echo "  CONTAINER_NAME  容器名称 (默认: aiclient2api)"
	@echo "  HOST_PORT       主机端口 (默认: 3000)"
	@echo ""
	@echo "示例:"
	@echo "  make docker-build"
	@echo "  make docker-run HOST_PORT=8080"
	@echo "  IMAGE_NAME=myuser/aiclient2api make docker-push"

docker-build: ## 构建 Docker 镜像
	@echo "构建镜像: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

docker-build-no-cache: ## 构建 Docker 镜像（不使用缓存）
	@echo "构建镜像（无缓存）: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker build --no-cache -t $(IMAGE_NAME):$(IMAGE_TAG) .

docker-push: ## 推送镜像到仓库
	@echo "推送镜像: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker push $(IMAGE_NAME):$(IMAGE_TAG)

docker-pull: ## 从仓库拉取镜像
	@echo "拉取镜像: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker pull $(IMAGE_NAME):$(IMAGE_TAG)

docker-run: ## 运行容器
	@echo "启动容器: $(CONTAINER_NAME)"
	@mkdir -p configs logs
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(HOST_PORT):3000 \
		-p 8085:8085 \
		-p 8086:8086 \
		-p 19876-19880:19876-19880 \
		-v $$(pwd)/configs:/app/configs \
		-v $$(pwd)/logs:/app/logs \
		-e NODE_ENV=production \
		-e TZ=Asia/Shanghai \
		--restart unless-stopped \
		$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "容器已启动，访问地址: http://localhost:$(HOST_PORT)"

docker-stop: ## 停止容器
	@echo "停止容器: $(CONTAINER_NAME)"
	docker stop $(CONTAINER_NAME) || true

docker-start: ## 启动已存在的容器
	@echo "启动容器: $(CONTAINER_NAME)"
	docker start $(CONTAINER_NAME)

docker-restart: ## 重启容器
	@echo "重启容器: $(CONTAINER_NAME)"
	docker restart $(CONTAINER_NAME)

docker-remove: docker-stop ## 删除容器
	@echo "删除容器: $(CONTAINER_NAME)"
	docker rm $(CONTAINER_NAME) || true

docker-clean: docker-remove ## 清理容器和镜像
	@echo "清理镜像: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) || true

docker-logs: ## 查看容器日志
	docker logs -f $(CONTAINER_NAME)

docker-logs-tail: ## 查看最近 100 行日志
	docker logs --tail 100 $(CONTAINER_NAME)

docker-shell: ## 进入容器 shell
	docker exec -it $(CONTAINER_NAME) sh

docker-status: ## 查看容器状态
	@echo "容器状态:"
	@docker ps -a --filter "name=$(CONTAINER_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
	@echo ""
	@echo "资源使用:"
	@docker stats --no-stream $(CONTAINER_NAME) || true

docker-update: docker-pull docker-stop docker-remove docker-run ## 更新容器到最新版本

docker-compose-up: ## 使用 Docker Compose 启动
	docker-compose -f docker-compose.example.yml up -d

docker-compose-down: ## 使用 Docker Compose 停止
	docker-compose -f docker-compose.example.yml down

docker-compose-logs: ## 查看 Docker Compose 日志
	docker-compose -f docker-compose.example.yml logs -f

# 多架构构建
docker-buildx-setup: ## 设置 buildx 构建器
	docker buildx create --name mybuilder --use || true
	docker buildx inspect --bootstrap

docker-buildx-build: docker-buildx-setup ## 构建多架构镜像
	@echo "构建多架构镜像: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		--push \
		.

docker-buildx-build-local: docker-buildx-setup ## 构建多架构镜像（本地）
	@echo "构建多架构镜像（本地）: $(IMAGE_NAME):$(IMAGE_TAG)"
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		--load \
		.

# 开发相关
dev-setup: ## 设置开发环境
	@echo "设置开发环境..."
	npm install
	mkdir -p configs logs
	cp configs/config.json.example configs/config.json || true

dev-start: ## 启动开发服务器
	npm run start:dev

test: ## 运行测试
	npm test

test-coverage: ## 运行测试并生成覆盖率报告
	npm run test:coverage

# 清理
clean: ## 清理临时文件
	rm -rf node_modules
	rm -rf logs/*
	rm -rf coverage

clean-all: clean docker-clean ## 清理所有文件和镜像

# Git 相关
git-tag: ## 创建 Git 标签（需要指定 VERSION）
	@if [ -z "$(VERSION)" ]; then \
		echo "错误: 请指定 VERSION，例如: make git-tag VERSION=1.0.0"; \
		exit 1; \
	fi
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	git push origin v$(VERSION)
	@echo "标签 v$(VERSION) 已创建并推送"

# 信息
info: ## 显示当前配置信息
	@echo "当前配置:"
	@echo "  镜像名称: $(IMAGE_NAME)"
	@echo "  镜像标签: $(IMAGE_TAG)"
	@echo "  容器名称: $(CONTAINER_NAME)"
	@echo "  主机端口: $(HOST_PORT)"
	@echo ""
	@echo "Docker 版本:"
	@docker --version
	@echo ""
	@echo "Docker Compose 版本:"
	@docker-compose --version || echo "未安装"
