/**
 * 威软全网自动化工具 - 阿里云盘签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class AliyunCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = '阿里云盘';
    this.id = 'aliyun';
    this.domain = 'aliyundrive.com';
  }

  /**
   * 执行签到
   */
  async checkin(refreshToken) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // 获取 access token
      const tokenResult = await this.getAccessToken(refreshToken);
      if (!tokenResult.success) {
        return {
          success: false,
          message: tokenResult.message,
          timestamp: Date.now()
        };
      }

      const accessToken = tokenResult.accessToken;

      // 执行签到
      const signResult = await this.sign(accessToken);

      // 领取奖励
      const rewardResult = await this.claimReward(accessToken, signResult.signInDay);

      const results = {
        success: signResult.success,
        message: this._formatMessage(signResult, rewardResult),
        details: {
          sign: signResult,
          reward: rewardResult
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
   * 获取Access Token
   */
  async getAccessToken(refreshToken) {
    try {
      const url = 'https://auth.aliyundrive.com/v2/account/token';
      const body = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      };

      const response = await this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response && response.access_token) {
        return {
          success: true,
          accessToken: response.access_token,
          refreshToken: response.refresh_token
        };
      }

      return {
        success: false,
        message: response?.message || '获取Token失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 签到
   */
  async sign(accessToken) {
    try {
      const url = 'https://member.aliyundrive.com/v1/activity/sign_in_list';
      const body = {};

      const response = await this.http.post(url, body, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response && response.success) {
        const signInDay = response.result?.signInCount || 0;
        const signInLogs = response.result?.signInLogs || [];
        const todaySign = signInLogs.find(log => log.day === signInDay);

        return {
          success: true,
          message: `连续签到 ${signInDay} 天`,
          signInDay: signInDay,
          reward: todaySign?.reward || null
        };
      }

      return {
        success: false,
        message: response?.message || '签到失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 领取奖励
   */
  async claimReward(accessToken, signInDay) {
    try {
      const url = 'https://member.aliyundrive.com/v1/activity/sign_in_reward';
      const body = {
        signInDay: signInDay
      };

      const response = await this.http.post(url, body, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response && response.success) {
        const reward = response.result || {};
        return {
          success: true,
          message: `获得 ${reward.name || '奖励'} ${reward.description || ''}`.trim(),
          reward: reward
        };
      }

      return {
        success: false,
        message: response?.message || '领取奖励失败'
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
  _formatMessage(sign, reward) {
    const messages = [];
    if (sign.success) messages.push(sign.message);
    if (reward.success) messages.push(reward.message);

    return messages.length > 0 ? messages.join(', ') : '签到失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(refreshToken) {
    try {
      const tokenResult = await this.getAccessToken(refreshToken);
      return {
        isLoggedIn: tokenResult.success,
        error: tokenResult.success ? null : tokenResult.message
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
  module.exports = AliyunCheckin;
}
if (typeof window !== 'undefined') {
  window.AliyunCheckin = AliyunCheckin;
}
