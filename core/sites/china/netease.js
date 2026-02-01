/**
 * 威软全网自动化工具 - 网易云音乐签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class NeteaseCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = '网易云音乐';
    this.id = 'netease_music';
    this.domain = 'music.163.com';
  }

  /**
   * 执行签到
   */
  async checkin(cookie) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // PC端签到
      const pcResult = await this.signPC(cookie);

      // 移动端签到
      const mobileResult = await this.signMobile(cookie);

      // 听歌任务
      const listenResult = await this.listenTask(cookie);

      const results = {
        success: pcResult.success || mobileResult.success,
        message: this._formatMessage(pcResult, mobileResult, listenResult),
        details: {
          pc: pcResult,
          mobile: mobileResult,
          listen: listenResult
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
   * PC端签到
   */
  async signPC(cookie) {
    try {
      const url = 'https://music.163.com/api/point/dailyTask';
      const body = new URLSearchParams({
        type: '0'  // PC端
      });

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://music.163.com/'
        }
      });

      if (response && response.code === 200) {
        const point = response.point || 0;
        return {
          success: true,
          message: `PC签到获得 ${point} 积分`,
          point: point
        };
      }

      // 已签到
      if (response?.code === -2) {
        return {
          success: true,
          message: 'PC端今日已签到',
          alreadySigned: true
        };
      }

      return {
        success: false,
        message: response?.message || response?.msg || 'PC签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 移动端签到
   */
  async signMobile(cookie) {
    try {
      const url = 'https://music.163.com/api/point/dailyTask';
      const body = new URLSearchParams({
        type: '1'  // 移动端
      });

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://music.163.com/'
        }
      });

      if (response && response.code === 200) {
        const point = response.point || 0;
        return {
          success: true,
          message: `移动端签到获得 ${point} 积分`,
          point: point
        };
      }

      // 已签到
      if (response?.code === -2) {
        return {
          success: true,
          message: '移动端今日已签到',
          alreadySigned: true
        };
      }

      return {
        success: false,
        message: response?.message || response?.msg || '移动端签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 听歌任务
   */
  async listenTask(cookie) {
    try {
      const url = 'https://music.163.com/weapi/point/dailyTask';
      const body = {
        type: '0'
      };

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://music.163.com/'
        }
      });

      if (response && response.code === 200) {
        return {
          success: true,
          message: '听歌任务完成',
          data: response
        };
      }

      return {
        success: false,
        message: '听歌任务失败'
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
  _formatMessage(pc, mobile, listen) {
    const messages = [];
    if (pc.success) messages.push(pc.message);
    if (mobile.success) messages.push(mobile.message);
    if (listen.success) messages.push(listen.message);

    return messages.length > 0 ? messages.join(', ') : '所有签到项失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(cookie) {
    try {
      const url = 'https://music.163.com/api/v1/user/info';
      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      return {
        isLoggedIn: response && response.code === 200 && response.userPoint,
        userInfo: response?.userPoint
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
  module.exports = NeteaseCheckin;
}
if (typeof window !== 'undefined') {
  window.NeteaseCheckin = NeteaseCheckin;
}
