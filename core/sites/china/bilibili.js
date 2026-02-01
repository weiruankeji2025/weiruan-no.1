/**
 * 威软全网自动化工具 - 哔哩哔哩签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class BilibiliCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = '哔哩哔哩';
    this.id = 'bilibili';
    this.domain = 'bilibili.com';
  }

  /**
   * 执行签到
   */
  async checkin(cookie) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // 获取CSRF token
      const csrf = this._extractCSRF(cookie);

      // 主站签到
      const liveResult = await this.signLive(cookie, csrf);

      // 漫画签到
      const mangaResult = await this.signManga(cookie, csrf);

      // 大会员签到
      const vipResult = await this.signVip(cookie, csrf);

      // 每日经验
      const expResult = await this.watchVideo(cookie, csrf);

      const results = {
        success: liveResult.success || mangaResult.success || vipResult.success,
        message: this._formatMessage(liveResult, mangaResult, vipResult, expResult),
        details: {
          live: liveResult,
          manga: mangaResult,
          vip: vipResult,
          exp: expResult
        },
        timestamp: Date.now()
      };

      if (results.success) {
        this.logger.success(`${this.name} 签到成功: ${results.message}`);
      } else {
        this.logger.warn(`${this.name} 签到失败: ${results.message}`);
      }

      return results;

    } catch (error) {
      this.logger.error(`${this.name} 签到异常:`, error.message);
      return {
        success: false,
        message: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 提取CSRF token
   */
  _extractCSRF(cookie) {
    const match = cookie.match(/bili_jct=([^;]+)/);
    return match ? match[1] : '';
  }

  /**
   * 直播签到
   */
  async signLive(cookie, csrf) {
    try {
      const url = 'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET',
        headers: {
          'Referer': 'https://link.bilibili.com/p/center/index'
        }
      });

      if (response && response.code === 0) {
        const text = response.data?.text || '签到成功';
        const bonus = response.data?.specialText || '';
        return {
          success: true,
          message: `直播签到: ${text} ${bonus}`.trim(),
          data: response.data
        };
      }

      // 已签到
      if (response?.code === 1011040) {
        return {
          success: true,
          message: '直播今日已签到',
          alreadySigned: true
        };
      }

      return {
        success: false,
        message: response?.message || '直播签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 漫画签到
   */
  async signManga(cookie, csrf) {
    try {
      const url = 'https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn';
      const body = {
        platform: 'android'
      };

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body,
        headers: {
          'Referer': 'https://manga.bilibili.com/'
        }
      });

      if (response && response.code === 0) {
        return {
          success: true,
          message: '漫画签到成功',
          data: response.data
        };
      }

      // 已签到
      if (response?.msg?.includes('已签到') || response?.msg?.includes('clockin')) {
        return {
          success: true,
          message: '漫画今日已签到',
          alreadySigned: true
        };
      }

      return {
        success: false,
        message: response?.msg || '漫画签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 大会员签到
   */
  async signVip(cookie, csrf) {
    try {
      const url = 'https://api.bilibili.com/x/vip/privilege/receive';
      const body = new URLSearchParams({
        type: '1',
        csrf: csrf
      });

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://account.bilibili.com/account/big/myPackage'
        }
      });

      if (response && response.code === 0) {
        return {
          success: true,
          message: '大会员签到成功',
          data: response.data
        };
      }

      return {
        success: false,
        message: response?.message || '大会员签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 观看视频获取经验
   */
  async watchVideo(cookie, csrf) {
    try {
      const url = 'https://api.bilibili.com/x/click-interface/web/heartbeat';
      const body = new URLSearchParams({
        aid: '2',
        cid: '62131',
        played_time: '300',
        csrf: csrf
      });

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response && response.code === 0) {
        return {
          success: true,
          message: '观看视频任务完成',
          data: response.data
        };
      }

      return {
        success: false,
        message: response?.message || '观看视频失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 格式化消息
   */
  _formatMessage(live, manga, vip, exp) {
    const messages = [];
    if (live.success) messages.push(live.message);
    if (manga.success) messages.push(manga.message);
    if (vip.success) messages.push(vip.message);
    if (exp.success) messages.push(exp.message);

    return messages.length > 0 ? messages.join(', ') : '所有签到项失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(cookie) {
    try {
      const url = 'https://api.bilibili.com/x/web-interface/nav';
      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      return {
        isLoggedIn: response && response.code === 0 && response.data?.isLogin,
        userInfo: response?.data
      };

    } catch (error) {
      return {
        isLoggedIn: false,
        error: error.message
      };
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BilibiliCheckin;
}
if (typeof window !== 'undefined') {
  window.BilibiliCheckin = BilibiliCheckin;
}
