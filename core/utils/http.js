/**
 * 威软全网自动化工具 - HTTP 工具模块
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

class WeiruanHttp {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...options.headers
    };
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: { ...this.headers, ...options.headers },
      credentials: options.credentials || 'include',
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
      config.headers['Content-Type'] = 'application/json';
    }

    let lastError;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();

      } catch (error) {
        lastError = error;
        if (attempt < this.retries - 1) {
          await this.sleep(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  /**
   * GET 请求
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post(url, data = {}, options = {}) {
    return this.request(url, { ...options, method: 'POST', body: data });
  }

  /**
   * 带 Cookie 的请求
   */
  async requestWithCookie(url, cookie, options = {}) {
    return this.request(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': cookie
      }
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeiruanHttp;
}
if (typeof window !== 'undefined') {
  window.WeiruanHttp = WeiruanHttp;
}
