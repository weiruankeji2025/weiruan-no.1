/**
 * 威软全网自动化工具 - 桌面版主进程
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const cron = require('node-cron');
const CheckinService = require('./services/checkin');

// 存储
const store = new Store({
  name: 'weiruan-checkin-config',
  defaults: {
    autoStart: true,
    minimizeToTray: true,
    autoCheckin: true,
    checkTime: '08:00',
    sites: {},
    credentials: {}
  }
});

// 全局变量
let mainWindow = null;
let tray = null;
let checkinService = null;
let cronJob = null;

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    title: '威软全网自动化签到工具',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 创建托盘图标
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');

  // 创建默认图标
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '立即签到',
      click: () => {
        performCheckinAll();
      }
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', 'settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('威软全网自动化签到工具');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 初始化签到服务
function initCheckinService() {
  checkinService = new CheckinService(store);

  // 设置定时任务
  const checkTime = store.get('checkTime', '08:00');
  const [hour, minute] = checkTime.split(':');

  if (cronJob) {
    cronJob.stop();
  }

  cronJob = cron.schedule(`${minute} ${hour} * * *`, async () => {
    if (store.get('autoCheckin')) {
      console.log('[威软签到] 执行定时签到');
      await performCheckinAll();
    }
  });

  console.log(`[威软签到] 定时任务已设置: 每日 ${checkTime}`);
}

// 执行全部签到
async function performCheckinAll() {
  if (!checkinService) return;

  const results = await checkinService.checkinAll();

  // 显示通知
  const successCount = results.filter(r => r.success).length;
  showNotification(
    '威软签到完成',
    `共 ${results.length} 个站点，成功 ${successCount} 个`
  );

  // 通知渲染进程更新
  if (mainWindow) {
    mainWindow.webContents.send('checkin-complete', results);
  }

  return results;
}

// 显示系统通知
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, '../assets/icon.png')
    }).show();
  }
}

// IPC处理
function setupIPC() {
  // 获取配置
  ipcMain.handle('get-config', () => {
    return store.store;
  });

  // 保存配置
  ipcMain.handle('save-config', (event, config) => {
    for (const [key, value] of Object.entries(config)) {
      store.set(key, value);
    }
    initCheckinService(); // 重新初始化定时任务
    return true;
  });

  // 获取站点列表
  ipcMain.handle('get-sites', () => {
    return checkinService ? checkinService.getSites() : [];
  });

  // 获取签到状态
  ipcMain.handle('get-status', () => {
    return checkinService ? checkinService.getStatus() : {};
  });

  // 执行签到
  ipcMain.handle('checkin', async (event, siteId) => {
    if (!checkinService) return { success: false, message: '服务未初始化' };
    return await checkinService.checkinSite(siteId);
  });

  // 执行全部签到
  ipcMain.handle('checkin-all', async () => {
    return await performCheckinAll();
  });

  // 保存凭证
  ipcMain.handle('save-credentials', (event, siteId, credentials) => {
    const creds = store.get('credentials', {});
    creds[siteId] = credentials;
    store.set('credentials', creds);
    return true;
  });

  // 获取签到记录
  ipcMain.handle('get-records', () => {
    return store.get('records', {});
  });
}

// 应用就绪
app.whenReady().then(() => {
  createWindow();
  createTray();
  initCheckinService();
  setupIPC();

  // 开机自启
  if (store.get('autoStart')) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    });
  }
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不退出，保持托盘运行
  }
});

// 应用激活
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 退出前清理
app.on('before-quit', () => {
  if (cronJob) {
    cronJob.stop();
  }
});

console.log('[威软签到] 桌面应用启动');
