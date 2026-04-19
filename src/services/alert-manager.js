/**
 * 告警管理器 - 核心告警引擎
 * 
 * 功能：
 * 1. 监控提供商健康状态
 * 2. 监控 API 配额使用情况
 * 3. 监控错误率
 * 4. 发送告警通知（浏览器/邮件/Webhook）
 * 5. 告警历史记录
 */

import logger from '../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import { existsSync } from 'fs';
import axios from 'axios';

// 告警配置文件路径
const ALERT_CONFIG_FILE = path.join(process.cwd(), 'configs', 'alert-config.json');
const ALERT_HISTORY_FILE = path.join(process.cwd(), 'configs', 'alert-history.json');

// 默认告警配置
const DEFAULT_ALERT_CONFIG = {
    enabled: true,
    rules: {
        providerHealth: {
            enabled: true,
            threshold: 0.5, // 健康率低于 50% 触发告警
            cooldown: 300000 // 冷却时间 5 分钟
        },
        errorRate: {
            enabled: true,
            threshold: 0.1, // 错误率超过 10% 触发告警
            timeWindow: 300000, // 时间窗口 5 分钟
            cooldown: 300000
        },
        quotaUsage: {
            enabled: true,
            threshold: 0.9, // 配额使用超过 90% 触发告警
            cooldown: 3600000 // 冷却时间 1 小时
        }
    },
    notifications: {
        browser: {
            enabled: true
        },
        wecom: {
            enabled: false,
            webhookUrl: '',
            mentionedList: [], // @指定成员的userid列表
            mentionedMobileList: [] // @指定成员的手机号列表
        },
        webhook: {
            enabled: false,
            url: '',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    }
};

class AlertManager {
    constructor() {
        this.config = null;
        this.history = [];
        this.cooldowns = new Map(); // 告警冷却记录
        this.metrics = {
            errorCounts: new Map(), // 错误计数
            requestCounts: new Map(), // 请求计数
            lastCheck: Date.now()
        };
        this.browserClients = new Set(); // SSE 连接的客户端
    }

    /**
     * 初始化告警管理器
     */
    async initialize() {
        await this.loadConfig();
        await this.loadHistory();
        this.startMonitoring();
        logger.info('[AlertManager] Initialized successfully');
    }

    /**
     * 加载告警配置
     */
    async loadConfig() {
        try {
            if (existsSync(ALERT_CONFIG_FILE)) {
                const content = await fs.readFile(ALERT_CONFIG_FILE, 'utf8');
                this.config = JSON.parse(content);
            } else {
                this.config = DEFAULT_ALERT_CONFIG;
                await this.saveConfig();
            }
        } catch (error) {
            logger.error('[AlertManager] Failed to load config:', error.message);
            this.config = DEFAULT_ALERT_CONFIG;
        }
    }

    /**
     * 保存告警配置
     */
    async saveConfig() {
        try {
            const dir = path.dirname(ALERT_CONFIG_FILE);
            if (!existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
            await fs.writeFile(ALERT_CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
        } catch (error) {
            logger.error('[AlertManager] Failed to save config:', error.message);
        }
    }

    /**
     * 加载告警历史
     */
    async loadHistory() {
        try {
            if (existsSync(ALERT_HISTORY_FILE)) {
                const content = await fs.readFile(ALERT_HISTORY_FILE, 'utf8');
                this.history = JSON.parse(content);
                // 只保留最近 1000 条记录
                if (this.history.length > 1000) {
                    this.history = this.history.slice(-1000);
                    await this.saveHistory();
                }
            }
        } catch (error) {
            logger.error('[AlertManager] Failed to load history:', error.message);
            this.history = [];
        }
    }

    /**
     * 保存告警历史
     */
    async saveHistory() {
        try {
            const dir = path.dirname(ALERT_HISTORY_FILE);
            if (!existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
            await fs.writeFile(ALERT_HISTORY_FILE, JSON.stringify(this.history, null, 2), 'utf8');
        } catch (error) {
            logger.error('[AlertManager] Failed to save history:', error.message);
        }
    }

    /**
     * 发送企业微信通知
     */
    async sendWecomNotification(alert) {
        if (!this.config.notifications.wecom.webhookUrl) return;

        try {
            const severityEmoji = {
                info: 'ℹ️',
                warning: '⚠️',
                error: '❌'
            };

            const severityText = {
                info: '信息',
                warning: '警告',
                error: '错误'
            };

            const content = [
                `${severityEmoji[alert.severity]} **${alert.title}**`,
                '',
                `> 严重程度: <font color="${alert.severity === 'error' ? 'warning' : 'info'}">${severityText[alert.severity]}</font>`,
                `> 时间: ${alert.timestamp}`,
                '',
                alert.message
            ];

            if (alert.data) {
                content.push('');
                content.push('**详细信息:**');
                Object.entries(alert.data).forEach(([key, value]) => {
                    content.push(`> ${key}: ${JSON.stringify(value)}`);
                });
            }

            const payload = {
                msgtype: 'markdown',
                markdown: {
                    content: content.join('\n')
                }
            };

            // 添加 @提醒
            if (this.config.notifications.wecom.mentionedList?.length > 0) {
                payload.markdown.mentioned_list = this.config.notifications.wecom.mentionedList;
            }
            if (this.config.notifications.wecom.mentionedMobileList?.length > 0) {
                payload.markdown.mentioned_mobile_list = this.config.notifications.wecom.mentionedMobileList;
            }

            await axios.post(this.config.notifications.wecom.webhookUrl, payload, {
                timeout: 10000
            });
            
            logger.info('[AlertManager] WeChat Work notification sent');
        } catch (error) {
            logger.error('[AlertManager] Error sending WeChat Work notification:', error.message);
        }
    }

    /**
     * 开始监控
     */
    startMonitoring() {
        // 每分钟检查一次
        setInterval(() => {
            this.checkAlerts();
        }, 60000);
        
        logger.info('[AlertManager] Monitoring started');
    }

    /**
     * 检查所有告警规则
     */
    async checkAlerts() {
        if (!this.config.enabled) return;

        try {
            // 检查提供商健康状态
            if (this.config.rules.providerHealth.enabled) {
                await this.checkProviderHealth();
            }

            // 检查错误率
            if (this.config.rules.errorRate.enabled) {
                await this.checkErrorRate();
            }

            // 检查配额使用
            if (this.config.rules.quotaUsage.enabled) {
                await this.checkQuotaUsage();
            }
        } catch (error) {
            logger.error('[AlertManager] Error checking alerts:', error.message);
        }
    }

    /**
     * 检查提供商健康状态
     */
    async checkProviderHealth() {
        try {
            // 获取提供商池管理器
            const { getProviderPoolManager } = await import('./service-manager.js');
            const poolManager = getProviderPoolManager();
            
            if (!poolManager || !poolManager.providerStatus) return;

            const pools = poolManager.providerStatus;
            
            for (const [providerType, providers] of Object.entries(pools)) {
                const total = providers.length;
                if (total === 0) continue;

                const healthy = providers.filter(p => p.config.isHealthy && !p.config.isDisabled).length;
                const healthRate = healthy / total;

                if (healthRate < this.config.rules.providerHealth.threshold) {
                    await this.triggerAlert({
                        type: 'provider_health',
                        severity: 'warning',
                        title: `提供商健康状态异常: ${providerType}`,
                        message: `提供商 ${providerType} 健康率仅为 ${(healthRate * 100).toFixed(1)}%（${healthy}/${total}），低于阈值 ${(this.config.rules.providerHealth.threshold * 100).toFixed(0)}%`,
                        data: {
                            providerType,
                            total,
                            healthy,
                            healthRate
                        }
                    });
                }
            }
        } catch (error) {
            logger.error('[AlertManager] Error checking provider health:', error.message);
        }
    }

    /**
     * 检查错误率
     */
    async checkErrorRate() {
        try {
            const now = Date.now();
            const timeWindow = this.config.rules.errorRate.timeWindow;

            for (const [providerType, errorCount] of this.metrics.errorCounts.entries()) {
                const requestCount = this.metrics.requestCounts.get(providerType) || 0;
                
                if (requestCount === 0) continue;

                const errorRate = errorCount / requestCount;

                if (errorRate > this.config.rules.errorRate.threshold) {
                    await this.triggerAlert({
                        type: 'error_rate',
                        severity: 'error',
                        title: `错误率超过阈值: ${providerType}`,
                        message: `提供商 ${providerType} 在过去 ${Math.round(timeWindow / 60000)} 分钟内错误率为 ${(errorRate * 100).toFixed(1)}%（${errorCount}/${requestCount}），超过阈值 ${(this.config.rules.errorRate.threshold * 100).toFixed(0)}%`,
                        data: {
                            providerType,
                            errorCount,
                            requestCount,
                            errorRate
                        }
                    });
                }
            }

            // 重置计数器
            this.metrics.errorCounts.clear();
            this.metrics.requestCounts.clear();
            this.metrics.lastCheck = now;
        } catch (error) {
            logger.error('[AlertManager] Error checking error rate:', error.message);
        }
    }

    /**
     * 检查配额使用
     */
    async checkQuotaUsage() {
        try {
            // 这里可以集成实际的配额查询逻辑
            // 目前作为示例，可以根据实际情况扩展
            logger.debug('[AlertManager] Checking quota usage...');
        } catch (error) {
            logger.error('[AlertManager] Error checking quota usage:', error.message);
        }
    }

    /**
     * 触发告警
     */
    async triggerAlert(alert) {
        const alertKey = `${alert.type}_${alert.data?.providerType || 'global'}`;
        
        // 检查冷却时间
        const lastAlert = this.cooldowns.get(alertKey);
        const cooldown = this.config.rules[alert.type.replace('_', '')]?.cooldown || 300000;
        
        if (lastAlert && Date.now() - lastAlert < cooldown) {
            logger.debug(`[AlertManager] Alert ${alertKey} is in cooldown period`);
            return;
        }

        // 创建告警记录
        const alertRecord = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            ...alert,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };

        // 保存到历史
        this.history.push(alertRecord);
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }
        await this.saveHistory();

        // 更新冷却时间
        this.cooldowns.set(alertKey, Date.now());

        // 发送通知
        await this.sendNotifications(alertRecord);

        logger.info(`[AlertManager] Alert triggered: ${alert.title}`);
    }

    /**
     * 发送通知
     */
    async sendNotifications(alert) {
        const notifications = [];

        // 浏览器通知
        if (this.config.notifications.browser.enabled) {
            notifications.push(this.sendBrowserNotification(alert));
        }

        // 企业微信通知
        if (this.config.notifications.wecom.enabled) {
            notifications.push(this.sendWecomNotification(alert));
        }

        // Webhook 通知
        if (this.config.notifications.webhook.enabled) {
            notifications.push(this.sendWebhookNotification(alert));
        }

        await Promise.allSettled(notifications);
    }

    /**
     * 发送浏览器通知
     */
    async sendBrowserNotification(alert) {
        try {
            // 通过 SSE 发送给所有连接的客户端
            const message = JSON.stringify({
                type: 'alert',
                data: alert
            });

            for (const client of this.browserClients) {
                try {
                    client.write(`data: ${message}\n\n`);
                } catch (error) {
                    this.browserClients.delete(client);
                }
            }
        } catch (error) {
            logger.error('[AlertManager] Error sending browser notification:', error.message);
        }
    }

    /**
     * 发送 Webhook 通知
     */
    async sendWebhookNotification(alert) {
        try {
            await axios({
                method: this.config.notifications.webhook.method,
                url: this.config.notifications.webhook.url,
                headers: this.config.notifications.webhook.headers,
                data: alert,
                timeout: 10000
            });
            logger.info('[AlertManager] Webhook notification sent');
        } catch (error) {
            logger.error('[AlertManager] Error sending webhook notification:', error.message);
        }
    }

    /**
     * 记录请求
     */
    recordRequest(providerType, isError = false) {
        const requestCount = this.metrics.requestCounts.get(providerType) || 0;
        this.metrics.requestCounts.set(providerType, requestCount + 1);

        if (isError) {
            const errorCount = this.metrics.errorCounts.get(providerType) || 0;
            this.metrics.errorCounts.set(providerType, errorCount + 1);
        }
    }

    /**
     * 添加浏览器客户端
     */
    addBrowserClient(client) {
        this.browserClients.add(client);
    }

    /**
     * 移除浏览器客户端
     */
    removeBrowserClient(client) {
        this.browserClients.delete(client);
    }

    /**
     * 获取告警配置
     */
    getConfig() {
        return this.config;
    }

    /**
     * 更新告警配置
     */
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        await this.saveConfig();
        logger.info('[AlertManager] Config updated');
    }

    /**
     * 获取告警历史
     */
    getHistory(limit = 100, offset = 0) {
        const total = this.history.length;
        const records = this.history.slice().reverse().slice(offset, offset + limit);
        return {
            total,
            records
        };
    }

    /**
     * 确认告警
     */
    async acknowledgeAlert(alertId) {
        const alert = this.history.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            await this.saveHistory();
            return true;
        }
        return false;
    }

    /**
     * 清除告警历史
     */
    async clearHistory() {
        this.history = [];
        await this.saveHistory();
    }

    /**
     * 测试告警
     */
    async testAlert(type = 'all') {
        const testAlert = {
            type: 'test',
            severity: 'info',
            title: '测试告警',
            message: '这是一条测试告警消息，用于验证告警系统是否正常工作。',
            data: {
                test: true,
                timestamp: new Date().toISOString()
            }
        };

        const alertRecord = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            ...testAlert,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };

        // 根据类型发送不同的通知
        if (type === 'all') {
            // 发送所有启用的通知
            await this.sendNotifications(alertRecord);
        } else if (type === 'browser' && this.config.notifications.browser.enabled) {
            await this.sendBrowserNotification(alertRecord);
        } else if (type === 'wecom' && this.config.notifications.wecom.enabled) {
            await this.sendWecomNotification(alertRecord);
        } else if (type === 'webhook' && this.config.notifications.webhook.enabled) {
            await this.sendWebhookNotification(alertRecord);
        } else {
            throw new Error(`通知类型 ${type} 未启用或不支持`);
        }

        return alertRecord;
    }
}

// 单例实例
let alertManagerInstance = null;

/**
 * 获取告警管理器实例
 */
export function getAlertManager() {
    if (!alertManagerInstance) {
        alertManagerInstance = new AlertManager();
    }
    return alertManagerInstance;
}

/**
 * 初始化告警管理器
 */
export async function initializeAlertManager() {
    const manager = getAlertManager();
    await manager.initialize();
    return manager;
}

export default AlertManager;
