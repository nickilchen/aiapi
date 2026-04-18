/**
 * 告警管理器 - 前端控制器
 */

import { t } from './i18n.js';
import { showToast } from './utils.js';

let alertConfig = null;
let alertHistory = [];
let currentPage = 1;
const pageSize = 20;
let eventSource = null;
let notificationPermission = 'default';

/**
 * 初始化告警管理器
 */
export async function initAlertsManager() {
    console.log('[Alerts] Initializing alerts manager...');
    
    // 检查浏览器通知权限
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
    }
    
    // 加载配置
    await loadAlertConfig();
    
    // 加载历史
    await loadAlertHistory();
    
    // 绑定事件
    bindEvents();
    
    // 连接实时告警流
    connectAlertStream();
    
    console.log('[Alerts] Alerts manager initialized');
}

/**
 * 加载告警配置
 */
async function loadAlertConfig() {
    try {
        const response = await fetch('/api/alerts/config', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            alertConfig = result.data;
            populateConfigForm();
            updateStats();
        }
    } catch (error) {
        console.error('[Alerts] Failed to load config:', error);
        showToast(t('common.error'), '加载告警配置失败', 'error');
    }
}

/**
 * 填充配置表单
 */
function populateConfigForm() {
    if (!alertConfig) return;
    
    // 全局开关
    document.getElementById('alertEnabled').checked = alertConfig.enabled;
    
    // 提供商健康状态规则
    const providerHealth = alertConfig.rules.providerHealth;
    document.getElementById('ruleProviderHealthEnabled').checked = providerHealth.enabled;
    document.getElementById('ruleProviderHealthThreshold').value = (providerHealth.threshold * 100).toFixed(0);
    document.getElementById('ruleProviderHealthCooldown').value = Math.round(providerHealth.cooldown / 60000);
    
    // 错误率规则
    const errorRate = alertConfig.rules.errorRate;
    document.getElementById('ruleErrorRateEnabled').checked = errorRate.enabled;
    document.getElementById('ruleErrorRateThreshold').value = (errorRate.threshold * 100).toFixed(0);
    document.getElementById('ruleErrorRateTimeWindow').value = Math.round(errorRate.timeWindow / 60000);
    document.getElementById('ruleErrorRateCooldown').value = Math.round(errorRate.cooldown / 60000);
    
    // 配额使用规则
    const quotaUsage = alertConfig.rules.quotaUsage;
    document.getElementById('ruleQuotaUsageEnabled').checked = quotaUsage.enabled;
    document.getElementById('ruleQuotaUsageThreshold').value = (quotaUsage.threshold * 100).toFixed(0);
    document.getElementById('ruleQuotaUsageCooldown').value = Math.round(quotaUsage.cooldown / 60000);
    
    // 浏览器通知
    document.getElementById('notificationBrowserEnabled').checked = alertConfig.notifications.browser.enabled;
    
    // 企业微信通知
    const wecom = alertConfig.notifications.wecom;
    document.getElementById('notificationWecomEnabled').checked = wecom.enabled;
    document.getElementById('wecomWebhookUrl').value = wecom.webhookUrl || '';
    document.getElementById('wecomMentionedList').value = wecom.mentionedList?.join(', ') || '';
    document.getElementById('wecomMentionedMobileList').value = wecom.mentionedMobileList?.join(', ') || '';
    
    // Webhook 通知
    const webhook = alertConfig.notifications.webhook;
    document.getElementById('notificationWebhookEnabled').checked = webhook.enabled;
    document.getElementById('webhookUrl').value = webhook.url || '';
    document.getElementById('webhookMethod').value = webhook.method || 'POST';
    document.getElementById('webhookHeaders').value = JSON.stringify(webhook.headers, null, 2);
}

/**
 * 保存告警配置
 */
async function saveAlertConfig() {
    try {
        const config = {
            enabled: document.getElementById('alertEnabled').checked,
            rules: {
                providerHealth: {
                    enabled: document.getElementById('ruleProviderHealthEnabled').checked,
                    threshold: parseFloat(document.getElementById('ruleProviderHealthThreshold').value) / 100,
                    cooldown: parseInt(document.getElementById('ruleProviderHealthCooldown').value) * 60000
                },
                errorRate: {
                    enabled: document.getElementById('ruleErrorRateEnabled').checked,
                    threshold: parseFloat(document.getElementById('ruleErrorRateThreshold').value) / 100,
                    timeWindow: parseInt(document.getElementById('ruleErrorRateTimeWindow').value) * 60000,
                    cooldown: parseInt(document.getElementById('ruleErrorRateCooldown').value) * 60000
                },
                quotaUsage: {
                    enabled: document.getElementById('ruleQuotaUsageEnabled').checked,
                    threshold: parseFloat(document.getElementById('ruleQuotaUsageThreshold').value) / 100,
                    cooldown: parseInt(document.getElementById('ruleQuotaUsageCooldown').value) * 60000
                }
            },
            notifications: {
                browser: {
                    enabled: document.getElementById('notificationBrowserEnabled').checked
                },
                wecom: {
                    enabled: document.getElementById('notificationWecomEnabled').checked,
                    webhookUrl: document.getElementById('wecomWebhookUrl').value,
                    mentionedList: document.getElementById('wecomMentionedList').value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s),
                    mentionedMobileList: document.getElementById('wecomMentionedMobileList').value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s)
                },
                webhook: {
                    enabled: document.getElementById('notificationWebhookEnabled').checked,
                    url: document.getElementById('webhookUrl').value,
                    method: document.getElementById('webhookMethod').value,
                    headers: JSON.parse(document.getElementById('webhookHeaders').value || '{}')
                }
            }
        };
        
        const response = await fetch('/api/alerts/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        if (result.success) {
            alertConfig = config;
            showToast(t('common.success'), '告警配置已保存', 'success');
        } else {
            throw new Error(result.error?.message || '保存失败');
        }
    } catch (error) {
        console.error('[Alerts] Failed to save config:', error);
        showToast(t('common.error'), '保存告警配置失败: ' + error.message, 'error');
    }
}

/**
 * 加载告警历史
 */
async function loadAlertHistory(page = 1) {
    const container = document.getElementById('alertHistoryList');
    
    try {
        const offset = (page - 1) * pageSize;
        const response = await fetch(`/api/alerts/history?limit=${pageSize}&offset=${offset}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            alertHistory = result.data.records;
            currentPage = page;
            renderAlertHistory();
            renderPagination(result.data.total);
            updateStats();
        } else {
            // 加载失败，显示空状态
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>加载失败</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('[Alerts] Failed to load history:', error);
        showToast(t('common.error'), '加载告警历史失败', 'error');
        
        // 加载失败，显示空状态
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>加载失败</span>
                </div>
            `;
        }
    }
}

/**
 * 渲染告警历史
 */
function renderAlertHistory() {
    const container = document.getElementById('alertHistoryList');
    
    // 应用过滤器
    const typeFilter = document.getElementById('alertTypeFilter').value;
    const severityFilter = document.getElementById('alertSeverityFilter').value;
    
    let filteredHistory = alertHistory;
    if (typeFilter !== 'all') {
        filteredHistory = filteredHistory.filter(a => a.type === typeFilter);
    }
    if (severityFilter !== 'all') {
        filteredHistory = filteredHistory.filter(a => a.severity === severityFilter);
    }
    
    if (filteredHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <span>暂无告警记录</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredHistory.map(alert => `
        <div class="alert-item severity-${alert.severity} ${alert.acknowledged ? 'acknowledged' : ''}" data-alert-id="${alert.id}">
            <div class="alert-item-header">
                <div class="alert-item-title">
                    <i class="fas ${getSeverityIcon(alert.severity)}"></i>
                    <span>${alert.title}</span>
                </div>
                <div class="alert-item-meta">
                    <span class="alert-badge severity-${alert.severity}">
                        ${getSeverityText(alert.severity)}
                    </span>
                    <span>${formatTime(alert.timestamp)}</span>
                    ${alert.acknowledged ? '<i class="fas fa-check-circle" title="已确认"></i>' : ''}
                </div>
            </div>
            <div class="alert-item-message">${alert.message}</div>
            ${!alert.acknowledged ? `
                <div class="alert-item-actions">
                    <button class="btn btn-sm btn-outline acknowledge-btn" data-alert-id="${alert.id}">
                        <i class="fas fa-check"></i>
                        <span>确认</span>
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // 绑定确认按钮事件
    container.querySelectorAll('.acknowledge-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const alertId = btn.dataset.alertId;
            await acknowledgeAlert(alertId);
        });
    });
}

/**
 * 渲染分页
 */
function renderPagination(total) {
    const container = document.getElementById('alertPagination');
    const totalPages = Math.ceil(total / pageSize);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <button ${currentPage === 1 ? 'disabled' : ''} id="prevPage">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span class="page-info">${currentPage} / ${totalPages}</span>
        <button ${currentPage === totalPages ? 'disabled' : ''} id="nextPage">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            loadAlertHistory(currentPage - 1);
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            loadAlertHistory(currentPage + 1);
        }
    });
}

/**
 * 确认告警
 */
async function acknowledgeAlert(alertId) {
    try {
        const response = await fetch(`/api/alerts/acknowledge/${alertId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(t('common.success'), '告警已确认', 'success');
            await loadAlertHistory(currentPage);
        }
    } catch (error) {
        console.error('[Alerts] Failed to acknowledge alert:', error);
        showToast(t('common.error'), '确认告警失败', 'error');
    }
}

/**
 * 清除告警历史
 */
async function clearAlertHistory() {
    if (!confirm('确定要清除所有告警历史吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch('/api/alerts/history', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(t('common.success'), '告警历史已清除', 'success');
            await loadAlertHistory(1);
        }
    } catch (error) {
        console.error('[Alerts] Failed to clear history:', error);
        showToast(t('common.error'), '清除告警历史失败', 'error');
    }
}

/**
 * 测试告警
 */
async function testAlert() {
    try {
        const response = await fetch('/api/alerts/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({ type: 'all' })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(t('common.success'), '测试告警已发送', 'success');
        }
    } catch (error) {
        console.error('[Alerts] Failed to test alert:', error);
        showToast(t('common.error'), '发送测试告警失败', 'error');
    }
}

/**
 * 测试浏览器通知
 */
async function testBrowserNotification() {
    try {
        const response = await fetch('/api/alerts/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({ type: 'browser' })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(t('common.success'), '浏览器测试通知已发送', 'success');
        }
    } catch (error) {
        console.error('[Alerts] Failed to test browser notification:', error);
        showToast(t('common.error'), '发送浏览器测试通知失败', 'error');
    }
}

/**
 * 测试企业微信通知
 */
async function testWecomNotification() {
    try {
        const response = await fetch('/api/alerts/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({ type: 'wecom' })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(t('common.success'), '企业微信测试通知已发送', 'success');
        } else {
            throw new Error(result.error?.message || '发送失败');
        }
    } catch (error) {
        console.error('[Alerts] Failed to test wecom notification:', error);
        showToast(t('common.error'), '发送企业微信测试通知失败: ' + error.message, 'error');
    }
}

/**
 * 测试Webhook通知
 */
async function testWebhookNotification() {
    try {
        const response = await fetch('/api/alerts/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({ type: 'webhook' })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast(t('common.success'), 'Webhook测试通知已发送', 'success');
        } else {
            throw new Error(result.error?.message || '发送失败');
        }
    } catch (error) {
        console.error('[Alerts] Failed to test webhook notification:', error);
        showToast(t('common.error'), '发送Webhook测试通知失败: ' + error.message, 'error');
    }
}

/**
 * 连接实时告警流
 */
function connectAlertStream() {
    if (eventSource) {
        eventSource.close();
    }
    
    eventSource = new EventSource('/api/alerts/stream');
    
    eventSource.onopen = () => {
        console.log('[Alerts] Alert stream connected');
        updateConnectionStatus('connected');
    };
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'alert') {
                handleNewAlert(data.data);
            }
        } catch (error) {
            console.error('[Alerts] Failed to parse alert message:', error);
        }
    };
    
    eventSource.onerror = () => {
        console.error('[Alerts] Alert stream error');
        updateConnectionStatus('disconnected');
        
        // 5秒后重连
        setTimeout(() => {
            connectAlertStream();
        }, 5000);
    };
}

/**
 * 处理新告警
 */
function handleNewAlert(alert) {
    console.log('[Alerts] New alert received:', alert);
    
    // 显示浏览器通知
    if (alertConfig?.notifications.browser.enabled && notificationPermission === 'granted') {
        showBrowserNotification(alert);
    }
    
    // 显示 Toast
    showToast(
        getSeverityText(alert.severity),
        alert.title,
        alert.severity === 'error' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'
    );
    
    // 刷新历史列表
    loadAlertHistory(currentPage);
}

/**
 * 显示浏览器通知
 */
function showBrowserNotification(alert) {
    if (!('Notification' in window)) return;
    
    const notification = new Notification(alert.title, {
        body: alert.message,
        icon: '/static/favicon.ico',
        badge: '/static/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === 'error'
    });
    
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
}

/**
 * 请求通知权限
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast(t('common.error'), '您的浏览器不支持通知功能', 'error');
        return;
    }
    
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    
    if (permission === 'granted') {
        showToast(t('common.success'), '通知权限已授予', 'success');
    } else {
        showToast(t('common.warning'), '通知权限被拒绝', 'warning');
    }
}

/**
 * 更新连接状态
 */
function updateConnectionStatus(status) {
    const icon = document.getElementById('alertStatusIcon');
    const text = document.getElementById('alertStatusText');
    
    if (status === 'connected') {
        icon.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        text.textContent = '已连接';
        text.style.color = '#10b981';
    } else {
        icon.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
        text.textContent = '未连接';
        text.style.color = '#ef4444';
    }
}

/**
 * 更新统计数据
 */
function updateStats() {
    const total = alertHistory.length;
    const unacknowledged = alertHistory.filter(a => !a.acknowledged).length;
    const acknowledged = total - unacknowledged;
    
    document.getElementById('totalAlertsCount').textContent = total;
    document.getElementById('unacknowledgedCount').textContent = unacknowledged;
    document.getElementById('acknowledgedCount').textContent = acknowledged;
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 保存配置
    document.getElementById('saveAlertConfigBtn')?.addEventListener('click', saveAlertConfig);
    
    // 测试告警
    document.getElementById('testAlertBtn')?.addEventListener('click', testAlert);
    
    // 清除历史
    document.getElementById('clearHistoryBtn')?.addEventListener('click', clearAlertHistory);
    
    // 请求通知权限
    document.getElementById('requestNotificationPermission')?.addEventListener('click', requestNotificationPermission);
    
    // 测试浏览器通知
    document.getElementById('testBrowserNotification')?.addEventListener('click', testBrowserNotification);
    
    // 测试企业微信通知
    document.getElementById('testWecomNotification')?.addEventListener('click', testWecomNotification);
    
    // 测试Webhook通知
    document.getElementById('testWebhookNotification')?.addEventListener('click', testWebhookNotification);
    
    // 过滤器
    document.getElementById('alertTypeFilter')?.addEventListener('change', () => renderAlertHistory());
    document.getElementById('alertSeverityFilter')?.addEventListener('change', () => renderAlertHistory());
}

/**
 * 获取严重程度图标
 */
function getSeverityIcon(severity) {
    const icons = {
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    return icons[severity] || 'fa-bell';
}

/**
 * 获取严重程度文本
 */
function getSeverityText(severity) {
    const texts = {
        info: '信息',
        warning: '警告',
        error: '错误'
    };
    return texts[severity] || severity;
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return '刚刚';
    } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)} 小时前`;
    } else {
        return date.toLocaleString('zh-CN');
    }
}

// 页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlertsManager);
} else if (document.getElementById('alerts')) {
    // 如果告警组件已经存在，直接初始化
    initAlertsManager();
} else {
    // 否则等待组件加载完成
    window.addEventListener('componentsLoaded', initAlertsManager);
}

// 页面卸载时关闭连接
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});
