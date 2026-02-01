/**
 * 威软全网自动化工具 - Firefox扩展后台脚本
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

// 站点配置
const SITES_CONFIG = {
  jd: {
    name: '京东',
    domain: 'jd.com',
    checkinUrl: 'https://api.m.jd.com/client.action?functionId=signBeanAct&appid=ld',
    method: 'POST',
    enabled: true
  },
  wps: {
    name: 'WPS',
    domain: 'wps.cn',
    checkinUrl: 'https://vip.wps.cn/sign/v2',
    method: 'POST',
    enabled: true
  },
  bilibili: {
    name: '哔哩哔哩',
    domain: 'bilibili.com',
    checkinUrl: 'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign',
    method: 'GET',
    enabled: true
  },
  smzdm: {
    name: '什么值得买',
    domain: 'smzdm.com',
    checkinUrl: 'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin',
    method: 'GET',
    enabled: true
  },
  v2ex: {
    name: 'V2EX',
    domain: 'v2ex.com',
    checkinUrl: 'https://www.v2ex.com/mission/daily',
    method: 'GET',
    enabled: true
  },
  csdn: {
    name: 'CSDN',
    domain: 'csdn.net',
    checkinUrl: 'https://me.csdn.net/api/LuckyDraw_v2/signIn',
    method: 'POST',
    enabled: true
  },
  github: {
    name: 'GitHub',
    domain: 'github.com',
    enabled: true
  },
  steam: {
    name: 'Steam',
    domain: 'steampowered.com',
    enabled: true
  }
};

// 初始化
browser.runtime.onInstalled.addListener(async () => {
  console.log('[威软签到] Firefox扩展已安装');

  const config = await browser.storage.local.get('config');
  if (!config.config) {
    await browser.storage.local.set({
      config: {
        autoCheckin: true,
        checkTime: '08:00',
        showNotification: true,
        sites: SITES_CONFIG
      }
    });
  }

  setupAlarm();
});

// 设置定时签到
function setupAlarm() {
  browser.alarms.create('dailyCheckin', {
    periodInMinutes: 60
  });
}

// 定时任务触发
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyCheckin') {
    console.log('[威软签到] 执行定时签到检查');
    const config = await browser.storage.local.get('config');
    if (config.config?.autoCheckin) {
      await performAutoCheckin();
    }
  }
});

// 获取域名的Cookie
async function getCookiesForDomain(domain) {
  try {
    const cookies = await browser.cookies.getAll({ domain: domain });
    if (cookies.length === 0) return null;
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  } catch {
    return null;
  }
}

// 执行签到
async function performCheckin(siteId, cookies) {
  const site = SITES_CONFIG[siteId];
  if (!site || !site.checkinUrl) {
    return { success: false, message: '站点不支持或URL未配置' };
  }

  try {
    const response = await fetch(site.checkinUrl, {
      method: site.method || 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return parseCheckinResult(siteId, data);
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 解析签到结果
function parseCheckinResult(siteId, data) {
  switch (siteId) {
    case 'jd':
      if (data.code === '0') {
        return { success: true, message: `获得 ${data.data?.dailyAward?.beanAward?.beanCount || 0} 京豆` };
      }
      return { success: false, message: data.errorMessage || '签到失败' };

    case 'bilibili':
      if (data.code === 0) {
        return { success: true, message: data.data?.text || '签到成功' };
      }
      if (data.code === 1011040) {
        return { success: true, message: '今日已签到' };
      }
      return { success: false, message: data.message || '签到失败' };

    case 'smzdm':
      if (data.error_code === 0) {
        return { success: true, message: `获得 ${data.data?.checkin_num || 0} 积分` };
      }
      return { success: false, message: data.error_msg || '签到失败' };

    default:
      return { success: true, message: '操作完成' };
  }
}

// 执行自动签到
async function performAutoCheckin() {
  const today = new Date().toISOString().split('T')[0];
  const records = (await browser.storage.local.get('records')).records || {};

  for (const [siteId, site] of Object.entries(SITES_CONFIG)) {
    if (!site.enabled) continue;

    if (records[siteId]?.lastDate === today) {
      continue;
    }

    try {
      const cookies = await getCookiesForDomain(site.domain);
      if (!cookies) continue;

      const result = await performCheckin(siteId, cookies);
      if (result.success) {
        records[siteId] = {
          lastDate: today,
          result: result,
          timestamp: Date.now()
        };

        showNotification(`${site.name} 签到成功`, result.message);
      }
    } catch (error) {
      console.error(`[威软签到] ${site.name} 签到失败:`, error);
    }
  }

  await browser.storage.local.set({ records });
}

// 显示通知
function showNotification(title, message) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: '威软签到 - ' + title,
    message: message
  });
}

// 监听消息
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkin') {
    performCheckinForSite(request.siteId).then(sendResponse);
    return true;
  }

  if (request.action === 'checkinAll') {
    performAutoCheckin().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'getStatus') {
    getCheckinStatus().then(sendResponse);
    return true;
  }

  if (request.action === 'getSites') {
    sendResponse(SITES_CONFIG);
    return true;
  }
});

// 为单个站点执行签到
async function performCheckinForSite(siteId) {
  const site = SITES_CONFIG[siteId];
  if (!site) {
    return { success: false, message: '站点不存在' };
  }

  const cookies = await getCookiesForDomain(site.domain);
  if (!cookies) {
    return { success: false, message: '未登录或Cookie已过期' };
  }

  const result = await performCheckin(siteId, cookies);

  if (result.success) {
    const records = (await browser.storage.local.get('records')).records || {};
    records[siteId] = {
      lastDate: new Date().toISOString().split('T')[0],
      result: result,
      timestamp: Date.now()
    };
    await browser.storage.local.set({ records });
  }

  return result;
}

// 获取签到状态
async function getCheckinStatus() {
  const records = (await browser.storage.local.get('records')).records || {};
  const today = new Date().toISOString().split('T')[0];

  const status = {};
  for (const [siteId, site] of Object.entries(SITES_CONFIG)) {
    status[siteId] = {
      name: site.name,
      enabled: site.enabled,
      checkedToday: records[siteId]?.lastDate === today,
      lastResult: records[siteId]?.result
    };
  }

  return status;
}

console.log('[威软签到] Firefox后台脚本已启动');
