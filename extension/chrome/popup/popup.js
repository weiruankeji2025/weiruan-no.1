/**
 * 威软全网自动化工具 - Popup脚本
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

// 站点图标映射
const SITE_ICONS = {
  jd: '🛒',
  wps: '📄',
  bilibili: '📺',
  smzdm: '💰',
  v2ex: '💻',
  csdn: '👨‍💻',
  github: '🐙',
  steam: '🎮',
  netease: '🎵',
  mihoyo: '🎮',
  aliyun: '☁️',
  zhihu: '❓',
  weibo: '📱',
  iqiyi: '🎬',
  douyu: '🐟',
  huya: '🐯',
  tieba: '💬'
};

// 状态缓存
let sitesStatus = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  setupEventListeners();
});

// 加载状态
async function loadStatus() {
  try {
    sitesStatus = await chrome.runtime.sendMessage({ action: 'getStatus' });
    updateUI();
  } catch (error) {
    console.error('加载状态失败:', error);
    showToast('加载状态失败');
  }
}

// 更新UI
function updateUI() {
  const sitesList = document.getElementById('sitesList');
  const totalSites = document.getElementById('totalSites');
  const checkedToday = document.getElementById('checkedToday');
  const pendingCount = document.getElementById('pendingCount');

  if (!sitesStatus) return;

  const sites = Object.entries(sitesStatus);
  const checked = sites.filter(([_, s]) => s.checkedToday).length;
  const pending = sites.filter(([_, s]) => s.enabled && !s.checkedToday).length;

  totalSites.textContent = sites.length;
  checkedToday.textContent = checked;
  pendingCount.textContent = pending;

  // 生成站点列表
  sitesList.innerHTML = sites.map(([siteId, site]) => `
    <div class="site-item" data-site-id="${siteId}">
      <div class="site-info">
        <span class="site-icon">${SITE_ICONS[siteId] || '🌐'}</span>
        <span class="site-name">${site.name}</span>
      </div>
      <div class="site-actions">
        <span class="status-badge ${site.checkedToday ? 'success' : 'pending'}">
          ${site.checkedToday ? '已签到' : '待签到'}
        </span>
        <button class="checkin-btn" data-site-id="${siteId}" ${site.checkedToday ? 'disabled' : ''}>
          签到
        </button>
      </div>
    </div>
  `).join('');
}

// 设置事件监听
function setupEventListeners() {
  // 一键全部签到
  document.getElementById('checkinAllBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 签到中...';

    try {
      await chrome.runtime.sendMessage({ action: 'checkinAll' });
      showToast('批量签到完成');
      await loadStatus();
    } catch (error) {
      console.error('批量签到失败:', error);
      showToast('批量签到失败');
    }

    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      一键全部签到
    `;
  });

  // 单个站点签到
  document.getElementById('sitesList').addEventListener('click', async (e) => {
    const btn = e.target.closest('.checkin-btn');
    if (!btn || btn.disabled) return;

    const siteId = btn.dataset.siteId;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span>';

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'checkin',
        siteId: siteId
      });

      if (result.success) {
        showToast(`${sitesStatus[siteId].name}: ${result.message}`);
      } else {
        showToast(`签到失败: ${result.message}`);
      }

      await loadStatus();
    } catch (error) {
      console.error('签到失败:', error);
      showToast('签到失败');
      btn.disabled = false;
      btn.textContent = '签到';
    }
  });

  // 设置链接
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// 显示Toast
function showToast(message, duration = 2000) {
  // 移除已存在的toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // 显示
  setTimeout(() => toast.classList.add('show'), 10);

  // 隐藏并移除
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
