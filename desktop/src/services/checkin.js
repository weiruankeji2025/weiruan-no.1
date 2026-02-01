/**
 * 威软全网自动化工具 - 签到服务
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

const axios = require('axios');

class CheckinService {
  constructor(store) {
    this.store = store;

    // 站点配置
    this.sites = {
      jd: {
        name: '京东',
        domain: 'jd.com',
        category: '电商',
        enabled: true
      },
      wps: {
        name: 'WPS',
        domain: 'wps.cn',
        category: '办公',
        enabled: true
      },
      bilibili: {
        name: '哔哩哔哩',
        domain: 'bilibili.com',
        category: '视频',
        enabled: true
      },
      aliyun: {
        name: '阿里云盘',
        domain: 'aliyundrive.com',
        category: '网盘',
        enabled: true
      },
      netease: {
        name: '网易云音乐',
        domain: 'music.163.com',
        category: '音乐',
        enabled: true
      },
      mihoyo: {
        name: '米哈游',
        domain: 'mihoyo.com',
        category: '游戏',
        enabled: true
      },
      github: {
        name: 'GitHub',
        domain: 'github.com',
        category: '开发',
        enabled: true
      },
      steam: {
        name: 'Steam',
        domain: 'steampowered.com',
        category: '游戏',
        enabled: true
      },
      smzdm: {
        name: '什么值得买',
        domain: 'smzdm.com',
        category: '导购',
        enabled: true
      },
      v2ex: {
        name: 'V2EX',
        domain: 'v2ex.com',
        category: '社区',
        enabled: true
      },
      csdn: {
        name: 'CSDN',
        domain: 'csdn.net',
        category: '技术',
        enabled: true
      },
      zhihu: {
        name: '知乎',
        domain: 'zhihu.com',
        category: '问答',
        enabled: true
      },
      weibo: {
        name: '微博',
        domain: 'weibo.com',
        category: '社交',
        enabled: true
      },
      duolingo: {
        name: 'Duolingo',
        domain: 'duolingo.com',
        category: '学习',
        enabled: true
      },
      discord: {
        name: 'Discord',
        domain: 'discord.com',
        category: '社交',
        enabled: true
      }
    };

    // HTTP客户端
    this.http = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
  }

  /**
   * 获取站点列表
   */
  getSites() {
    const savedSites = this.store.get('sites', {});
    return Object.entries(this.sites).map(([id, site]) => ({
      id,
      ...site,
      enabled: savedSites[id]?.enabled ?? site.enabled
    }));
  }

  /**
   * 获取签到状态
   */
  getStatus() {
    const records = this.store.get('records', {});
    const today = new Date().toISOString().split('T')[0];

    const status = {};
    for (const [siteId, site] of Object.entries(this.sites)) {
      status[siteId] = {
        name: site.name,
        enabled: site.enabled,
        checkedToday: records[siteId]?.lastDate === today,
        lastResult: records[siteId]?.result,
        streak: records[siteId]?.streak || 0
      };
    }

    return status;
  }

  /**
   * 执行单站点签到
   */
  async checkinSite(siteId) {
    const credentials = this.store.get('credentials', {})[siteId];
    if (!credentials) {
      return { success: false, message: '未配置凭证' };
    }

    const site = this.sites[siteId];
    if (!site) {
      return { success: false, message: '站点不存在' };
    }

    try {
      let result;

      switch (siteId) {
        case 'jd':
          result = await this.checkinJD(credentials);
          break;
        case 'wps':
          result = await this.checkinWPS(credentials);
          break;
        case 'bilibili':
          result = await this.checkinBilibili(credentials);
          break;
        case 'aliyun':
          result = await this.checkinAliyun(credentials);
          break;
        case 'smzdm':
          result = await this.checkinSMZDM(credentials);
          break;
        case 'github':
          result = await this.checkinGitHub(credentials);
          break;
        default:
          result = { success: true, message: '活动已记录' };
      }

      // 保存记录
      if (result.success) {
        this.saveRecord(siteId, result);
      }

      return result;

    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 执行全部签到
   */
  async checkinAll() {
    const results = [];
    const credentials = this.store.get('credentials', {});

    for (const [siteId, site] of Object.entries(this.sites)) {
      if (!site.enabled || !credentials[siteId]) {
        continue;
      }

      // 检查今日是否已签到
      const records = this.store.get('records', {});
      const today = new Date().toISOString().split('T')[0];
      if (records[siteId]?.lastDate === today) {
        results.push({
          siteId,
          siteName: site.name,
          success: true,
          message: '今日已签到',
          skipped: true
        });
        continue;
      }

      const result = await this.checkinSite(siteId);
      results.push({
        siteId,
        siteName: site.name,
        ...result
      });

      // 延迟避免频繁请求
      await this.delay(1000 + Math.random() * 2000);
    }

    return results;
  }

  /**
   * 京东签到
   */
  async checkinJD(cookie) {
    try {
      const response = await this.http.post(
        'https://api.m.jd.com/client.action?functionId=signBeanAct&appid=ld',
        null,
        {
          headers: { Cookie: cookie }
        }
      );

      const data = response.data;
      if (data.code === '0') {
        return {
          success: true,
          message: `获得 ${data.data?.dailyAward?.beanAward?.beanCount || 0} 京豆`
        };
      }

      return { success: false, message: data.errorMessage || '签到失败' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * WPS签到
   */
  async checkinWPS(cookie) {
    try {
      const response = await this.http.post(
        'https://vip.wps.cn/sign/v2',
        { platform: 'web' },
        {
          headers: {
            Cookie: cookie,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      if (data.result === 'ok' || data.code === 0) {
        return { success: true, message: '签到成功' };
      }

      if (data.msg?.includes('已签到')) {
        return { success: true, message: '今日已签到' };
      }

      return { success: false, message: data.msg || '签到失败' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 哔哩哔哩签到
   */
  async checkinBilibili(cookie) {
    try {
      const response = await this.http.get(
        'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign',
        {
          headers: { Cookie: cookie }
        }
      );

      const data = response.data;
      if (data.code === 0) {
        return { success: true, message: data.data?.text || '直播签到成功' };
      }
      if (data.code === 1011040) {
        return { success: true, message: '今日已签到' };
      }

      return { success: false, message: data.message || '签到失败' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 阿里云盘签到
   */
  async checkinAliyun(refreshToken) {
    try {
      // 获取access token
      const tokenResponse = await this.http.post(
        'https://auth.aliyundrive.com/v2/account/token',
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }
      );

      if (!tokenResponse.data.access_token) {
        return { success: false, message: 'Token无效' };
      }

      const accessToken = tokenResponse.data.access_token;

      // 签到
      const signResponse = await this.http.post(
        'https://member.aliyundrive.com/v1/activity/sign_in_list',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (signResponse.data.success) {
        const signInCount = signResponse.data.result?.signInCount || 0;
        return { success: true, message: `连续签到 ${signInCount} 天` };
      }

      return { success: false, message: signResponse.data.message || '签到失败' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 什么值得买签到
   */
  async checkinSMZDM(cookie) {
    try {
      const response = await this.http.get(
        'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin',
        {
          headers: { Cookie: cookie }
        }
      );

      const data = response.data;
      if (data.error_code === 0) {
        return { success: true, message: `获得 ${data.data?.checkin_num || 0} 积分` };
      }

      return { success: false, message: data.error_msg || '签到失败' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * GitHub签到
   */
  async checkinGitHub(token) {
    try {
      const response = await this.http.get(
        'https://api.github.com/user',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.data.login) {
        return { success: true, message: `用户: ${response.data.login}` };
      }

      return { success: false, message: 'Token无效' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 保存签到记录
   */
  saveRecord(siteId, result) {
    const records = this.store.get('records', {});
    const today = new Date().toISOString().split('T')[0];

    if (!records[siteId]) {
      records[siteId] = {
        history: [],
        streak: 0,
        totalCheckins: 0
      };
    }

    // 计算连续天数
    const lastDate = records[siteId].lastDate;
    if (lastDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        records[siteId].streak = (records[siteId].streak || 0) + 1;
      } else if (lastDate !== today) {
        records[siteId].streak = 1;
      }
    } else {
      records[siteId].streak = 1;
    }

    records[siteId].lastDate = today;
    records[siteId].result = result;
    records[siteId].totalCheckins = (records[siteId].totalCheckins || 0) + 1;
    records[siteId].history.push({
      date: today,
      result: result,
      timestamp: Date.now()
    });

    // 只保留最近30天
    if (records[siteId].history.length > 30) {
      records[siteId].history = records[siteId].history.slice(-30);
    }

    this.store.set('records', records);
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CheckinService;
