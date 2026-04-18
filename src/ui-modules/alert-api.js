/**
 * 告警 API 路由处理
 */

import logger from '../utils/logger.js';
import { getAlertManager } from '../services/alert-manager.js';

/**
 * 解析请求体
 */
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new Error('Invalid JSON format'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * 处理告警 API 请求
 */
export async function handleAlertApiRequests(method, path, req, res) {
    const alertManager = getAlertManager();

    // 获取告警配置
    if (method === 'GET' && path === '/api/alerts/config') {
        try {
            const config = alertManager.getConfig();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: config
            }));
            return true;
        } catch (error) {
            logger.error('[Alert API] Error getting config:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    // 更新告警配置
    if (method === 'POST' && path === '/api/alerts/config') {
        try {
            const body = await parseRequestBody(req);
            await alertManager.updateConfig(body);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: '告警配置已更新'
            }));
            return true;
        } catch (error) {
            logger.error('[Alert API] Error updating config:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    // 获取告警历史
    if (method === 'GET' && path.startsWith('/api/alerts/history')) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const limit = parseInt(url.searchParams.get('limit')) || 100;
            const offset = parseInt(url.searchParams.get('offset')) || 0;
            
            const history = alertManager.getHistory(limit, offset);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: history
            }));
            return true;
        } catch (error) {
            logger.error('[Alert API] Error getting history:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    // 确认告警
    if (method === 'POST' && path.startsWith('/api/alerts/acknowledge/')) {
        try {
            const alertId = path.split('/').pop();
            const success = await alertManager.acknowledgeAlert(alertId);
            
            res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success,
                message: success ? '告警已确认' : '告警不存在'
            }));
            return true;
        } catch (error) {
            logger.error('[Alert API] Error acknowledging alert:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    // 清除告警历史
    if (method === 'DELETE' && path === '/api/alerts/history') {
        try {
            await alertManager.clearHistory();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: '告警历史已清除'
            }));
            return true;
        } catch (error) {
            logger.error('[Alert API] Error clearing history:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    // 测试告警
    if (method === 'POST' && path === '/api/alerts/test') {
        try {
            const body = await parseRequestBody(req);
            const type = body.type || 'browser';
            
            const alert = await alertManager.testAlert(type);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: '测试告警已发送',
                data: alert
            }));
            return true;
        } catch (error) {
            logger.error('[Alert API] Error testing alert:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    // SSE 实时告警推送
    if (method === 'GET' && path === '/api/alerts/stream') {
        try {
            // 设置 SSE 响应头
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });

            // 发送初始连接消息
            res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Alert stream connected' })}\n\n`);

            // 添加客户端到告警管理器
            alertManager.addBrowserClient(res);

            // 定期发送心跳
            const heartbeat = setInterval(() => {
                try {
                    res.write(`: heartbeat\n\n`);
                } catch (error) {
                    clearInterval(heartbeat);
                    alertManager.removeBrowserClient(res);
                }
            }, 30000);

            // 客户端断开连接时清理
            req.on('close', () => {
                clearInterval(heartbeat);
                alertManager.removeBrowserClient(res);
                logger.info('[Alert API] Client disconnected from alert stream');
            });

            return true;
        } catch (error) {
            logger.error('[Alert API] Error setting up alert stream:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: { message: error.message }
            }));
            return true;
        }
    }

    return false;
}
