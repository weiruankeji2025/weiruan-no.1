/**
 * 威软全网自动化工具 - WPS签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class WPSCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = 'WPS';
    this.id = 'wps';
    this.domain = 'wps.cn';
  }

  /**
   * 执行签到
   */
  async checkin(cookie) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // WPS会员签到
      const memberResult = await this.signMember(cookie);

      // WPS稻壳签到
      const doceResult = await this.signDoce(cookie);

      // WPS小程序签到
      const miniResult = await this.signMini(cookie);

      const results = {
        success: memberResult.success || doceResult.success || miniResult.success,
        message: this._formatMessage(memberResult, doceResult, miniResult),
        details: {
          member: memberResult,
          doce: doceResult,
          mini: miniResult
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
   * WPS会员签到
   */
  async signMember(cookie) {
    try {
      const url = 'https://vip.wps.cn/sign/v2';
      const body = {
        platform: 'web',
        client_version: '1.0.0'
      };

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://vip.wps.cn',
          'Referer': 'https://vip.wps.cn/'
        }
      });

      if (response && (response.result === 'ok' || response.code === 0)) {
        const reward = response.data?.reward || response.data?.member_point || 0;
        return {
          success: true,
          message: `获得 ${reward} 积分`,
          reward: reward
        };
      }

      // 已签到
      if (response?.msg?.includes('已签到') || response?.msg?.includes('already')) {
        return {
          success: true,
          message: '今日已签到',
          alreadySigned: true
        };
      }

      return {
        success: false,
        message: response?.msg || response?.message || '签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 稻壳签到
   */
  async signDoce(cookie) {
    try {
      const url = 'https://doce.wps.cn/api/v1/sign/checkin';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://doce.wps.cn',
          'Referer': 'https://doce.wps.cn/'
        }
      });

      if (response && response.code === 0) {
        return {
          success: true,
          message: '稻壳签到成功',
          data: response.data
        };
      }

      return {
        success: false,
        message: response?.msg || '稻壳签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 小程序签到
   */
  async signMini(cookie) {
    try {
      const url = 'https://zt.wps.cn/2018/docer_check/api/checkin';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response && response.result === 'ok') {
        const days = response.data?.continuous_sign_days || 1;
        return {
          success: true,
          message: `连续签到 ${days} 天`,
          days: days
        };
      }

      return {
        success: false,
        message: response?.msg || '小程序签到失败'
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
  _formatMessage(member, doce, mini) {
    const messages = [];
    if (member.success) messages.push(`会员: ${member.message}`);
    if (doce.success) messages.push(`稻壳: ${doce.message}`);
    if (mini.success) messages.push(`小程序: ${mini.message}`);

    return messages.length > 0 ? messages.join(', ') : '所有签到项失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(cookie) {
    try {
      const url = 'https://account.wps.cn/api/users';
      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      return {
        isLoggedIn: response && response.data && response.data.userid,
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
  module.exports = WPSCheckin;
}
if (typeof window !== 'undefined') {
  window.WPSCheckin = WPSCheckin;
}
