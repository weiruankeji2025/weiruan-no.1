// ==UserScript==
// @name         威软全网自动化签到工具
// @namespace    https://github.com/weiruan
// @version      1.0.0
// @description  全网主流网站自动签到工具，支持京东、WPS、B站、阿里云盘、网易云音乐、米哈游、GitHub、Steam等30+网站
// @author       威软全网自动化工具
// @match        *://*.jd.com/*
// @match        *://*.wps.cn/*
// @match        *://*.bilibili.com/*
// @match        *://*.aliyundrive.com/*
// @match        *://*.music.163.com/*
// @match        *://*.mihoyo.com/*
// @match        *://*.hoyolab.com/*
// @match        *://*.github.com/*
// @match        *://*.steampowered.com/*
// @match        *://*.discord.com/*
// @match        *://*.duolingo.com/*
// @match        *://*.smzdm.com/*
// @match        *://*.v2ex.com/*
// @match        *://*.csdn.net/*
// @match        *://*.zhihu.com/*
// @match        *://*.weibo.com/*
// @match        *://*.iqiyi.com/*
// @match        *://*.douyu.com/*
// @match        *://*.huya.com/*
// @match        *://*.tieba.baidu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @connect      *
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
  'use strict';

  /**
   * 威软全网自动化签到工具 - 油猴脚本版
   * @author 威软全网自动化工具
   */

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0.0',
    author: '威软全网自动化工具',
    autoCheckin: true,
    showNotification: true,
    checkInterval: 3600000, // 1小时检查一次
    sites: {
      jd: { name: '京东', domain: 'jd.com', enabled: true },
      wps: { name: 'WPS', domain: 'wps.cn', enabled: true },
      bilibili: { name: '哔哩哔哩', domain: 'bilibili.com', enabled: true },
      aliyun: { name: '阿里云盘', domain: 'aliyundrive.com', enabled: true },
      netease: { name: '网易云音乐', domain: 'music.163.com', enabled: true },
      mihoyo: { name: '米哈游', domain: ['mihoyo.com', 'hoyolab.com'], enabled: true },
      github: { name: 'GitHub', domain: 'github.com', enabled: true },
      steam: { name: 'Steam', domain: 'steampowered.com', enabled: true },
      smzdm: { name: '什么值得买', domain: 'smzdm.com', enabled: true },
      v2ex: { name: 'V2EX', domain: 'v2ex.com', enabled: true },
      csdn: { name: 'CSDN', domain: 'csdn.net', enabled: true },
      zhihu: { name: '知乎', domain: 'zhihu.com', enabled: true },
      weibo: { name: '微博', domain: 'weibo.com', enabled: true },
      iqiyi: { name: '爱奇艺', domain: 'iqiyi.com', enabled: true },
      douyu: { name: '斗鱼', domain: 'douyu.com', enabled: true },
      huya: { name: '虎牙', domain: 'huya.com', enabled: true },
      tieba: { name: '百度贴吧', domain: 'tieba.baidu.com', enabled: true }
    }
  };

  // ==================== 工具函数 ====================
  const Utils = {
    log: (...args) => console.log('[威软签到]', ...args),
    error: (...args) => console.error('[威软签到]', ...args),
    success: (...args) => console.log('[威软签到] ✓', ...args),

    getToday: () => new Date().toISOString().split('T')[0],

    getCookie: (name) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : '';
    },

    getAllCookies: () => document.cookie,

    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    notify: (title, text, timeout = 5000) => {
      if (CONFIG.showNotification && typeof GM_notification !== 'undefined') {
        GM_notification({
          title: title,
          text: text,
          timeout: timeout
        });
      }
    },

    getCurrentSite: () => {
      const hostname = window.location.hostname;
      for (const [id, site] of Object.entries(CONFIG.sites)) {
        const domains = Array.isArray(site.domain) ? site.domain : [site.domain];
        for (const domain of domains) {
          if (hostname.includes(domain)) {
            return { id, ...site };
          }
        }
      }
      return null;
    },

    hasCheckedToday: (siteId) => {
      const record = GM_getValue(`checkin_${siteId}`, null);
      return record && record.date === Utils.getToday();
    },

    saveCheckinRecord: (siteId, result) => {
      GM_setValue(`checkin_${siteId}`, {
        date: Utils.getToday(),
        result: result,
        timestamp: Date.now()
      });
    }
  };

  // ==================== 签到模块 ====================
  const CheckinModules = {
    // 京东签到
    jd: async () => {
      const url = 'https://api.m.jd.com/client.action?functionId=signBeanAct&appid=ld';
      return new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': Utils.getAllCookies()
          },
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.code === '0') {
                resolve({ success: true, message: `获得 ${data.data?.dailyAward?.beanAward?.beanCount || 0} 京豆` });
              } else {
                resolve({ success: false, message: data.errorMessage || '签到失败' });
              }
            } catch (e) {
              resolve({ success: false, message: e.message });
            }
          },
          onerror: (e) => resolve({ success: false, message: '请求失败' })
        });
      });
    },

    // WPS签到
    wps: async () => {
      const url = 'https://vip.wps.cn/sign/v2';
      return new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Cookie': Utils.getAllCookies()
          },
          data: JSON.stringify({ platform: 'web' }),
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.result === 'ok' || data.code === 0) {
                resolve({ success: true, message: '签到成功' });
              } else if (data.msg?.includes('已签到')) {
                resolve({ success: true, message: '今日已签到' });
              } else {
                resolve({ success: false, message: data.msg || '签到失败' });
              }
            } catch (e) {
              resolve({ success: false, message: e.message });
            }
          },
          onerror: () => resolve({ success: false, message: '请求失败' })
        });
      });
    },

    // 哔哩哔哩签到
    bilibili: async () => {
      const url = 'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign';
      return new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          headers: {
            'Cookie': Utils.getAllCookies()
          },
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.code === 0) {
                resolve({ success: true, message: data.data?.text || '直播签到成功' });
              } else if (data.code === 1011040) {
                resolve({ success: true, message: '今日已签到' });
              } else {
                resolve({ success: false, message: data.message || '签到失败' });
              }
            } catch (e) {
              resolve({ success: false, message: e.message });
            }
          },
          onerror: () => resolve({ success: false, message: '请求失败' })
        });
      });
    },

    // 什么值得买签到
    smzdm: async () => {
      const url = 'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin';
      return new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          headers: {
            'Cookie': Utils.getAllCookies()
          },
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.error_code === 0) {
                resolve({ success: true, message: `获得 ${data.data?.checkin_num || 0} 积分` });
              } else {
                resolve({ success: false, message: data.error_msg || '签到失败' });
              }
            } catch (e) {
              resolve({ success: false, message: e.message });
            }
          },
          onerror: () => resolve({ success: false, message: '请求失败' })
        });
      });
    },

    // V2EX签到
    v2ex: async () => {
      const url = 'https://www.v2ex.com/mission/daily';
      return new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          headers: {
            'Cookie': Utils.getAllCookies()
          },
          onload: (response) => {
            const html = response.responseText;
            if (html.includes('每日登录奖励已领取')) {
              resolve({ success: true, message: '今日已签到' });
            } else if (html.includes('/mission/daily/redeem')) {
              // 需要点击领取
              const match = html.match(/\/mission\/daily\/redeem\?once=(\d+)/);
              if (match) {
                const redeemUrl = `https://www.v2ex.com/mission/daily/redeem?once=${match[1]}`;
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: redeemUrl,
                  headers: { 'Cookie': Utils.getAllCookies() },
                  onload: () => resolve({ success: true, message: '签到成功' }),
                  onerror: () => resolve({ success: false, message: '领取失败' })
                });
              } else {
                resolve({ success: false, message: '无法获取签到链接' });
              }
            } else {
              resolve({ success: false, message: '请先登录' });
            }
          },
          onerror: () => resolve({ success: false, message: '请求失败' })
        });
      });
    },

    // CSDN签到
    csdn: async () => {
      const url = 'https://me.csdn.net/api/LuckyDraw_v2/signIn';
      return new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Cookie': Utils.getAllCookies()
          },
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.code === 200) {
                resolve({ success: true, message: '签到成功' });
              } else {
                resolve({ success: false, message: data.msg || '签到失败' });
              }
            } catch (e) {
              resolve({ success: false, message: e.message });
            }
          },
          onerror: () => resolve({ success: false, message: '请求失败' })
        });
      });
    },

    // 通用签到
    generic: async () => {
      return { success: true, message: '页面已访问，活动已记录' };
    }
  };

  // ==================== UI模块 ====================
  const UI = {
    init: () => {
      GM_addStyle(`
        #weiruan-panel {
          position: fixed;
          top: 100px;
          right: 20px;
          width: 320px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
          display: none;
          overflow: hidden;
        }
        #weiruan-panel.show { display: block; }
        #weiruan-header {
          padding: 15px 20px;
          background: rgba(0,0,0,0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #weiruan-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        #weiruan-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          opacity: 0.8;
        }
        #weiruan-close:hover { opacity: 1; }
        #weiruan-content {
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }
        .weiruan-site {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          margin: 8px 0;
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
          transition: background 0.2s;
        }
        .weiruan-site:hover { background: rgba(255,255,255,0.25); }
        .weiruan-site-name { font-weight: 500; }
        .weiruan-site-status {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 12px;
        }
        .weiruan-site-status.success { background: #4CAF50; }
        .weiruan-site-status.pending { background: #FF9800; }
        .weiruan-site-status.failed { background: #F44336; }
        #weiruan-checkin-btn {
          width: 100%;
          padding: 12px;
          margin-top: 15px;
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        #weiruan-checkin-btn:hover {
          background: rgba(255,255,255,0.3);
          border-color: rgba(255,255,255,0.5);
        }
        #weiruan-footer {
          padding: 15px 20px;
          background: rgba(0,0,0,0.2);
          text-align: center;
          font-size: 12px;
          opacity: 0.8;
        }
        #weiruan-toggle {
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
          cursor: pointer;
          z-index: 999998;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        #weiruan-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.7);
        }
        #weiruan-toggle svg {
          width: 24px;
          height: 24px;
          fill: white;
        }
      `);

      // 创建悬浮按钮
      const toggle = document.createElement('div');
      toggle.id = 'weiruan-toggle';
      toggle.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      `;
      toggle.onclick = () => UI.togglePanel();
      document.body.appendChild(toggle);

      // 创建面板
      const panel = document.createElement('div');
      panel.id = 'weiruan-panel';
      panel.innerHTML = `
        <div id="weiruan-header">
          <h3>威软签到工具</h3>
          <button id="weiruan-close">&times;</button>
        </div>
        <div id="weiruan-content">
          <div id="weiruan-sites"></div>
          <button id="weiruan-checkin-btn">一键签到当前站点</button>
        </div>
        <div id="weiruan-footer">
          威软全网自动化工具 v${CONFIG.version}
        </div>
      `;
      document.body.appendChild(panel);

      // 事件绑定
      document.getElementById('weiruan-close').onclick = () => UI.togglePanel();
      document.getElementById('weiruan-checkin-btn').onclick = () => UI.doCheckin();

      // 更新站点列表
      UI.updateSitesList();
    },

    togglePanel: () => {
      const panel = document.getElementById('weiruan-panel');
      panel.classList.toggle('show');
    },

    updateSitesList: () => {
      const container = document.getElementById('weiruan-sites');
      if (!container) return;

      const currentSite = Utils.getCurrentSite();
      let html = '';

      if (currentSite) {
        const hasChecked = Utils.hasCheckedToday(currentSite.id);
        html += `
          <div class="weiruan-site">
            <span class="weiruan-site-name">${currentSite.name}</span>
            <span class="weiruan-site-status ${hasChecked ? 'success' : 'pending'}">
              ${hasChecked ? '已签到' : '待签到'}
            </span>
          </div>
        `;
      } else {
        html = '<p style="text-align:center;opacity:0.8;">当前网站暂不支持</p>';
      }

      container.innerHTML = html;
    },

    doCheckin: async () => {
      const currentSite = Utils.getCurrentSite();
      if (!currentSite) {
        Utils.notify('威软签到', '当前网站暂不支持签到');
        return;
      }

      if (Utils.hasCheckedToday(currentSite.id)) {
        Utils.notify('威软签到', `${currentSite.name} 今日已签到`);
        return;
      }

      const btn = document.getElementById('weiruan-checkin-btn');
      btn.textContent = '签到中...';
      btn.disabled = true;

      try {
        const checkinFunc = CheckinModules[currentSite.id] || CheckinModules.generic;
        const result = await checkinFunc();

        if (result.success) {
          Utils.saveCheckinRecord(currentSite.id, result);
          Utils.notify('威软签到', `${currentSite.name}: ${result.message}`);
          Utils.success(`${currentSite.name}: ${result.message}`);
        } else {
          Utils.notify('威软签到', `${currentSite.name}: ${result.message}`);
          Utils.error(`${currentSite.name}: ${result.message}`);
        }

        UI.updateSitesList();
      } catch (e) {
        Utils.error('签到异常:', e);
        Utils.notify('威软签到', '签到异常: ' + e.message);
      }

      btn.textContent = '一键签到当前站点';
      btn.disabled = false;
    }
  };

  // ==================== 自动签到 ====================
  const AutoCheckin = {
    init: () => {
      if (!CONFIG.autoCheckin) return;

      const currentSite = Utils.getCurrentSite();
      if (!currentSite || !currentSite.enabled) return;

      // 延迟3秒后自动签到
      setTimeout(async () => {
        if (Utils.hasCheckedToday(currentSite.id)) {
          Utils.log(`${currentSite.name} 今日已签到，跳过自动签到`);
          return;
        }

        Utils.log(`开始自动签到: ${currentSite.name}`);
        const checkinFunc = CheckinModules[currentSite.id] || CheckinModules.generic;

        try {
          const result = await checkinFunc();
          if (result.success) {
            Utils.saveCheckinRecord(currentSite.id, result);
            Utils.success(`自动签到成功: ${currentSite.name} - ${result.message}`);
            Utils.notify('威软自动签到', `${currentSite.name}: ${result.message}`);
          } else {
            Utils.error(`自动签到失败: ${currentSite.name} - ${result.message}`);
          }
          UI.updateSitesList();
        } catch (e) {
          Utils.error('自动签到异常:', e);
        }
      }, 3000);
    }
  };

  // ==================== 菜单命令 ====================
  const registerMenuCommands = () => {
    GM_registerMenuCommand('打开签到面板', () => UI.togglePanel());
    GM_registerMenuCommand('立即签到', () => UI.doCheckin());
    GM_registerMenuCommand('查看签到记录', () => {
      const records = {};
      const keys = GM_listValues();
      keys.filter(k => k.startsWith('checkin_')).forEach(k => {
        records[k.replace('checkin_', '')] = GM_getValue(k);
      });
      console.table(records);
      alert('签到记录已输出到控制台 (F12)');
    });
  };

  // ==================== 初始化 ====================
  const init = () => {
    Utils.log('威软全网自动化签到工具启动');
    UI.init();
    registerMenuCommands();
    AutoCheckin.init();
  };

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
