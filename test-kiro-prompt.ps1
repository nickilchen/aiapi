# Kiro 内置系统提示词测试脚本 (PowerShell)

$API_KEY = "sk-60ad4c34854008b49b14fbd892034d51"
$BASE_URL = "http://localhost:3000/claude-kiro-oauth/v1/messages"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Kiro 内置系统提示词测试" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "测试请求：" -ForegroundColor Yellow
Write-Host "模型: deepseek-3-2-agentic"
Write-Host "问题: 你是谁？"
Write-Host ""

$body = @{
    model = "deepseek-3-2-agentic"
    max_tokens = 1000
    messages = @(
        @{
            role = "user"
            content = "你是谁？"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $BASE_URL -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = $API_KEY
        } `
        -Body $body

    Write-Host "回复内容：" -ForegroundColor Green
    Write-Host $response.content[0].text
} catch {
    Write-Host "请求失败：$($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "如果看到 '开发者何夕2077' 相关内容，" -ForegroundColor Yellow
Write-Host "说明内置提示词已启用。" -ForegroundColor Yellow
Write-Host ""
Write-Host "如果看到模型的默认身份回复，" -ForegroundColor Green
Write-Host "说明内置提示词已禁用。" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
