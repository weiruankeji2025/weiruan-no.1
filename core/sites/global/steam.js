/**
 * 威软全网自动化工具 - Steam签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class SteamCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = 'Steam';
    this.id = 'steam';
    this.domain = 'steampowered.com';
  }

  /**
   * 执行签到
   */
  async checkin(cookie) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      // 获取用户信息
      const userResult = await this.getUserInfo(cookie);
      if (!userResult.success) {
        return {
          success: false,
          message: userResult.message,
          timestamp: Date.now()
        };
      }

      // 点数商店签到
      const pointsResult = await this.claimPoints(cookie);

      // 发现队列
      const queueResult = await this.exploreQueue(cookie);

      // 社区奖励
      const communityResult = await this.checkCommunityRewards(cookie);

      const results = {
        success: userResult.success,
        message: this._formatMessage(userResult, pointsResult, queueResult, communityResult),
        details: {
          user: userResult,
          points: pointsResult,
          queue: queueResult,
          community: communityResult
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
   * 获取用户信息
   */
  async getUserInfo(cookie) {
    try {
      const url = 'https://store.steampowered.com/account/';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (typeof response === 'string') {
        // 解析用户名
        const usernameMatch = response.match(/data-miniprofile="(\d+)"/);
        const walletMatch = response.match(/class="accountBalance.*?">([\d.,]+)/);

        if (usernameMatch) {
          return {
            success: true,
            steamId: usernameMatch[1],
            walletBalance: walletMatch ? walletMatch[1] : '0',
            message: `Steam ID: ${usernameMatch[1]}`
          };
        }
      }

      return {
        success: false,
        message: '未登录或Cookie已过期'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 领取Steam点数
   */
  async claimPoints(cookie) {
    try {
      const url = 'https://store.steampowered.com/points/shop';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      if (typeof response === 'string') {
        const pointsMatch = response.match(/g_loyaltyPointsBalance\s*=\s*(\d+)/);
        const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

        return {
          success: true,
          points: points,
          message: `当前点数: ${points}`
        };
      }

      return {
        success: true,
        message: '点数商店已访问'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 探索发现队列
   */
  async exploreQueue(cookie) {
    try {
      // 获取sessionid
      const sessionMatch = cookie.match(/sessionid=([^;]+)/);
      const sessionId = sessionMatch ? sessionMatch[1] : '';

      if (!sessionId) {
        return {
          success: false,
          message: '无法获取sessionId'
        };
      }

      // 生成发现队列
      const generateUrl = 'https://store.steampowered.com/explore/generatenewdiscoveryqueue';
      const generateBody = new URLSearchParams({
        sessionid: sessionId,
        queuetype: '0'
      });

      const generateResponse = await this.http.requestWithCookie(generateUrl, cookie, {
        method: 'POST',
        body: generateBody.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (generateResponse && generateResponse.queue) {
        // 清除队列
        for (const appId of generateResponse.queue.slice(0, 3)) {
          await this._clearQueueItem(cookie, sessionId, appId);
          await this._delay(500);
        }

        return {
          success: true,
          message: `已浏览 ${Math.min(3, generateResponse.queue.length)} 款游戏`,
          queue: generateResponse.queue.slice(0, 3)
        };
      }

      return {
        success: false,
        message: '生成发现队列失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 清除队列项目
   */
  async _clearQueueItem(cookie, sessionId, appId) {
    try {
      const url = 'https://store.steampowered.com/app/7';
      const body = new URLSearchParams({
        sessionid: sessionId,
        appid_to_clear_from_queue: appId.toString()
      });

      await this.http.requestWithCookie(
        `https://store.steampowered.com/app/${appId}`,
        cookie,
        {
          method: 'POST',
          body: body.toString(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查社区奖励
   */
  async checkCommunityRewards(cookie) {
    try {
      const url = 'https://steamcommunity.com/my/badges';

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      if (typeof response === 'string') {
        const levelMatch = response.match(/friendPlayerLevelNum">(\d+)</);
        const level = levelMatch ? parseInt(levelMatch[1]) : 0;

        return {
          success: true,
          level: level,
          message: `Steam等级: ${level}`
        };
      }

      return {
        success: true,
        message: '社区状态已检查'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 延迟函数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化消息
   */
  _formatMessage(user, points, queue, community) {
    const messages = [];
    if (user.success) messages.push(user.message);
    if (points.success) messages.push(points.message);
    if (queue.success) messages.push(queue.message);
    if (community.success) messages.push(community.message);

    return messages.length > 0 ? messages.join(', ') : '签到信息获取失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(cookie) {
    const result = await this.getUserInfo(cookie);
    return {
      isLoggedIn: result.success,
      userInfo: result,
      error: result.success ? null : result.message
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SteamCheckin;
}
if (typeof window !== 'undefined') {
  window.SteamCheckin = SteamCheckin;
}
