/**
 * 威软全网自动化工具 - 存储工具模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class WeiruanStorage {
  constructor(prefix = 'weiruan_checkin_') {
    this.prefix = prefix;
    this.storage = this._detectStorage();
  }

  /**
   * 检测可用的存储方式
   */
  _detectStorage() {
    // 浏览器环境
    if (typeof localStorage !== 'undefined') {
      return {
        type: 'localStorage',
        get: (key) => {
          const value = localStorage.getItem(this.prefix + key);
          try {
            return value ? JSON.parse(value) : null;
          } catch {
            return value;
          }
        },
        set: (key, value) => {
          localStorage.setItem(this.prefix + key, JSON.stringify(value));
        },
        remove: (key) => {
          localStorage.removeItem(this.prefix + key);
        },
        clear: () => {
          Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => localStorage.removeItem(key));
        }
      };
    }

    // 油猴脚本环境
    if (typeof GM_getValue !== 'undefined') {
      return {
        type: 'GM_storage',
        get: (key) => {
          const value = GM_getValue(this.prefix + key);
          try {
            return value ? JSON.parse(value) : null;
          } catch {
            return value;
          }
        },
        set: (key, value) => {
          GM_setValue(this.prefix + key, JSON.stringify(value));
        },
        remove: (key) => {
          GM_deleteValue(this.prefix + key);
        },
        clear: () => {
          GM_listValues()
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => GM_deleteValue(key));
        }
      };
    }

    // Node.js 环境
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      const path = require('path');
      const dataFile = path.join(process.cwd(), 'weiruan_data.json');

      return {
        type: 'file',
        _getData: () => {
          try {
            if (fs.existsSync(dataFile)) {
              return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            }
          } catch {}
          return {};
        },
        _saveData: (data) => {
          fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        },
        get: function(key) {
          const data = this._getData();
          return data[this.prefix + key] || null;
        }.bind(this),
        set: function(key, value) {
          const data = this._getData();
          data[this.prefix + key] = value;
          this._saveData(data);
        }.bind(this),
        remove: function(key) {
          const data = this._getData();
          delete data[this.prefix + key];
          this._saveData(data);
        }.bind(this),
        clear: function() {
          const data = this._getData();
          Object.keys(data)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => delete data[key]);
          this._saveData(data);
        }.bind(this)
      };
    }

    // 内存存储（降级方案）
    const memoryStorage = {};
    return {
      type: 'memory',
      get: (key) => memoryStorage[this.prefix + key] || null,
      set: (key, value) => { memoryStorage[this.prefix + key] = value; },
      remove: (key) => { delete memoryStorage[this.prefix + key]; },
      clear: () => {
        Object.keys(memoryStorage)
          .filter(key => key.startsWith(this.prefix))
          .forEach(key => delete memoryStorage[key]);
      }
    };
  }

  /**
   * 获取数据
   */
  get(key) {
    return this.storage.get(key);
  }

  /**
   * 设置数据
   */
  set(key, value) {
    return this.storage.set(key, value);
  }

  /**
   * 删除数据
   */
  remove(key) {
    return this.storage.remove(key);
  }

  /**
   * 清空数据
   */
  clear() {
    return this.storage.clear();
  }

  /**
   * 获取签到记录
   */
  getCheckinRecord(siteId) {
    const records = this.get('records') || {};
    return records[siteId] || null;
  }

  /**
   * 保存签到记录
   */
  saveCheckinRecord(siteId, result) {
    const records = this.get('records') || {};
    const today = new Date().toISOString().split('T')[0];

    if (!records[siteId]) {
      records[siteId] = {
        history: [],
        streak: 0,
        totalCheckins: 0
      };
    }

    records[siteId].lastCheckin = today;
    records[siteId].lastResult = result;
    records[siteId].totalCheckins++;
    records[siteId].history.push({
      date: today,
      result: result,
      timestamp: Date.now()
    });

    // 只保留最近30天记录
    if (records[siteId].history.length > 30) {
      records[siteId].history = records[siteId].history.slice(-30);
    }

    // 计算连续签到天数
    records[siteId].streak = this._calculateStreak(records[siteId].history);

    this.set('records', records);
    return records[siteId];
  }

  /**
   * 计算连续签到天数
   */
  _calculateStreak(history) {
    if (!history || history.length === 0) return 0;

    const successHistory = history
      .filter(h => h.result && h.result.success)
      .map(h => h.date)
      .sort()
      .reverse();

    if (successHistory.length === 0) return 0;

    let streak = 1;
    const today = new Date().toISOString().split('T')[0];

    if (successHistory[0] !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (successHistory[0] !== yesterday) return 0;
    }

    for (let i = 1; i < successHistory.length; i++) {
      const current = new Date(successHistory[i - 1]);
      const prev = new Date(successHistory[i]);
      const diffDays = (current - prev) / 86400000;

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 检查今日是否已签到
   */
  hasCheckedInToday(siteId) {
    const record = this.getCheckinRecord(siteId);
    if (!record || !record.lastCheckin) return false;

    const today = new Date().toISOString().split('T')[0];
    return record.lastCheckin === today && record.lastResult && record.lastResult.success;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeiruanStorage;
}
if (typeof window !== 'undefined') {
  window.WeiruanStorage = WeiruanStorage;
}
