/**
 * 威软全网自动化工具 - 米哈游签到模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class MihoyoCheckin {
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
    this.name = '米哈游';
    this.id = 'mihoyo';
    this.domain = 'mihoyo.com';

    // 游戏配置
    this.games = {
      genshin: {
        name: '原神',
        actId: 'e202311201442471',
        signUrl: 'https://sg-hk4e-api.hoyolab.com/event/sol/sign',
        infoUrl: 'https://sg-hk4e-api.hoyolab.com/event/sol/info'
      },
      starrail: {
        name: '崩坏：星穹铁道',
        actId: 'e202303301540311',
        signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
        infoUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/info'
      },
      honkai: {
        name: '崩坏3',
        actId: 'e202110291205111',
        signUrl: 'https://sg-public-api.hoyolab.com/event/mani/sign',
        infoUrl: 'https://sg-public-api.hoyolab.com/event/mani/info'
      },
      zzz: {
        name: '绝区零',
        actId: 'e202406031448091',
        signUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign',
        infoUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info'
      }
    };
  }

  /**
   * 执行签到
   */
  async checkin(cookie, gameIds = ['genshin', 'starrail']) {
    this.logger.info(`开始 ${this.name} 签到...`);

    try {
      const results = {};
      let successCount = 0;

      for (const gameId of gameIds) {
        const game = this.games[gameId];
        if (!game) continue;

        const result = await this.signGame(cookie, gameId);
        results[gameId] = result;
        if (result.success) successCount++;

        // 延迟避免频繁请求
        await this._delay(2000);
      }

      const allResults = {
        success: successCount > 0,
        message: this._formatMessage(results),
        details: results,
        timestamp: Date.now()
      };

      if (allResults.success) {
        this.logger.success(`${this.name} 签到成功: ${allResults.message}`);
      } else {
        this.logger.warn(`${this.name} 签到失败: ${allResults.message}`);
      }

      return allResults;

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
   * 游戏签到
   */
  async signGame(cookie, gameId) {
    const game = this.games[gameId];
    if (!game) {
      return { success: false, message: '未知游戏' };
    }

    try {
      // 获取签到信息
      const infoResult = await this.getSignInfo(cookie, game);

      // 如果已签到
      if (infoResult.isSign) {
        return {
          success: true,
          message: `${game.name} 今日已签到 (累计${infoResult.totalSignDay}天)`,
          alreadySigned: true,
          totalSignDay: infoResult.totalSignDay
        };
      }

      // 执行签到
      const url = `${game.signUrl}?act_id=${game.actId}`;
      const body = {
        act_id: game.actId
      };

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Referer': 'https://act.hoyolab.com/',
          'Origin': 'https://act.hoyolab.com',
          'x-rpc-app_version': '2.34.1',
          'x-rpc-client_type': '4',
          'x-rpc-language': 'zh-cn'
        }
      });

      if (response && (response.retcode === 0 || response.data?.code === 'ok')) {
        return {
          success: true,
          message: `${game.name} 签到成功`,
          data: response.data
        };
      }

      // 已签到状态码
      if (response?.retcode === -5003) {
        return {
          success: true,
          message: `${game.name} 今日已签到`,
          alreadySigned: true
        };
      }

      return {
        success: false,
        message: `${game.name}: ${response?.message || '签到失败'}`
      };

    } catch (error) {
      return {
        success: false,
        message: `${game.name}: ${error.message}`
      };
    }
  }

  /**
   * 获取签到信息
   */
  async getSignInfo(cookie, game) {
    try {
      const url = `${game.infoUrl}?act_id=${game.actId}`;

      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET',
        headers: {
          'Referer': 'https://act.hoyolab.com/',
          'x-rpc-language': 'zh-cn'
        }
      });

      if (response && response.retcode === 0) {
        return {
          isSign: response.data?.is_sign || false,
          totalSignDay: response.data?.total_sign_day || 0,
          today: response.data?.today
        };
      }

      return {
        isSign: false,
        totalSignDay: 0
      };

    } catch (error) {
      return {
        isSign: false,
        totalSignDay: 0,
        error: error.message
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
  _formatMessage(results) {
    const messages = [];
    for (const [gameId, result] of Object.entries(results)) {
      if (result.success) {
        messages.push(result.message);
      }
    }
    return messages.length > 0 ? messages.join(', ') : '所有游戏签到失败';
  }

  /**
   * 检查登录状态
   */
  async checkLogin(cookie) {
    try {
      const url = 'https://bbs-api-os.hoyolab.com/community/user/wapi/getUserFullInfo';
      const response = await this.http.requestWithCookie(url, cookie, {
        method: 'GET'
      });

      return {
        isLoggedIn: response && response.retcode === 0,
        userInfo: response?.data?.user_info
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
  module.exports = MihoyoCheckin;
}
if (typeof window !== 'undefined') {
  window.MihoyoCheckin = MihoyoCheckin;
}
