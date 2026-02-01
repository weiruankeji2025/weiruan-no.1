/**
 * 威软全网自动化工具 - Discord签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class DiscordCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = 'Discord';
    this.id = 'discord';
    this.domain = 'discord.com';
  }

  /**
   * 执行签到 (Discord无传统签到，记录活动状态)
   */
  async checkin(token) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // 获取用户信息
      const userResult = await this.getUserInfo(token);
      if (!userResult.success) {
        return {
          success: false,
          message: userResult.message,
          timestamp: Date.now()
        };
      }

      // 获取服务器列表
      const guildsResult = await this.getGuilds(token);

      // 获取私信
      const dmsResult = await this.getDMs(token);

      const results = {
        success: true,
        message: this._formatMessage(userResult, guildsResult, dmsResult),
        details: {
          user: userResult,
          guilds: guildsResult,
          dms: dmsResult
        },
        timestamp: Date.now()
      };

      this.logger.success(`${this.name} 签到成功: ${results.message}`);
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
   * 获取用户信息
   */
  async getUserInfo(token) {
    try {
      const url = 'https://discord.com/api/v10/users/@me';

      const response = await this.http.get(url, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (response && response.id) {
        return {
          success: true,
          userId: response.id,
          username: response.username,
          discriminator: response.discriminator,
          email: response.email,
          verified: response.verified,
          message: `用户: ${response.username}#${response.discriminator}`
        };
      }

      return {
        success: false,
        message: 'Token无效或已过期'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 获取服务器列表
   */
  async getGuilds(token) {
    try {
      const url = 'https://discord.com/api/v10/users/@me/guilds';

      const response = await this.http.get(url, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (Array.isArray(response)) {
        return {
          success: true,
          count: response.length,
          guilds: response.slice(0, 5).map(g => g.name),
          message: `已加入 ${response.length} 个服务器`
        };
      }

      return {
        success: false,
        message: '获取服务器失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 获取私信
   */
  async getDMs(token) {
    try {
      const url = 'https://discord.com/api/v10/users/@me/channels';

      const response = await this.http.get(url, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (Array.isArray(response)) {
        return {
          success: true,
          count: response.length,
          message: `${response.length} 个私信会话`
        };
      }

      return {
        success: true,
        count: 0,
        message: '无私信'
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
  _formatMessage(user, guilds, dms) {
    const messages = [];
    if (user.success) messages.push(user.message);
    if (guilds.success) messages.push(guilds.message);
    if (dms.success) messages.push(dms.message);

    return messages.join(', ');
  }

  /**
   * 检查登录状态
   */
  async checkLogin(token) {
    const result = await this.getUserInfo(token);
    return {
      isLoggedIn: result.success,
      userInfo: result,
      error: result.success ? null : result.message
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiscordCheckin;
}
if (typeof window !== 'undefined') {
  window.DiscordCheckin = DiscordCheckin;
}
