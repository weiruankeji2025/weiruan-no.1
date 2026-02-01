/**
 * 威软全网自动化工具 - 京东签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class JDCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = '京东';
    this.id = 'jd';
    this.domain = 'jd.com';
  }

  /**
   * 执行签到
   */
  async checkin(cookie) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // 京东签到 - 京东会员签到
      const signResult = await this.signBean(cookie);

      // 京东金融签到
      const jrResult = await this.signJR(cookie);

      // 京东商城签到
      const mallResult = await this.signMall(cookie);

      const results = {
        success: signResult.success || jrResult.success || mallResult.success,
        message: this._formatMessage(signResult, jrResult, mallResult),
        details: {
          bean: signResult,
          jr: jrResult,
          mall: mallResult
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
   * 京豆签到
   */
  async signBean(cookie) {
    try {
      const url = 'https://api.m.jd.com/client.action';
      const params = new URLSearchParams({
        functionId: 'signBeanAct',
        appid: 'ld',
        client: 'apple',
        clientVersion: '10.0.4',
        networkType: 'wifi',
        osVersion: '14.6',
        uuid: '',
        openudid: ''
      });

      const response = await this.http.requestWithCookie(
        `${url}?${params.toString()}`,
        cookie,
        { method: 'POST' }
      );

      if (response && response.code === '0') {
        const dailyAward = response.data?.dailyAward?.beanAward?.beanCount || 0;
        return {
          success: true,
          message: `获得 ${dailyAward} 京豆`,
          beans: dailyAward
        };
      }

      return {
        success: false,
        message: response?.errorMessage || '签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 京东金融签到
   */
  async signJR(cookie) {
    try {
      const url = 'https://ms.jr.jd.com/gw/generic/hy/h5/m/signIn';
      const body = {
        reqData: JSON.stringify({ channelSource: 'JRAPP' })
      };

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body
      });

      if (response && response.resultCode === '0') {
        return {
          success: true,
          message: '京东金融签到成功',
          data: response.resultData
        };
      }

      return {
        success: false,
        message: response?.resultMessage || '京东金融签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 京东商城签到
   */
  async signMall(cookie) {
    try {
      const url = 'https://api.m.jd.com/client.action?functionId=userSignIn';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: { body: JSON.stringify({}) }
      });

      if (response && response.code === 0) {
        return {
          success: true,
          message: '商城签到成功',
          data: response.data
        };
      }

      return {
        success: false,
        message: '商城签到失败'
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
  _formatMessage(bean, jr, mall) {
    const messages = [];
    if (bean.success) messages.push(bean.message);
    if (jr.success) messages.push(jr.message);
    if (mall.success) messages.push(mall.message);

    return messages.length > 0 ? messages.join(', ') : '所有签到项失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(cookie) {
    try {
      const url = 'https://api.m.jd.com/client.action?functionId=newUserInfo';
      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      return {
        isLoggedIn: response && response.code === '0',
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
  module.exports = JDCheckin;
}
if (typeof window !== 'undefined') {
  window.JDCheckin = JDCheckin;
}
