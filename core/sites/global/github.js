/**
 * 威软全网自动化工具 - GitHub签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class GitHubCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = 'GitHub';
    this.id = 'github';
    this.domain = 'github.com';
  }

  /**
   * 执行签到 (GitHub通过提交贡献来"签到")
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

      // 获取今日贡献
      const contributionResult = await this.getContributions(token, userResult.username);

      // 触发活动 (查看通知等)
      const activityResult = await this.triggerActivity(token);

      const results = {
        success: true,
        message: this._formatMessage(userResult, contributionResult, activityResult),
        details: {
          user: userResult,
          contributions: contributionResult,
          activity: activityResult
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
      const url = 'https://api.github.com/user';

      const response = await this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Weiruan-Checkin-Tool'
        }
      });

      if (response && response.login) {
        return {
          success: true,
          username: response.login,
          name: response.name,
          followers: response.followers,
          publicRepos: response.public_repos,
          message: `用户: ${response.login}`
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
   * 获取贡献信息
   */
  async getContributions(token, username) {
    try {
      const url = `https://api.github.com/users/${username}/events`;

      const response = await this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Weiruan-Checkin-Tool'
        }
      });

      if (Array.isArray(response)) {
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = response.filter(event =>
          event.created_at && event.created_at.startsWith(today)
        );

        return {
          success: true,
          todayContributions: todayEvents.length,
          message: `今日贡献 ${todayEvents.length} 次`,
          events: todayEvents.slice(0, 5)
        };
      }

      return {
        success: true,
        todayContributions: 0,
        message: '今日暂无贡献'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 触发活动 (获取通知等)
   */
  async triggerActivity(token) {
    try {
      const url = 'https://api.github.com/notifications';

      const response = await this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Weiruan-Checkin-Tool'
        }
      });

      if (Array.isArray(response)) {
        const unread = response.filter(n => n.unread).length;
        return {
          success: true,
          unreadNotifications: unread,
          message: unread > 0 ? `${unread} 条未读通知` : '无未读通知'
        };
      }

      return {
        success: true,
        unreadNotifications: 0,
        message: '活动已记录'
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
  _formatMessage(user, contributions, activity) {
    const messages = [];
    if (user.success) messages.push(user.message);
    if (contributions.success) messages.push(contributions.message);
    if (activity.success) messages.push(activity.message);

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
  module.exports = GitHubCheckin;
}
if (typeof window !== 'undefined') {
  window.GitHubCheckin = GitHubCheckin;
}
