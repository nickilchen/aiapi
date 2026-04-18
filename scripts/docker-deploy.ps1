# AIClient2API Docker 部署脚本 (PowerShell)
# 用于快速部署和管理 Docker 容器

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [string]$ImageName = $env:DOCKER_IMAGE ?? "aiclient2api",
    [string]$ImageTag = $env:DOCKER_TAG ?? "latest",
    [int]$HostPort = [int]($env:HOST_PORT ?? 3000)
)

$ContainerName = "aiclient2api"
$ContainerPort = 3000

# 颜色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查 Docker 是否安装
function Test-Docker {
    try {
        $null = docker --version
        Write-Success "Docker 已安装"
        return $true
    }
    catch {
        Write-Error "Docker 未安装，请先安装 Docker Desktop"
        return $false
    }
}

# 检查容器是否存在
function Test-ContainerExists {
    $containers = docker ps -a --format "{{.Names}}"
    return $containers -contains $ContainerName
}

# 检查容器是否运行
function Test-ContainerRunning {
    $containers = docker ps --format "{{.Names}}"
    return $containers -contains $ContainerName
}

# 拉取镜像
function Invoke-PullImage {
    Write-Info "拉取镜像 ${ImageName}:${ImageTag}..."
    try {
        docker pull "${ImageName}:${ImageTag}"
        Write-Success "镜像拉取成功"
    }
    catch {
        Write-Error "镜像拉取失败: $_"
        exit 1
    }
}

# 启动容器
function Start-Container {
    Write-Info "启动容器..."
    
    # 创建必要的目录
    if (-not (Test-Path "configs")) {
        New-Item -ItemType Directory -Path "configs" | Out-Null
    }
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    # 检查容器是否已存在
    if (Test-ContainerExists) {
        if (Test-ContainerRunning) {
            Write-Warning "容器已在运行"
            return
        }
        else {
            Write-Info "启动已存在的容器..."
            docker start $ContainerName
        }
    }
    else {
        Write-Info "创建并启动新容器..."
        $currentPath = (Get-Location).Path
        docker run -d `
            --name $ContainerName `
            -p "${HostPort}:${ContainerPort}" `
            -p 8085:8085 `
            -p 8086:8086 `
            -p 19876-19880:19876-19880 `
            -v "${currentPath}/configs:/app/configs" `
            -v "${currentPath}/logs:/app/logs" `
            -e NODE_ENV=production `
            -e TZ=Asia/Shanghai `
            --restart unless-stopped `
            "${ImageName}:${ImageTag}"
    }
    
    Write-Success "容器启动成功"
    Write-Info "访问地址: http://localhost:${HostPort}"
}

# 停止容器
function Stop-Container {
    if (Test-ContainerRunning) {
        Write-Info "停止容器..."
        docker stop $ContainerName
        Write-Success "容器已停止"
    }
    else {
        Write-Warning "容器未运行"
    }
}

# 重启容器
function Restart-Container {
    Write-Info "重启容器..."
    if (Test-ContainerExists) {
        docker restart $ContainerName
        Write-Success "容器已重启"
    }
    else {
        Write-Error "容器不存在"
        exit 1
    }
}

# 删除容器
function Remove-Container {
    if (Test-ContainerExists) {
        Write-Info "删除容器..."
        if (Test-ContainerRunning) {
            docker stop $ContainerName
        }
        docker rm $ContainerName
        Write-Success "容器已删除"
    }
    else {
        Write-Warning "容器不存在"
    }
}

# 查看日志
function Show-Logs {
    if (Test-ContainerExists) {
        Write-Info "查看容器日志 (Ctrl+C 退出)..."
        docker logs -f $ContainerName
    }
    else {
        Write-Error "容器不存在"
        exit 1
    }
}

# 查看状态
function Show-Status {
    Write-Info "容器状态:"
    if (Test-ContainerExists) {
        docker ps -a --filter "name=$ContainerName" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
        Write-Host ""
        Write-Info "资源使用:"
        docker stats --no-stream $ContainerName
    }
    else {
        Write-Warning "容器不存在"
    }
}

# 更新容器
function Update-Container {
    Write-Info "更新容器..."
    
    # 拉取最新镜像
    Invoke-PullImage
    
    # 停止并删除旧容器
    if (Test-ContainerExists) {
        Stop-Container
        Remove-Container
    }
    
    # 启动新容器
    Start-Container
    
    Write-Success "容器更新完成"
}

# 进入容器
function Enter-Shell {
    if (Test-ContainerRunning) {
        Write-Info "进入容器 shell..."
        docker exec -it $ContainerName sh
    }
    else {
        Write-Error "容器未运行"
        exit 1
    }
}

# 显示帮助
function Show-Help {
    @"
AIClient2API Docker 部署脚本 (PowerShell)

用法: .\docker-deploy.ps1 [命令] [选项]

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

选项:
    -ImageName  Docker 镜像名称 (默认: aiclient2api)
    -ImageTag   Docker 镜像标签 (默认: latest)
    -HostPort   主机端口 (默认: 3000)

环境变量:
    DOCKER_IMAGE    Docker 镜像名称
    DOCKER_TAG      Docker 镜像标签
    HOST_PORT       主机端口

示例:
    # 启动容器
    .\docker-deploy.ps1 start

    # 使用自定义端口
    .\docker-deploy.ps1 start -HostPort 8080

    # 使用指定镜像
    .\docker-deploy.ps1 start -ImageName myuser/aiclient2api -ImageTag v1.0.0

    # 查看日志
    .\docker-deploy.ps1 logs

    # 更新到最新版本
    .\docker-deploy.ps1 update

"@
}

# 主函数
function Main {
    # 检查 Docker
    if (-not (Test-Docker)) {
        exit 1
    }
    
    # 执行命令
    switch ($Command.ToLower()) {
        "start" {
            Start-Container
        }
        "stop" {
            Stop-Container
        }
        "restart" {
            Restart-Container
        }
        { $_ -in "remove", "rm" } {
            Remove-Container
        }
        "logs" {
            Show-Logs
        }
        "status" {
            Show-Status
        }
        "update" {
            Update-Container
        }
        { $_ -in "shell", "exec" } {
            Enter-Shell
        }
        "pull" {
            Invoke-PullImage
        }
        { $_ -in "help", "--help", "-h" } {
            Show-Help
        }
        default {
            Write-Error "未知命令: $Command"
            Write-Host ""
            Show-Help
            exit 1
        }
    }
}

# 运行主函数
Main
