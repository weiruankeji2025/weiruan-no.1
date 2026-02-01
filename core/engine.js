/**
 * 威软全网自动化工具 - 核心签到引擎
 * @author 威软全网自动化工具
 * @version 1.0.0
 * @description 全网主流网站自动签到引擎，支持国内外30+网站
 */

class WeiruanCheckinEngine {
  constructor(options = {}) {
    this.version = '1.0.0';
    this.author = '威软全网自动化工具';
    this.options = options;

    // 初始化工具模块
    this.http = new (this._require('utils/http'))();
    this.storage = new (this._require('utils/storage'))();
    this.logger = new (this._require('utils/logger'))({
      prefix: '[威软签到]',
      level: options.logLevel || 'info'
    });

    // 初始化站点模块
    this.sites = this._initSites();

    // 签到队列
    this.queue = [];
    this.isRunning = false;
    this.results = [];

    this.logger.info(`威软全网自动化工具 v${this.version} 初始化完成`);
  }

  /**
   * 动态加载模块
   */
  _require(path) {
    if (typeof require !== 'undefined') {
      return require(`./${path}`);
    }
    // 浏览器环境
    const moduleName = path.split('/').pop().replace('.js', '');
    const className = 'Weiruan' + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    return window[className];
  }

  /**
   * 初始化站点模块
   */
  _initSites() {
    const sites = {};

    // 国内站点
    const chinaSites = {
      jd: { module: 'JDCheckin', name: '京东' },
      wps: { module: 'WPSCheckin', name: 'WPS' },
      bilibili: { module: 'BilibiliCheckin', name: '哔哩哔哩' },
      aliyun: { module: 'AliyunCheckin', name: '阿里云盘' },
      netease_music: { module: 'NeteaseCheckin', name: '网易云音乐' },
      mihoyo: { module: 'MihoyoCheckin', name: '米哈游' }
    };

    // 国外站点
    const globalSites = {
      github: { module: 'GitHubCheckin', name: 'GitHub' },
      steam: { module: 'SteamCheckin', name: 'Steam' },
      discord: { module: 'DiscordCheckin', name: 'Discord' },
      duolingo: { module: 'DuolingoCheckin', name: 'Duolingo' }
    };

    // 加载模块
    for (const [id, config] of Object.entries({ ...chinaSites, ...globalSites })) {
      try {
        const ModuleClass = this._loadSiteModule(id, config.module);
        if (ModuleClass) {
          sites[id] = {
            instance: new ModuleClass(this.http, this.logger),
            name: config.name,
            enabled: true
          };
        }
      } catch (error) {
        this.logger.warn(`加载 ${config.name} 模块失败:`, error.message);
      }
    }

    return sites;
  }

  /**
   * 加载站点模块
   */
  _loadSiteModule(id, moduleName) {
    try {
      if (typeof require !== 'undefined') {
        const chinaPath = `./sites/china/${id}`;
        const globalPath = `./sites/global/${id}`;
        try {
          return require(chinaPath);
        } catch {
          return require(globalPath);
        }
      }
      return window[moduleName];
    } catch {
      return null;
    }
  }

  /**
   * 获取所有支持的站点
   */
  getSupportedSites() {
    return Object.entries(this.sites).map(([id, site]) => ({
      id,
      name: site.name,
      enabled: site.enabled
    }));
  }

  /**
   * 启用/禁用站点
   */
  setSiteEnabled(siteId, enabled) {
    if (this.sites[siteId]) {
      this.sites[siteId].enabled = enabled;
      this.logger.info(`${this.sites[siteId].name} 已${enabled ? '启用' : '禁用'}`);
      return true;
    }
    return false;
  }

  /**
   * 执行单个站点签到
   */
  async checkinSite(siteId, credentials) {
    const site = this.sites[siteId];
    if (!site) {
      return {
        siteId,
        success: false,
        message: '站点不存在'
      };
    }

    if (!site.enabled) {
      return {
        siteId,
        siteName: site.name,
        success: false,
        message: '站点已禁用'
      };
    }

    // 检查今日是否已签到
    if (this.storage.hasCheckedInToday(siteId)) {
      this.logger.info(`${site.name} 今日已签到，跳过`);
      return {
        siteId,
        siteName: site.name,
        success: true,
        message: '今日已签到',
        skipped: true
      };
    }

    try {
      this.logger.info(`开始签到: ${site.name}`);
      const result = await site.instance.checkin(credentials);

      // 保存签到记录
      this.storage.saveCheckinRecord(siteId, result);

      return {
        siteId,
        siteName: site.name,
        ...result
      };

    } catch (error) {
      this.logger.error(`${site.name} 签到异常:`, error.message);
      return {
        siteId,
        siteName: site.name,
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 批量签到
   */
  async checkinAll(credentialsMap) {
    this.isRunning = true;
    this.results = [];

    const enabledSites = Object.entries(this.sites)
      .filter(([_, site]) => site.enabled)
      .map(([id, _]) => id);

    this.logger.info(`开始批量签到，共 ${enabledSites.length} 个站点`);

    for (const siteId of enabledSites) {
      const credentials = credentialsMap[siteId];
      if (!credentials) {
        this.logger.warn(`${this.sites[siteId].name} 缺少凭证，跳过`);
        continue;
      }

      const result = await this.checkinSite(siteId, credentials);
      this.results.push(result);

      // 延迟避免频繁请求
      await this._delay(1000 + Math.random() * 2000);
    }

    this.isRunning = false;
    return this._generateReport();
  }

  /**
   * 定时签到
   */
  scheduleCheckin(credentialsMap, cronExpression = '0 8 * * *') {
    // 简单的定时实现
    const checkTime = () => {
      const now = new Date();
      const targetHour = 8; // 默认早上8点

      if (now.getHours() === targetHour && now.getMinutes() === 0) {
        this.checkinAll(credentialsMap);
      }
    };

    // 每分钟检查一次
    setInterval(checkTime, 60000);
    this.logger.info('定时签到已设置，每日 08:00 执行');

    return {
      stop: () => clearInterval(checkTime)
    };
  }

  /**
   * 生成签到报告
   */
  _generateReport() {
    const successCount = this.results.filter(r => r.success).length;
    const failCount = this.results.filter(r => !r.success && !r.skipped).length;
    const skipCount = this.results.filter(r => r.skipped).length;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        success: successCount,
        failed: failCount,
        skipped: skipCount
      },
      details: this.results,
      version: this.version,
      author: this.author
    };

    this.logger.info('========== 签到报告 ==========');
    this.logger.info(`总计: ${report.summary.total} 个站点`);
    this.logger.success(`成功: ${successCount} 个`);
    if (failCount > 0) {
      this.logger.error(`失败: ${failCount} 个`);
    }
    if (skipCount > 0) {
      this.logger.info(`跳过: ${skipCount} 个`);
    }
    this.logger.info('==============================');

    return report;
  }

  /**
   * 获取签到统计
   */
  getStatistics() {
    const records = this.storage.get('records') || {};
    const stats = {
      totalSites: Object.keys(this.sites).length,
      activeSites: Object.values(this.sites).filter(s => s.enabled).length,
      siteStats: {}
    };

    for (const [siteId, record] of Object.entries(records)) {
      stats.siteStats[siteId] = {
        name: this.sites[siteId]?.name || siteId,
        totalCheckins: record.totalCheckins || 0,
        streak: record.streak || 0,
        lastCheckin: record.lastCheckin
      };
    }

    return stats;
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(siteId, credentials) {
    const site = this.sites[siteId];
    if (!site || !site.instance.checkLogin) {
      return { isLoggedIn: false, message: '站点不存在或不支持登录检查' };
    }

    return await site.instance.checkLogin(credentials);
  }

  /**
   * 导出配置
   */
  exportConfig() {
    return {
      version: this.version,
      sites: this.getSupportedSites(),
      settings: {
        logLevel: this.options.logLevel || 'info'
      }
    };
  }

  /**
   * 延迟函数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeiruanCheckinEngine;
}
if (typeof window !== 'undefined') {
  window.WeiruanCheckinEngine = WeiruanCheckinEngine;
}
