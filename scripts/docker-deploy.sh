#!/bin/bash

# AIClient2API Docker 部署脚本
# 用于快速部署和管理 Docker 容器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
CONTAINER_NAME="aiclient2api"
IMAGE_NAME="${DOCKER_IMAGE:-aiclient2api}"
IMAGE_TAG="${DOCKER_TAG:-latest}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="3000"

# 函数：打印信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    print_success "Docker 已安装"
}

# 函数：检查容器是否存在
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# 函数：检查容器是否运行
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# 函数：拉取镜像
pull_image() {
    print_info "拉取镜像 ${IMAGE_NAME}:${IMAGE_TAG}..."
    if docker pull "${IMAGE_NAME}:${IMAGE_TAG}"; then
        print_success "镜像拉取成功"
    else
        print_error "镜像拉取失败"
        exit 1
    fi
}

# 函数：启动容器
start_container() {
    print_info "启动容器..."
    
    # 创建必要的目录
    mkdir -p configs logs
    
    # 检查容器是否已存在
    if container_exists; then
        if container_running; then
            print_warning "容器已在运行"
            return
        else
            print_info "启动已存在的容器..."
            docker start "${CONTAINER_NAME}"
        fi
    else
        print_info "创建并启动新容器..."
        docker run -d \
            --name "${CONTAINER_NAME}" \
            -p "${HOST_PORT}:${CONTAINER_PORT}" \
            -p 8085:8085 \
            -p 8086:8086 \
            -p 19876-19880:19876-19880 \
            -v "$(pwd)/configs:/app/configs" \
            -v "$(pwd)/logs:/app/logs" \
            -e NODE_ENV=production \
            -e TZ=Asia/Shanghai \
            --restart unless-stopped \
            "${IMAGE_NAME}:${IMAGE_TAG}"
    fi
    
    print_success "容器启动成功"
    print_info "访问地址: http://localhost:${HOST_PORT}"
}

# 函数：停止容器
stop_container() {
    if container_running; then
        print_info "停止容器..."
        docker stop "${CONTAINER_NAME}"
        print_success "容器已停止"
    else
        print_warning "容器未运行"
    fi
}

# 函数：重启容器
restart_container() {
    print_info "重启容器..."
    if container_exists; then
        docker restart "${CONTAINER_NAME}"
        print_success "容器已重启"
    else
        print_error "容器不存在"
        exit 1
    fi
}

# 函数：删除容器
remove_container() {
    if container_exists; then
        print_info "删除容器..."
        if container_running; then
            docker stop "${CONTAINER_NAME}"
        fi
        docker rm "${CONTAINER_NAME}"
        print_success "容器已删除"
    else
        print_warning "容器不存在"
    fi
}

# 函数：查看日志
view_logs() {
    if container_exists; then
        print_info "查看容器日志 (Ctrl+C 退出)..."
        docker logs -f "${CONTAINER_NAME}"
    else
        print_error "容器不存在"
        exit 1
    fi
}

# 函数：查看状态
show_status() {
    print_info "容器状态:"
    if container_exists; then
        docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        print_info "资源使用:"
        docker stats --no-stream "${CONTAINER_NAME}"
    else
        print_warning "容器不存在"
    fi
}

# 函数：更新容器
update_container() {
    print_info "更新容器..."
    
    # 拉取最新镜像
    pull_image
    
    # 停止并删除旧容器
    if container_exists; then
        stop_container
        remove_container
    fi
    
    # 启动新容器
    start_container
    
    print_success "容器更新完成"
}

# 函数：进入容器
exec_shell() {
    if container_running; then
        print_info "进入容器 shell..."
        docker exec -it "${CONTAINER_NAME}" sh
    else
        print_error "容器未运行"
        exit 1
    fi
}

# 函数：显示帮助
show_help() {
    cat << EOF
AIClient2API Docker 部署脚本

用法: $0 [命令]

命令:
    start       启动容器
    stop        停止容器
    restart     重启容器
    remove      删除容器
    logs        查看日志
    status      查看状态
    update      更新容器（拉取最新镜像并重启）
    shell       进入容器 shell
    pull        拉取镜像
    help        显示帮助信息

环境变量:
    DOCKER_IMAGE    Docker 镜像名称 (默认: aiclient2api)
    DOCKER_TAG      Docker 镜像标签 (默认: latest)
    HOST_PORT       主机端口 (默认: 3000)

示例:
    # 启动容器
    $0 start

    # 使用自定义端口
    HOST_PORT=8080 $0 start

    # 使用指定镜像
    DOCKER_IMAGE=myuser/aiclient2api DOCKER_TAG=v1.0.0 $0 start

    # 查看日志
    $0 logs

    # 更新到最新版本
    $0 update

EOF
}

# 主函数
main() {
    # 检查 Docker
    check_docker
    
    # 解析命令
    case "${1:-help}" in
        start)
            start_container
            ;;
        stop)
            stop_container
            ;;
        restart)
            restart_container
            ;;
        remove|rm)
            remove_container
            ;;
        logs)
            view_logs
            ;;
        status)
            show_status
            ;;
        update)
            update_container
            ;;
        shell|exec)
            exec_shell
            ;;
        pull)
            pull_image
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
