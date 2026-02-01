/**
 * 威软全网自动化工具 - Duolingo签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class DuolingoCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = 'Duolingo';
    this.id = 'duolingo';
    this.domain = 'duolingo.com';
  }

  /**
   * 执行签到
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

      // 获取连续天数
      const streakResult = await this.getStreak(token, userResult.userId);

      // 领取宝箱奖励
      const rewardResult = await this.claimReward(token);

      const results = {
        success: true,
        message: this._formatMessage(userResult, streakResult, rewardResult),
        details: {
          user: userResult,
          streak: streakResult,
          reward: rewardResult
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
      const url = 'https://www.duolingo.com/api/1/users/me';

      const response = await this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response && response.id) {
        return {
          success: true,
          userId: response.id,
          username: response.username,
          totalXp: response.totalXp || 0,
          streak: response.streak || 0,
          gems: response.gems || 0,
          lingots: response.lingots || 0,
          message: `用户: ${response.username}, XP: ${response.totalXp || 0}`
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
   * 获取连续学习天数
   */
  async getStreak(token, userId) {
    try {
      const url = `https://www.duolingo.com/2017-06-30/users/${userId}?fields=streak,streakData`;

      const response = await this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response) {
        const streak = response.streak || 0;
        const streakExtended = response.streakData?.currentStreak?.isExtendedToday || false;

        return {
          success: true,
          streak: streak,
          extendedToday: streakExtended,
          message: `连续学习 ${streak} 天${streakExtended ? ' (今日已完成)' : ''}`
        };
      }

      return {
        success: false,
        message: '获取连续天数失败'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 领取每日奖励
   */
  async claimReward(token) {
    try {
      const url = 'https://www.duolingo.com/2017-06-30/sessions';
      const body = {
        challengeTypes: [
          'assist', 'characterIntro', 'characterMatch',
          'characterPuzzle', 'characterSelect', 'completeReverseTranslation'
        ],
        fromLanguage: 'en',
        learningLanguage: 'es',
        type: 'DAILY_REFRESH'
      };

      const response = await this.http.post(url, body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response && response.id) {
        return {
          success: true,
          sessionId: response.id,
          message: '每日任务已刷新'
        };
      }

      return {
        success: true,
        message: '奖励状态已检查'
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
  _formatMessage(user, streak, reward) {
    const messages = [];
    if (user.success) messages.push(user.message);
    if (streak.success) messages.push(streak.message);
    if (reward.success) messages.push(reward.message);

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
  module.exports = DuolingoCheckin;
}
if (typeof window !== 'undefined') {
  window.DuolingoCheckin = DuolingoCheckin;
}
