/**
 * 威软全网自动化工具 - 日志工具模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class WeiruanLogger {
  constructor(options = {}) {
    this.prefix = options.prefix || '[威软签到]';
    this.level = options.level || 'info';
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.colors = {
      debug: '#9E9E9E',
      info: '#2196F3',
      warn: '#FF9800',
      error: '#F44336',
      success: '#4CAF50'
    };
    this.logs = [];
    this.maxLogs = options.maxLogs || 1000;
  }

  /**
   * 格式化时间
   */
  _formatTime() {
    const now = new Date();
    return now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 记录日志
   */
  _log(level, ...args) {
    if (this.levels[level] < this.levels[this.level]) return;

    const time = this._formatTime();
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    const logEntry = {
      level,
      time,
      message,
      timestamp: Date.now()
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 控制台输出
    const color = this.colors[level] || this.colors.info;
    if (typeof console !== 'undefined') {
      const style = `color: ${color}; font-weight: bold;`;
      console.log(`%c${this.prefix} [${time}] [${level.toUpperCase()}]`, style, message);
    }

    return logEntry;
  }

  debug(...args) {
    return this._log('debug', ...args);
  }

  info(...args) {
    return this._log('info', ...args);
  }

  warn(...args) {
    return this._log('warn', ...args);
  }

  error(...args) {
    return this._log('error', ...args);
  }

  success(...args) {
    return this._log('success', ...args);
  }

  /**
   * 获取所有日志
   */
  getLogs(filter = {}) {
    let logs = [...this.logs];

    if (filter.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter.startTime) {
      logs = logs.filter(log => log.timestamp >= filter.startTime);
    }

    if (filter.endTime) {
      logs = logs.filter(log => log.timestamp <= filter.endTime);
    }

    if (filter.keyword) {
      logs = logs.filter(log =>
        log.message.toLowerCase().includes(filter.keyword.toLowerCase())
      );
    }

    return logs;
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = [];
  }

  /**
   * 导出日志
   */
  export(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    if (format === 'text') {
      return this.logs.map(log =>
        `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`
      ).join('\n');
    }

    return this.logs;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeiruanLogger;
}
if (typeof window !== 'undefined') {
  window.WeiruanLogger = WeiruanLogger;
}
