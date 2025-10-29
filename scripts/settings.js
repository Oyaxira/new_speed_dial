// 设置管理模块

class SettingsManager {
  constructor() {
    this.SETTINGS_KEY = 'speed_dial_settings';
    this.defaultSettings = {
      theme: 'light',
      columns: 'auto',
      showTitles: true,
      backgroundImage: '',
      backgroundImageData: '',
      backgroundStyle: 'cover',
      backgroundOpacity: 100,
      backgroundColor: '#f5f5f5',
      fontSize: 'medium',
      sidebarPosition: 'right',
      autoOpenSidebar: false,
      maxRecentTabs: 20,
      showFavicons: true,
      showApps: true,
      customCSS: ''
    };
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      return { ...this.defaultSettings, ...result[this.SETTINGS_KEY] };
    } catch (e) {
      console.error('获取设置失败:', e);
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: newSettings });
      return true;
    } catch (e) {
      console.error('保存设置失败:', e);
      return false;
    }
  }

  async resetSettings() {
    try {
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: { ...this.defaultSettings } });
      return true;
    } catch (e) {
      console.error('重置设置失败:', e);
      return false;
    }
  }

  async getSetting(key) {
    const settings = await this.getSettings();
    return settings[key];
  }

  async setSetting(key, value) {
    return await this.saveSettings({ [key]: value });
  }
}

// 导出设置管理器实例
export const settingsManager = new SettingsManager();

// 应用主题
export async function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.style.setProperty('--bg-color', '#1a1a1a');
    root.style.setProperty('--card-bg', '#2d2d2d');
    root.style.setProperty('--text-color', '#e8eaed');
    root.style.setProperty('--text-secondary', '#9aa0a6');
    root.style.setProperty('--border-color', '#3c4043');
    root.style.setProperty('--hover-bg', '#3c4043');
  } else {
    root.style.setProperty('--bg-color', '#f5f5f5');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-color', '#202124');
    root.style.setProperty('--text-secondary', '#5f6368');
    root.style.setProperty('--border-color', '#dadce0');
    root.style.setProperty('--hover-bg', '#f1f3f4');
  }
}

// 应用列数设置
export function applyColumns(columns) {
  const grid = document.getElementById('dials-grid');
  if (!grid) return;

  if (columns === 'auto') {
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
  } else {
    const columnCount = parseInt(columns);
    if (!isNaN(columnCount) && columnCount > 0) {
      grid.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
    }
  }
}

// 应用背景设置
export function applyBackground(settings) {
  const body = document.body;
  if (!body) {
    return;
  }

  const hasBackgroundImage = settings.backgroundImageData || settings.backgroundImage;
  const styleMap = {
    cover: { size: 'cover', position: 'center center', repeat: 'no-repeat' },
    contain: { size: 'contain', position: 'center center', repeat: 'no-repeat' },
    repeat: { size: 'auto', position: 'top left', repeat: 'repeat' },
    center: { size: 'auto', position: 'center center', repeat: 'no-repeat' }
  };
  const resolvedStyle = styleMap[settings.backgroundStyle] || styleMap.cover;

  if (hasBackgroundImage) {
    const bgUrl = settings.backgroundImageData || settings.backgroundImage;
    body.style.backgroundImage = `url(${bgUrl})`;
    body.style.backgroundSize = resolvedStyle.size;
    body.style.backgroundPosition = resolvedStyle.position;
    body.style.backgroundRepeat = resolvedStyle.repeat;
    body.style.backgroundAttachment = 'fixed';
  } else {
    body.style.backgroundImage = 'none';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundAttachment = '';
  }

  body.style.backgroundColor = settings.backgroundColor || '#f5f5f5';
}

// 应用字体大小
export function applyFontSize(size) {
  const root = document.documentElement;

  const sizes = {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '18px'
  };

  root.style.fontSize = sizes[size] || sizes.medium;
}

// 应用自定义CSS
export function applyCustomCSS(css) {
  let styleElement = document.getElementById('custom-css');

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'custom-css';
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
}

// 初始化设置
export async function initSettings() {
  const settings = await settingsManager.getSettings();

  applyTheme(settings.theme);
  applyColumns(settings.columns);
  applyBackground(settings);
  applyFontSize(settings.fontSize);
  applyCustomCSS(settings.customCSS);

  return settings;
}

// 导出数据
export async function exportData() {
  try {
    const result = await chrome.storage.local.get(null);
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speed-dial-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('导出数据失败:', e);
    return false;
  }
}

// 导入数据
export async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await chrome.storage.local.clear();
    await chrome.storage.local.set(data);
    return true;
  } catch (e) {
    console.error('导入数据失败:', e);
    return false;
  }
}
