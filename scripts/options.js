// 设置页面脚本

const SETTINGS_KEY = 'speed_dial_settings';

// 默认设置
const defaultSettings = {
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

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function updateBackgroundPreview(settings) {
  const preview = document.getElementById('currentBackground');
  if (!preview) {
    return;
  }

  const opacity = clampNumber(settings.backgroundOpacity ?? defaultSettings.backgroundOpacity, 0, 100, defaultSettings.backgroundOpacity);
  if (settings.backgroundImageData || settings.backgroundImage) {
    const url = settings.backgroundImageData || settings.backgroundImage;
    preview.style.backgroundImage = `url(${url})`;
    preview.style.display = 'block';
    preview.style.opacity = (opacity / 100).toString();
  } else {
    preview.style.display = 'none';
    preview.style.backgroundImage = '';
  }
}

function markSelectedPreset(activeUrl) {
  document.querySelectorAll('.preset-bg').forEach((preset) => {
    if (preset.getAttribute('data-url') === activeUrl) {
      preset.classList.add('selected');
    } else {
      preset.classList.remove('selected');
    }
  });
}

function getCurrentOpacityValue() {
  const slider = document.getElementById('backgroundOpacity');
  if (!slider) {
    return defaultSettings.backgroundOpacity;
  }
  return clampNumber(slider.value, 0, 100, defaultSettings.backgroundOpacity);
}

function toBoolean(value, defaultValue = true) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
  }

  return Boolean(value);
}

function getElement(id) {
  return document.getElementById(id);
}

function setSelectValue(id, value, fallback) {
  const select = getElement(id);
  if (!select) {
    return;
  }
  const availableOption = Array.from(select.options || []).some((option) => option.value === value);
  select.value = availableOption ? value : fallback;
}

function setCheckboxState(id, checked) {
  const checkbox = getElement(id);
  if (!checkbox) {
    return;
  }
  checkbox.checked = checked;
}

function setInputValue(id, value) {
  const input = getElement(id);
  if (!input) {
    return;
  }
  input.value = value;
}

function getSelectValue(id, fallback) {
  const select = getElement(id);
  return select ? select.value : fallback;
}

function getCheckboxValue(id, fallback) {
  const checkbox = getElement(id);
  return checkbox ? checkbox.checked : fallback;
}

function getInputValue(id, fallback) {
  const input = getElement(id);
  return input && typeof input.value !== 'undefined' ? input.value : fallback;
}

function getTextareaValue(id, fallback) {
  const textarea = getElement(id);
  return textarea ? textarea.value : fallback;
}

function returnToNewTab() {
  const targetUrl = chrome.runtime.getURL('newtab.html');
  if (!chrome.tabs || !chrome.tabs.getCurrent) {
    window.location.href = targetUrl;
    return;
  }

  try {
    chrome.tabs.getCurrent((tab) => {
      if (chrome.runtime.lastError) {
        window.location.href = targetUrl;
        return;
      }

      if (tab && typeof tab.id === 'number') {
        chrome.tabs.update(tab.id, { url: targetUrl });
      } else {
        window.location.href = targetUrl;
      }
    });
  } catch (error) {
    console.error('返回新标签页失败:', error);
    window.location.href = targetUrl;
  }
}

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = { ...defaultSettings, ...result[SETTINGS_KEY] };
    const opacity = clampNumber(settings.backgroundOpacity, 0, 100, defaultSettings.backgroundOpacity);
    const maxRecentTabs = clampNumber(settings.maxRecentTabs, 5, 100, defaultSettings.maxRecentTabs);

    // 应用设置到表单
    setSelectValue('theme', settings.theme, defaultSettings.theme);
    setSelectValue('columns', settings.columns, defaultSettings.columns);

    const showTitles = toBoolean(settings.showTitles, defaultSettings.showTitles);
    setCheckboxState('showTitles', showTitles);

    setInputValue('backgroundColor', settings.backgroundColor);
    setSelectValue('backgroundStyle', settings.backgroundStyle || defaultSettings.backgroundStyle, defaultSettings.backgroundStyle);
    setInputValue('backgroundOpacity', opacity);
    const opacityLabel = getElement('opacityValue');
    if (opacityLabel) {
      opacityLabel.textContent = `${opacity}%`;
    }

    setSelectValue('fontSize', settings.fontSize, defaultSettings.fontSize);
    setSelectValue('sidebarPosition', settings.sidebarPosition, defaultSettings.sidebarPosition);

    const autoOpenSidebar = toBoolean(settings.autoOpenSidebar, defaultSettings.autoOpenSidebar);
    setCheckboxState('autoOpenSidebar', autoOpenSidebar);

    setInputValue('maxRecentTabs', maxRecentTabs);

    const showFavicons = toBoolean(settings.showFavicons, defaultSettings.showFavicons);
    setCheckboxState('showFavicons', showFavicons);

    const showApps = toBoolean(settings.showApps, defaultSettings.showApps);
    setCheckboxState('showApps', showApps);

    setInputValue('customCSS', settings.customCSS || '');

    markSelectedPreset(settings.backgroundImage);
    updateBackgroundPreview({ ...settings, backgroundOpacity: opacity });
    applyTheme(settings.theme);
  } catch (error) {
    console.error('加载设置失败:', error);
    showToast('加载设置失败', 'error');
  }
}

// 保存设置
async function saveSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const oldSettings = result[SETTINGS_KEY] || {};

    const backgroundOpacityInput = document.getElementById('backgroundOpacity');
    const maxRecentTabsInput = document.getElementById('maxRecentTabs');

    const backgroundOpacity = clampNumber(backgroundOpacityInput.value, 0, 100, defaultSettings.backgroundOpacity);
    const maxRecentTabs = clampNumber(maxRecentTabsInput.value, 5, 100, defaultSettings.maxRecentTabs);

    backgroundOpacityInput.value = backgroundOpacity;
    maxRecentTabsInput.value = maxRecentTabs;
    document.getElementById('opacityValue').textContent = `${backgroundOpacity}%`;

    const settings = {
      theme: getSelectValue('theme', defaultSettings.theme),
      columns: getSelectValue('columns', defaultSettings.columns),
      showTitles: getCheckboxValue('showTitles', defaultSettings.showTitles),
      backgroundColor: getInputValue('backgroundColor', defaultSettings.backgroundColor) || defaultSettings.backgroundColor,
      backgroundImage: oldSettings.backgroundImage || '',
      backgroundImageData: oldSettings.backgroundImageData || '',
      backgroundStyle: getSelectValue('backgroundStyle', defaultSettings.backgroundStyle),
      backgroundOpacity,
      fontSize: getSelectValue('fontSize', defaultSettings.fontSize),
      sidebarPosition: getSelectValue('sidebarPosition', defaultSettings.sidebarPosition),
      autoOpenSidebar: getCheckboxValue('autoOpenSidebar', defaultSettings.autoOpenSidebar),
      maxRecentTabs,
      showFavicons: getCheckboxValue('showFavicons', defaultSettings.showFavicons),
      showApps: getCheckboxValue('showApps', defaultSettings.showApps),
      customCSS: getTextareaValue('customCSS', '')
    };

    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

    updateBackgroundPreview(settings);
    markSelectedPreset(settings.backgroundImage);
    applyTheme(settings.theme);
    showToast('设置已保存', 'success');

  } catch (error) {
    console.error('保存设置失败:', error);
    showToast('保存失败', 'error');
  }
}

// 重置设置
async function resetSettings() {
  if (!confirm('确定要重置所有设置吗？这将不会影响您的书签。')) {
    return;
  }

  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: { ...defaultSettings } });
    await loadSettings();
    showToast('设置已重置', 'success');
  } catch (error) {
    console.error('重置设置失败:', error);
    showToast('重置失败', 'error');
  }
}

// 导出数据
async function exportData() {
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
    showToast('数据已导出', 'success');
  } catch (error) {
    console.error('导出数据失败:', error);
    showToast('导出失败', 'error');
  }
}

// 导入数据
async function importData(file) {
  if (!confirm('导入数据将覆盖当前所有数据，确定继续吗？')) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await chrome.storage.local.clear();
    await chrome.storage.local.set(data);
    await loadSettings();
    showToast('数据已导入', 'success');
  } catch (error) {
    console.error('导入数据失败:', error);
    showToast('导入失败，请检查文件格式', 'error');
  }
}

// 显示提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 关闭设置页面
  const closeSettingsBtn = getElement('closeSettings');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      returnToNewTab();
    });
  }

  // 保存设置
  const saveBtn = getElement('saveSettings');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  // 取消（返回）
  const cancelBtn = getElement('cancelSettings');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (event) => {
      event.preventDefault();
      returnToNewTab();
    });
  }

  // 重置设置
  const resetBtn = getElement('resetSettings');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }

  // 导出数据
  const exportBtn = getElement('exportData');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }

  // 导入数据
  const importInput = getElement('importData');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files ? e.target.files[0] : null;
      if (file) {
        importData(file);
      }
    });
  }

  // 上传按钮点击触发文件选择
  const uploadBtn = getElement('uploadButton');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const fileInput = getElement('backgroundImage');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  // 上传背景图片
  const backgroundImageInput = getElement('backgroundImage');
  if (backgroundImageInput) {
    backgroundImageInput.addEventListener('change', async (e) => {
      const file = e.target.files ? e.target.files[0] : null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('图片大小不能超过5MB', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageData = event.target.result;
          const result = await chrome.storage.local.get(SETTINGS_KEY);
          const settings = { ...defaultSettings, ...result[SETTINGS_KEY] };
          settings.backgroundImageData = imageData;
          settings.backgroundImage = '';
          await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

          markSelectedPreset('');
          updateBackgroundPreview({ ...settings, backgroundImageData: imageData, backgroundOpacity: getCurrentOpacityValue() });

          showToast('背景图片已上传', 'success');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 移除背景图片
  const removeBackgroundBtn = getElement('removeBackground');
  if (removeBackgroundBtn) {
    removeBackgroundBtn.addEventListener('click', async () => {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = { ...defaultSettings, ...result[SETTINGS_KEY] };
      settings.backgroundImageData = '';
      settings.backgroundImage = '';
      await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

      markSelectedPreset('');
      updateBackgroundPreview(settings);

      showToast('背景图片已移除', 'success');
    });
  }

  // 预设背景图片
  document.querySelectorAll('.preset-bg').forEach((preset) => {
    preset.addEventListener('click', async () => {
      const url = preset.getAttribute('data-url');
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = { ...defaultSettings, ...result[SETTINGS_KEY] };
      settings.backgroundImage = url;
      settings.backgroundImageData = '';
      await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

      markSelectedPreset(url);
      updateBackgroundPreview({ ...settings, backgroundImage: url, backgroundOpacity: getCurrentOpacityValue() });

      showToast('背景图片已设置', 'success');
    });
  });

  // 背景不透明度滑块
  const backgroundOpacityInput = getElement('backgroundOpacity');
  if (backgroundOpacityInput) {
    backgroundOpacityInput.addEventListener('input', (e) => {
      const value = clampNumber(e.target.value, 0, 100, defaultSettings.backgroundOpacity);
      e.target.value = value;
      const opacityLabel = getElement('opacityValue');
      if (opacityLabel) {
        opacityLabel.textContent = `${value}%`;
      }

      const preview = getElement('currentBackground');
      if (preview && preview.style.display !== 'none') {
        preview.style.opacity = (value / 100).toString();
      }
    });
  }

  // 实时预览主题
  const themeSelect = getElement('theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }

  // 实时预览背景色
  const backgroundColorInput = getElement('backgroundColor');
  if (backgroundColorInput) {
    backgroundColorInput.addEventListener('input', (e) => {
      document.body.style.backgroundColor = e.target.value;
    });
  }
});

// 应用主题（预览用）
function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.style.setProperty('--bg-color', '#1a1a1a');
    root.style.setProperty('--card-bg', '#2d2d2d');
    root.style.setProperty('--text-color', '#e8eaed');
    root.style.setProperty('--text-secondary', '#9aa0a6');
    root.style.setProperty('--border-color', '#3c4043');
    root.style.setProperty('--hover-bg', '#3c4043');
    document.body.style.backgroundColor = '#1a1a1a';
  } else {
    root.style.setProperty('--bg-color', '#f5f5f5');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-color', '#202124');
    root.style.setProperty('--text-secondary', '#5f6368');
    root.style.setProperty('--border-color', '#dadce0');
    root.style.setProperty('--hover-bg', '#f1f3f4');
    const bgColor = document.getElementById('backgroundColor').value;
    document.body.style.backgroundColor = bgColor || '#f5f5f5';
  }
}
