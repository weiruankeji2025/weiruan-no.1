/**
 * 威软全网自动化工具 - Content Script
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

(function() {
  'use strict';

  const hostname = window.location.hostname;

  // 站点匹配
  const SITE_HANDLERS = {
    'jd.com': handleJD,
    'wps.cn': handleWPS,
    'bilibili.com': handleBilibili,
    'smzdm.com': handleSMZDM,
    'v2ex.com': handleV2EX,
    'csdn.net': handleCSDN,
    'github.com': handleGitHub,
    'steampowered.com': handleSteam
  };

  // 查找匹配的处理器
  function findHandler() {
    for (const [domain, handler] of Object.entries(SITE_HANDLERS)) {
      if (hostname.includes(domain)) {
        return { domain, handler };
      }
    }
    return null;
  }

  // 京东处理
  function handleJD() {
    console.log('[威软签到] 检测到京东页面');
    // 自动检查签到状态
    checkAndNotify('jd', '京东');
  }

  // WPS处理
  function handleWPS() {
    console.log('[威软签到] 检测到WPS页面');
    checkAndNotify('wps', 'WPS');
  }

  // 哔哩哔哩处理
  function handleBilibili() {
    console.log('[威软签到] 检测到哔哩哔哩页面');
    checkAndNotify('bilibili', '哔哩哔哩');
  }

  // 什么值得买处理
  function handleSMZDM() {
    console.log('[威软签到] 检测到什么值得买页面');
    checkAndNotify('smzdm', '什么值得买');
  }

  // V2EX处理
  function handleV2EX() {
    console.log('[威软签到] 检测到V2EX页面');
    // 检查是否在签到页面
    if (window.location.pathname === '/mission/daily') {
      const redeemBtn = document.querySelector('input[value="领取"]');
      if (redeemBtn) {
        console.log('[威软签到] 发现可领取的签到奖励');
      }
    }
    checkAndNotify('v2ex', 'V2EX');
  }

  // CSDN处理
  function handleCSDN() {
    console.log('[威软签到] 检测到CSDN页面');
    checkAndNotify('csdn', 'CSDN');
  }

  // GitHub处理
  function handleGitHub() {
    console.log('[威软签到] 检测到GitHub页面');
    // GitHub通过贡献来记录活动
    checkAndNotify('github', 'GitHub');
  }

  // Steam处理
  function handleSteam() {
    console.log('[威软签到] 检测到Steam页面');
    checkAndNotify('steam', 'Steam');
  }

  // 检查并通知
  async function checkAndNotify(siteId, siteName) {
    try {
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
      if (status && status[siteId]) {
        if (!status[siteId].checkedToday) {
          console.log(`[威软签到] ${siteName} 今日尚未签到`);
          // 可以在这里添加页面内提示
          showPageNotification(siteName);
        } else {
          console.log(`[威软签到] ${siteName} 今日已签到`);
        }
      }
    } catch (error) {
      console.error('[威软签到] 检查状态失败:', error);
    }
  }

  // 页面内提示
  function showPageNotification(siteName) {
    // 检查是否已显示过
    if (document.getElementById('weiruan-page-notification')) return;

    const notification = document.createElement('div');
    notification.id = 'weiruan-page-notification';
    notification.innerHTML = `
      <style>
        #weiruan-page-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        #weiruan-page-notification .close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
        #weiruan-page-notification .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        #weiruan-page-notification .checkin-btn {
          background: rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }
        #weiruan-page-notification .checkin-btn:hover {
          background: rgba(255,255,255,0.35);
        }
      </style>
      <span>威软签到提醒: ${siteName} 今日尚未签到</span>
      <button class="checkin-btn" id="weiruan-quick-checkin">立即签到</button>
      <button class="close-btn" id="weiruan-close-notification">&times;</button>
    `;

    document.body.appendChild(notification);

    // 关闭按钮
    document.getElementById('weiruan-close-notification').onclick = () => {
      notification.remove();
    };

    // 快速签到按钮
    document.getElementById('weiruan-quick-checkin').onclick = async () => {
      const btn = document.getElementById('weiruan-quick-checkin');
      btn.textContent = '签到中...';
      btn.disabled = true;

      // 通知后台执行签到
      const match = findHandler();
      if (match) {
        try {
          const result = await chrome.runtime.sendMessage({
            action: 'checkin',
            siteId: match.domain.split('.')[0]
          });

          if (result.success) {
            btn.textContent = '已签到';
            setTimeout(() => notification.remove(), 2000);
          } else {
            btn.textContent = '签到失败';
            btn.disabled = false;
          }
        } catch (error) {
          btn.textContent = '签到失败';
          btn.disabled = false;
        }
      }
    };

    // 5秒后自动隐藏
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // 初始化
  function init() {
    const match = findHandler();
    if (match) {
      console.log(`[威软签到] 匹配站点: ${match.domain}`);
      // 延迟执行，等待页面加载完成
      setTimeout(() => match.handler(), 2000);
    }
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
