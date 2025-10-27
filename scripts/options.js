// 设置页面脚本

const SETTINGS_KEY = 'speed_dial_settings';

// 默认设置
const defaultSettings = {
  theme: 'light',
  columns: 'auto',
  showTitles: true,
  showAddButton: true,
  backgroundImage: '',
  backgroundImageData: '',
  backgroundStyle: 'cover',
  backgroundOpacity: 100,
  backgroundColor: '#f5f5f5',
  fontSize: 'medium',
  sidebarPosition: 'right',
  autoOpenSidebar: false,
  maxRecentTabs: 10,
  showFavicons: true,
  enableAnimations: true,
  customCSS: ''
};

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = { ...defaultSettings, ...result[SETTINGS_KEY] };

    // 应用设置到表单
    document.getElementById('theme').value = settings.theme;
    document.getElementById('columns').value = settings.columns;
    document.getElementById('showTitles').checked = settings.showTitles;
    document.getElementById('backgroundColor').value = settings.backgroundColor;
    document.getElementById('backgroundStyle').value = settings.backgroundStyle || 'cover';
    document.getElementById('backgroundOpacity').value = settings.backgroundOpacity || 100;
    document.getElementById('opacityValue').textContent = (settings.backgroundOpacity || 100) + '%';
    document.getElementById('fontSize').value = settings.fontSize;
    document.getElementById('sidebarPosition').value = settings.sidebarPosition;
    document.getElementById('autoOpenSidebar').checked = settings.autoOpenSidebar;
    document.getElementById('maxRecentTabs').value = settings.maxRecentTabs;
    document.getElementById('showFavicons').checked = settings.showFavicons;
    document.getElementById('enableAnimations').checked = settings.enableAnimations;
    document.getElementById('customCSS').value = settings.customCSS || '';

    // 显示当前背景图片
    if (settings.backgroundImageData || settings.backgroundImage) {
      const bgPreview = document.getElementById('currentBackground');
      bgPreview.style.backgroundImage = `url(${settings.backgroundImageData || settings.backgroundImage})`;
      bgPreview.style.display = 'block';
    }

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

    const settings = {
      theme: document.getElementById('theme').value,
      columns: document.getElementById('columns').value,
      showTitles: document.getElementById('showTitles').checked,
      backgroundColor: document.getElementById('backgroundColor').value,
      backgroundImage: oldSettings.backgroundImage || '',
      backgroundImageData: oldSettings.backgroundImageData || '',
      backgroundStyle: document.getElementById('backgroundStyle').value,
      backgroundOpacity: parseInt(document.getElementById('backgroundOpacity').value),
      fontSize: document.getElementById('fontSize').value,
      sidebarPosition: document.getElementById('sidebarPosition').value,
      autoOpenSidebar: document.getElementById('autoOpenSidebar').checked,
      maxRecentTabs: parseInt(document.getElementById('maxRecentTabs').value),
      showFavicons: document.getElementById('showFavicons').checked,
      enableAnimations: document.getElementById('enableAnimations').checked,
      customCSS: document.getElementById('customCSS').value
    };

    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    showToast('设置已保存', 'success');

    // 应用主题和列数到当前页面预览
    applyTheme(settings.theme);
    if (settings.columns !== 'auto') {
      console.log('列数设置为:', settings.columns);
    }

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
    await chrome.storage.local.set({ [SETTINGS_KEY]: defaultSettings });
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

  // 保存设置
  document.getElementById('saveSettings').addEventListener('click', saveSettings);

  // 取消（返回）
  document.getElementById('cancelSettings').addEventListener('click', () => {
    // 尝试返回上一页，如果是直接打开的则关闭
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

  // 重置设置
  document.getElementById('resetSettings').addEventListener('click', resetSettings);

  // 导出数据
  document.getElementById('exportData').addEventListener('click', exportData);

  // 导入数据
  document.getElementById('importData').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importData(file);
    }
  });

  // 上传按钮点击触发文件选择
  document.getElementById('uploadButton').addEventListener('click', () => {
    document.getElementById('backgroundImage').click();
  });

  // 上传背景图片
  document.getElementById('backgroundImage').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('图片大小不能超过5MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target.result;
        const result = await chrome.storage.local.get(SETTINGS_KEY);
        const settings = result[SETTINGS_KEY] || {};
        settings.backgroundImageData = imageData;
        settings.backgroundImage = '';
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

        const bgPreview = document.getElementById('currentBackground');
        bgPreview.style.backgroundImage = `url(${imageData})`;
        bgPreview.style.display = 'block';

        showToast('背景图片已上传', 'success');
      };
      reader.readAsDataURL(file);
    }
  });

  // 移除背景图片
  document.getElementById('removeBackground').addEventListener('click', async () => {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] || {};
    settings.backgroundImageData = '';
    settings.backgroundImage = '';
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

    const bgPreview = document.getElementById('currentBackground');
    bgPreview.style.display = 'none';

    showToast('背景图片已移除', 'success');
  });

  // 预设背景图片
  document.querySelectorAll('.preset-bg').forEach(preset => {
    preset.addEventListener('click', async () => {
      const url = preset.getAttribute('data-url');
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = result[SETTINGS_KEY] || {};
      settings.backgroundImage = url;
      settings.backgroundImageData = '';
      await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

      document.querySelectorAll('.preset-bg').forEach(p => p.classList.remove('selected'));
      preset.classList.add('selected');

      const bgPreview = document.getElementById('currentBackground');
      bgPreview.style.backgroundImage = `url(${url})`;
      bgPreview.style.display = 'block';

      showToast('背景图片已设置', 'success');
    });
  });

  // 背景不透明度滑块
  document.getElementById('backgroundOpacity').addEventListener('input', (e) => {
    document.getElementById('opacityValue').textContent = e.target.value + '%';
  });

  // 实时预览主题
  document.getElementById('theme').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // 实时预览背景色
  document.getElementById('backgroundColor').addEventListener('input', (e) => {
    document.body.style.backgroundColor = e.target.value;
  });
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
