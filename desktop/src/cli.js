#!/usr/bin/env node

/**
 * 威软全网自动化工具 - 命令行版本
 * @author 威软全网自动化工具
 * @version 1.0.0
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 配置文件路径
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.weiruan-checkin.json');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

// 站点配置
const SITES = {
  jd: {
    name: '京东',
    checkinUrl: 'https://api.m.jd.com/client.action?functionId=signBeanAct&appid=ld'
  },
  bilibili: {
    name: '哔哩哔哩',
    checkinUrl: 'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign'
  },
  wps: {
    name: 'WPS',
    checkinUrl: 'https://vip.wps.cn/sign/v2'
  },
  smzdm: {
    name: '什么值得买',
    checkinUrl: 'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin'
  },
  aliyun: {
    name: '阿里云盘',
    tokenUrl: 'https://auth.aliyundrive.com/v2/account/token',
    checkinUrl: 'https://member.aliyundrive.com/v1/activity/sign_in_list'
  }
};

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {}
  return { credentials: {}, records: {} };
}

// 保存配置
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// HTTP请求
async function request(url, options = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      },
      data: options.body,
      timeout: 30000
    });
    return response.data;
  } catch (err) {
    throw new Error(err.message);
  }
}

// 签到函数
const checkinFunctions = {
  async jd(cookie) {
    const data = await request(SITES.jd.checkinUrl, {
      method: 'POST',
      headers: { Cookie: cookie }
    });

    if (data.code === '0') {
      return { success: true, message: `获得 ${data.data?.dailyAward?.beanAward?.beanCount || 0} 京豆` };
    }
    return { success: false, message: data.errorMessage || '签到失败' };
  },

  async bilibili(cookie) {
    const data = await request(SITES.bilibili.checkinUrl, {
      headers: { Cookie: cookie }
    });

    if (data.code === 0) {
      return { success: true, message: data.data?.text || '签到成功' };
    }
    if (data.code === 1011040) {
      return { success: true, message: '今日已签到' };
    }
    return { success: false, message: data.message || '签到失败' };
  },

  async wps(cookie) {
    const data = await request(SITES.wps.checkinUrl, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ platform: 'web' })
    });

    if (data.result === 'ok' || data.code === 0) {
      return { success: true, message: '签到成功' };
    }
    if (data.msg?.includes('已签到')) {
      return { success: true, message: '今日已签到' };
    }
    return { success: false, message: data.msg || '签到失败' };
  },

  async smzdm(cookie) {
    const data = await request(SITES.smzdm.checkinUrl, {
      headers: { Cookie: cookie }
    });

    if (data.error_code === 0) {
      return { success: true, message: `获得 ${data.data?.checkin_num || 0} 积分` };
    }
    return { success: false, message: data.error_msg || '签到失败' };
  },

  async aliyun(refreshToken) {
    // 获取access token
    const tokenData = await request(SITES.aliyun.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!tokenData.access_token) {
      return { success: false, message: 'Token无效' };
    }

    // 签到
    const signData = await request(SITES.aliyun.checkinUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (signData.success) {
      return { success: true, message: `连续签到 ${signData.result?.signInCount || 0} 天` };
    }
    return { success: false, message: signData.message || '签到失败' };
  }
};

// 执行签到
async function doCheckin(siteId, credential) {
  const site = SITES[siteId];
  if (!site) {
    error(`未知站点: ${siteId}`);
    return { success: false, message: '未知站点' };
  }

  const checkinFunc = checkinFunctions[siteId];
  if (!checkinFunc) {
    error(`站点 ${site.name} 暂不支持CLI签到`);
    return { success: false, message: '暂不支持' };
  }

  info(`正在签到: ${site.name}...`);

  try {
    const result = await checkinFunc(credential);
    if (result.success) {
      success(`${site.name}: ${result.message}`);
    } else {
      error(`${site.name}: ${result.message}`);
    }
    return result;
  } catch (err) {
    error(`${site.name}: ${err.message}`);
    return { success: false, message: err.message };
  }
}

// 执行全部签到
async function doCheckinAll() {
  const config = loadConfig();
  const today = new Date().toISOString().split('T')[0];

  log('\n========================================', 'magenta');
  log('   威软全网自动化签到工具 - CLI版本', 'magenta');
  log('========================================\n', 'magenta');

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const [siteId, site] of Object.entries(SITES)) {
    const credential = config.credentials?.[siteId];

    if (!credential) {
      warn(`${site.name}: 未配置凭证，跳过`);
      skipCount++;
      continue;
    }

    // 检查今日是否已签到
    if (config.records?.[siteId]?.lastDate === today) {
      info(`${site.name}: 今日已签到，跳过`);
      skipCount++;
      continue;
    }

    const result = await doCheckin(siteId, credential);

    if (result.success) {
      successCount++;
      // 保存记录
      if (!config.records) config.records = {};
      config.records[siteId] = {
        lastDate: today,
        result: result,
        timestamp: Date.now()
      };
      saveConfig(config);
    } else {
      failCount++;
    }

    // 延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  log('\n========================================', 'magenta');
  log(`签到完成: 成功 ${successCount} | 失败 ${failCount} | 跳过 ${skipCount}`, 'cyan');
  log('========================================\n', 'magenta');
}

// 配置凭证
async function configureCredential(siteId) {
  const site = SITES[siteId];
  if (!site) {
    error(`未知站点: ${siteId}`);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`请输入 ${site.name} 的Cookie/Token: `, (answer) => {
      rl.close();
      if (answer.trim()) {
        const config = loadConfig();
        if (!config.credentials) config.credentials = {};
        config.credentials[siteId] = answer.trim();
        saveConfig(config);
        success(`${site.name} 凭证已保存`);
      } else {
        warn('未输入凭证');
      }
      resolve();
    });
  });
}

// 显示帮助
function showHelp() {
  console.log(`
${colors.magenta}威软全网自动化签到工具 - CLI版本${colors.reset}
${colors.cyan}作者: 威软全网自动化工具${colors.reset}

用法:
  node cli.js [命令] [选项]

命令:
  checkin, c          执行全部签到
  checkin <站点>      签到指定站点
  config <站点>       配置站点凭证
  list, l             列出所有站点
  status, s           查看签到状态
  help, h             显示帮助

支持的站点:
${Object.entries(SITES).map(([id, site]) => `  ${id.padEnd(12)} ${site.name}`).join('\n')}

示例:
  node cli.js checkin          # 执行全部签到
  node cli.js checkin jd       # 只签到京东
  node cli.js config bilibili  # 配置B站凭证
  node cli.js status           # 查看签到状态
`);
}

// 列出站点
function listSites() {
  log('\n支持的站点:', 'cyan');
  for (const [id, site] of Object.entries(SITES)) {
    log(`  ${id.padEnd(12)} - ${site.name}`);
  }
  log('');
}

// 查看状态
function showStatus() {
  const config = loadConfig();
  const today = new Date().toISOString().split('T')[0];

  log('\n========================================', 'magenta');
  log('           签到状态', 'magenta');
  log('========================================\n', 'magenta');

  for (const [id, site] of Object.entries(SITES)) {
    const hasCredential = !!config.credentials?.[id];
    const record = config.records?.[id];
    const checkedToday = record?.lastDate === today;

    let status = '';
    if (!hasCredential) {
      status = `${colors.yellow}未配置${colors.reset}`;
    } else if (checkedToday) {
      status = `${colors.green}已签到${colors.reset}`;
    } else {
      status = `${colors.cyan}待签到${colors.reset}`;
    }

    log(`  ${site.name.padEnd(12)} ${status}`);
  }

  log('');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command.toLowerCase()) {
    case 'checkin':
    case 'c':
      if (args[1]) {
        const config = loadConfig();
        const credential = config.credentials?.[args[1]];
        if (credential) {
          await doCheckin(args[1], credential);
        } else {
          error(`站点 ${args[1]} 未配置凭证`);
        }
      } else {
        await doCheckinAll();
      }
      break;

    case 'config':
      if (args[1]) {
        await configureCredential(args[1]);
      } else {
        error('请指定站点ID');
        listSites();
      }
      break;

    case 'list':
    case 'l':
      listSites();
      break;

    case 'status':
    case 's':
      showStatus();
      break;

    case 'help':
    case 'h':
    default:
      showHelp();
      break;
  }
}

main().catch(console.error);
