const SETTINGS_KEY = 'speed_dial_settings';

const defaultSettings = {
  theme: 'light',
  columns: '4',
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
  showAddButton: true,
  showSettingsButton: true,
  customCSS: ''
};

async function readSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...defaultSettings, ...result[SETTINGS_KEY] };
  } catch (error) {
    console.error('读取设置失败:', error);
    return { ...defaultSettings };
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function resolveBackgroundStyle(style) {
  const styles = {
    cover: { size: 'cover', position: 'center center', repeat: 'no-repeat' },
    contain: { size: 'contain', position: 'center center', repeat: 'no-repeat' },
    repeat: { size: 'auto', position: 'top left', repeat: 'repeat' },
    center: { size: 'auto', position: 'center center', repeat: 'no-repeat' }
  };
  return styles[style] || styles.cover;
}

function updateBackgroundOverlay(opacity, theme) {
  const overlayId = 'background-opacity-overlay';
  const clamped = clampNumber(opacity, 0, 100, defaultSettings.backgroundOpacity);
  let overlay = document.getElementById(overlayId);

  if (clamped >= 100) {
    if (overlay) {
      overlay.remove();
    }
    return;
  }

  const alpha = (100 - clamped) / 100;
  const color = theme === 'dark' ? '0, 0, 0' : '255, 255, 255';

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '0';
    document.body.insertBefore(overlay, document.body.firstChild);

    const appRoot = document.getElementById('app');
    if (appRoot) {
      if (!appRoot.style.position) {
        appRoot.style.position = 'relative';
      }
      if (!appRoot.style.zIndex) {
        appRoot.style.zIndex = '1';
      }
    }
  }

  overlay.style.backgroundColor = `rgba(${color}, ${alpha})`;
}

function applyCustomCss(css) {
  let styleElement = document.getElementById('custom-css');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'custom-css';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = css || '';
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

// 数据管理
class DataManager {
  constructor() {
    this.STORAGE_KEY = 'speed_dial_bookmarks';
  }

  // 获取所有书签
  async getBookmarks() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  }

  // 保存书签
  async saveBookmarks(bookmarks) {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: bookmarks });
  }

  // 添加书签
  async addBookmark(bookmark) {
    const bookmarks = await this.getBookmarks();
    bookmark.id = Date.now().toString();
    bookmark.createdAt = Date.now();
    bookmarks.push(bookmark);
    await this.saveBookmarks(bookmarks);
    return bookmark;
  }

  // 更新书签
  async updateBookmark(id, updates) {
    const bookmarks = await this.getBookmarks();
    const index = bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      bookmarks[index] = { ...bookmarks[index], ...updates };
      await this.saveBookmarks(bookmarks);
      return bookmarks[index];
    }
    return null;
  }

  // 删除书签
  async deleteBookmark(id) {
    const bookmarks = await this.getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== id);
    await this.saveBookmarks(filtered);
  }

  // 获取网站图标
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (e) {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect fill="%23ccc" width="48" height="48"/></svg>';
    }
  }

  // 获取缩略图
  async getThumbnail(url) {
    try {
      const key = `thumbnail_${url}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (e) {
      return null;
    }
  }

  // 保存缩略图
  async saveThumbnail(url, thumbnail) {
    try {
      const key = `thumbnail_${url}`;
      await chrome.storage.local.set({ [key]: thumbnail });
      return true;
    } catch (e) {
      console.error('保存缩略图失败:', e);
      return false;
    }
  }

  // 截取网页缩略图
  async captureThumbnail(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'captureTab', url: url },
        (response) => {
          if (response && response.success) {
            resolve(response.thumbnail);
          } else {
            console.error('截图失败:', response?.error);
            resolve(null);
          }
        }
      );
    });
  }
}

// UI管理器
class UIManager {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.currentEditingId = null;
    this.sidebarElement = null;
    this.sidebarHoverHandle = null;
    this.sidebarToggleButton = null;
    this.sidebarCloseTimeout = null;
    this.currentSettings = { ...defaultSettings };
    this.contextMenuElement = null;
    this.contextMenuVisible = false;
    this.lastContextMenuTrigger = null;
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.applySettings();
    await this.loadDials();
    await this.loadRecentTabs();
  }

  bindEvents() {
    // 添加书签按钮
    document.getElementById('add-dial-btn').addEventListener('click', () => {
      this.openAddModal();
    });

    // 模态框事件
    document.getElementById('modal-close').addEventListener('click', () => {
      this.closeModal('dial-modal');
    });

    document.getElementById('modal-cancel').addEventListener('click', () => {
      this.closeModal('dial-modal');
    });

    document.getElementById('modal-save').addEventListener('click', () => {
      this.saveDial();
    });

    // 确认删除模态框
    document.getElementById('confirm-cancel').addEventListener('click', () => {
      this.closeModal('confirm-modal');
    });

    document.getElementById('confirm-delete').addEventListener('click', () => {
      this.confirmDelete();
    });

    // 重新截取缩略图按钮
    document.getElementById('capture-thumbnail-btn').addEventListener('click', () => {
      this.captureThumbnailForCurrentBookmark();
    });

    // 书签搜索
    document.getElementById('bookmark-search').addEventListener('input', (e) => {
      this.searchBookmarks(e.target.value);
    });

    // 最近标签页搜索
    document.getElementById('recent-tabs-search').addEventListener('input', (e) => {
      this.loadRecentTabs(e.target.value);
    });

    // 设置按钮
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeSidebar();
      }
    });

    this.bindSidebarInteractions();

    // 点击模态框背景关闭
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    this.bindContextMenu();
  }

  bindSidebarInteractions() {
    this.sidebarElement = document.getElementById('sidebar');
    this.sidebarHoverHandle = document.getElementById('sidebar-hover-handle');
    this.sidebarToggleButton = document.getElementById('sidebar-toggle');

    if (this.sidebarToggleButton) {
      this.sidebarToggleButton.addEventListener('click', () => this.toggleSidebar());
      this.sidebarToggleButton.setAttribute('aria-controls', 'sidebar');
      this.sidebarToggleButton.setAttribute('aria-expanded', 'false');
    }

    if (this.sidebarHoverHandle) {
      this.sidebarHoverHandle.addEventListener('mouseenter', () => this.openSidebar());
      this.sidebarHoverHandle.addEventListener('focus', () => this.openSidebar());
      this.sidebarHoverHandle.addEventListener('mouseleave', () => this.scheduleSidebarClose());
      this.sidebarHoverHandle.addEventListener('blur', () => this.scheduleSidebarClose());
      this.sidebarHoverHandle.setAttribute('aria-expanded', 'false');
    }

    if (this.sidebarElement) {
      this.sidebarElement.addEventListener('mouseenter', () => this.cancelSidebarClose());
      this.sidebarElement.addEventListener('mouseleave', () => this.scheduleSidebarClose());
    }
  }

  toggleSidebar() {
    if (!this.sidebarElement) {
      return;
    }
    if (this.sidebarElement.classList.contains('open')) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  openSidebar() {
    if (!this.sidebarElement) {
      return;
    }
    this.cancelSidebarClose();
    this.sidebarElement.classList.add('open');
    this.setSidebarAriaState(true);
  }

  closeSidebar() {
    if (!this.sidebarElement) {
      return;
    }
    this.cancelSidebarClose();
    this.sidebarElement.classList.remove('open');
    this.setSidebarAriaState(false);
  }

  scheduleSidebarClose() {
    if (!this.sidebarElement || !this.sidebarElement.classList.contains('open')) {
      return;
    }
    this.cancelSidebarClose();
    this.sidebarCloseTimeout = setTimeout(() => {
      this.closeSidebar();
    }, 250);
  }

  cancelSidebarClose() {
    if (this.sidebarCloseTimeout) {
      clearTimeout(this.sidebarCloseTimeout);
      this.sidebarCloseTimeout = null;
    }
  }

  setSidebarAriaState(isOpen) {
    const expanded = isOpen ? 'true' : 'false';
    if (this.sidebarToggleButton) {
      this.sidebarToggleButton.setAttribute('aria-expanded', expanded);
    }
    if (this.sidebarHoverHandle) {
      this.sidebarHoverHandle.setAttribute('aria-expanded', expanded);
    }
  }

  bindContextMenu() {
    this.contextMenuElement = document.getElementById('context-menu');
    if (!this.contextMenuElement) {
      return;
    }

    document.addEventListener('contextmenu', (event) => {
      if (this.shouldUseNativeContextMenu(event)) {
        this.hideContextMenu();
        return;
      }
      event.preventDefault();
      this.openContextMenu(event.clientX, event.clientY, event.target);
    });

    document.addEventListener('click', (event) => {
      if (this.contextMenuVisible && this.contextMenuElement && !this.contextMenuElement.contains(event.target)) {
        this.hideContextMenu();
      }
    });

    window.addEventListener('blur', () => this.hideContextMenu());
    window.addEventListener('resize', () => this.hideContextMenu());

    this.contextMenuElement.addEventListener('click', (event) => {
      const actionTarget = event.target.closest('[data-action]');
      if (!actionTarget) {
        return;
      }
      const action = actionTarget.dataset.action;
      this.handleContextMenuAction(action);
      this.hideContextMenu();
    });

    this.contextMenuElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        if (this.shouldUseNativeContextMenu({ target: document.activeElement })) {
          return;
        }
        event.preventDefault();
        const rect = document.activeElement && typeof document.activeElement.getBoundingClientRect === 'function'
          ? document.activeElement.getBoundingClientRect()
          : null;
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        this.openContextMenu(x, y, document.activeElement);
      } else if (event.key === 'Escape') {
        this.hideContextMenu();
      }
    });
  }

  shouldUseNativeContextMenu(event) {
    const target = event?.target;
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }

    if (target.closest('input, textarea, select, [contenteditable="true"], .allow-native-context')) {
      return true;
    }

    if (target.closest('.modal.open')) {
      return true;
    }

    return false;
  }

  openContextMenu(clientX, clientY, triggerElement = null) {
    if (!this.contextMenuElement) {
      return;
    }

    this.lastContextMenuTrigger = triggerElement instanceof HTMLElement ? triggerElement : null;
    this.contextMenuElement.classList.add('open');
    this.contextMenuElement.setAttribute('aria-hidden', 'false');
    this.contextMenuElement.style.left = '0px';
    this.contextMenuElement.style.top = '0px';
    this.contextMenuVisible = true;

    requestAnimationFrame(() => {
      this.positionContextMenu(clientX, clientY);
      const firstItem = this.contextMenuElement?.querySelector('[data-action]');
      if (firstItem) {
        firstItem.focus();
      }
    });
  }

  positionContextMenu(clientX, clientY) {
    if (!this.contextMenuElement) {
      return;
    }

    const { innerWidth, innerHeight } = window;
    const rect = this.contextMenuElement.getBoundingClientRect();
    let left = clientX;
    let top = clientY;

    if (left + rect.width > innerWidth) {
      left = innerWidth - rect.width - 12;
    }
    if (top + rect.height > innerHeight) {
      top = innerHeight - rect.height - 12;
    }

    left = Math.max(12, left);
    top = Math.max(12, top);

    this.contextMenuElement.style.left = `${left}px`;
    this.contextMenuElement.style.top = `${top}px`;
  }

  hideContextMenu() {
    if (!this.contextMenuElement || !this.contextMenuVisible) {
      return;
    }

    this.contextMenuElement.classList.remove('open');
    this.contextMenuElement.setAttribute('aria-hidden', 'true');
    this.contextMenuVisible = false;

    if (this.lastContextMenuTrigger && typeof this.lastContextMenuTrigger.focus === 'function') {
      this.lastContextMenuTrigger.focus();
    }
    this.lastContextMenuTrigger = null;
  }

  handleContextMenuAction(action) {
    switch (action) {
      case 'add-dial':
        this.openAddModal();
        break;
      case 'open-settings':
        chrome.runtime.openOptionsPage();
        break;
      default:
        break;
    }
  }

  // 加载书签磁贴
  async loadDials() {
    const bookmarks = await this.dataManager.getBookmarks();
    const grid = document.getElementById('dials-grid');

    // 清空现有项（除了添加按钮）
    const addBtn = document.getElementById('add-dial-btn');
    grid.innerHTML = '';

    // 先添加书签项（保持存储的顺序）
    bookmarks.forEach(bookmark => {
      const dialItem = this.createDialItem(bookmark);
      grid.appendChild(dialItem);
    });

    // 最后添加"添加书签"按钮
    grid.appendChild(addBtn);
  }

  createDialItem(bookmark) {
    const item = document.createElement('div');
    item.className = 'dial-item';
    item.dataset.id = bookmark.id;
    item.draggable = true; // 使元素可拖拽

    const faviconUrl = this.dataManager.getFaviconUrl(bookmark.url);

    item.innerHTML = `
      <div class="dial-content">
        <div class="dial-thumbnail-shell">
          <img src="" alt="缩略图" class="dial-thumbnail-image" loading="lazy" decoding="async">
          <img src="${faviconUrl}" alt="" class="dial-favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23ccc%22 width=%2248%22 height=%2248%22/></svg>'">
        </div>
        <div class="dial-title">${this.escapeHtml(bookmark.title)}</div>
        <div class="dial-actions">
          <button class="dial-action-btn edit" data-id="${bookmark.id}" title="编辑">✏️</button>
          <button class="dial-action-btn delete" data-id="${bookmark.id}" title="删除">🗑️</button>
        </div>
      </div>
    `;

    const thumbnailImage = item.querySelector('.dial-thumbnail-image');
    const faviconElement = item.querySelector('.dial-favicon');

    const applyThumbnail = (source) => {
      if (!thumbnailImage) {
        return;
      }
      if (source) {
        thumbnailImage.src = source;
        thumbnailImage.alt = `${bookmark.title} 缩略图`;
        thumbnailImage.style.display = 'block';
        item.classList.add('has-thumbnail');
        if (faviconElement) {
          faviconElement.style.display = 'none';
        }
      }
    };

    if (thumbnailImage) {
      thumbnailImage.style.display = 'none';
      thumbnailImage.addEventListener('error', () => {
        thumbnailImage.style.display = 'none';
        thumbnailImage.removeAttribute('src');
        thumbnailImage.alt = '缩略图加载失败';
        item.classList.remove('has-thumbnail');
        if (faviconElement) {
          faviconElement.style.display = '';
        }
      });
    }

    if (bookmark.customThumbnailUrl) {
      applyThumbnail(bookmark.customThumbnailUrl);
    } else {
      this.dataManager.getThumbnail(bookmark.url).then(thumbnail => {
        if (thumbnail) {
          applyThumbnail(thumbnail);
        }
      });
    }

    // 拖拽事件
    item.addEventListener('dragstart', (e) => this.handleDragStart(e));
    item.addEventListener('dragover', (e) => this.handleDragOver(e));
    item.addEventListener('drop', (e) => this.handleDrop(e));
    item.addEventListener('dragend', (e) => this.handleDragEnd(e));

    // 点击打开链接
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('dial-action-btn')) {
        window.location.href = bookmark.url;
      }
    });

    // 编辑按钮
    item.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(bookmark.id);
    });

    // 删除按钮
    item.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDeleteConfirm(bookmark.id);
    });

    return item;
  }

  // 打开编辑模态框
  async openEditModal(id) {
    this.currentEditingId = id;
    const bookmarks = await this.dataManager.getBookmarks();
    const bookmark = bookmarks.find(b => b.id === id);

    if (bookmark) {
      document.getElementById('modal-title').textContent = '编辑书签';
      document.getElementById('dial-url').value = bookmark.url;
      document.getElementById('dial-title').value = bookmark.title;
      const thumbnailInput = document.getElementById('dial-thumbnail-url');
      if (thumbnailInput) {
        thumbnailInput.value = bookmark.customThumbnailUrl || '';
      }
      // 显示重新截图按钮
      document.getElementById('capture-thumbnail-group').style.display = 'block';
      this.openModal('dial-modal');
    }
  }

  // 打开添加模态框
  openAddModal() {
    this.currentEditingId = null;
    document.getElementById('modal-title').textContent = '添加书签';
    document.getElementById('dial-url').value = '';
    document.getElementById('dial-title').value = '';
    const thumbnailInput = document.getElementById('dial-thumbnail-url');
    if (thumbnailInput) {
      thumbnailInput.value = '';
    }
    // 隐藏重新截图按钮
    document.getElementById('capture-thumbnail-group').style.display = 'none';
    this.openModal('dial-modal');
  }

  // 为当前编辑的书签重新截图
  async captureThumbnailForCurrentBookmark() {
    const url = document.getElementById('dial-url').value.trim();

    if (!url) {
      alert('请先输入网址');
      return;
    }

    // 确保URL格式正确
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }

    try {
      new URL(formattedUrl);
    } catch (e) {
      alert('请输入有效的网址');
      return;
    }

    // 禁用按钮并显示加载状态
    const btn = document.getElementById('capture-thumbnail-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ 正在截图...';

    try {
      const thumbnail = await this.dataManager.captureThumbnail(formattedUrl);
      if (thumbnail) {
        await this.dataManager.saveThumbnail(formattedUrl, thumbnail);
        btn.textContent = '✅ 截图完成！';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      } else {
        throw new Error('截图失败');
      }
    } catch (err) {
      console.error('截图失败:', err);
      alert('截图失败，请稍后重试');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  normalizeThumbnailUrl(rawValue) {
    if (!rawValue) {
      return '';
    }

    const trimmed = rawValue.trim();
    if (trimmed.toLowerCase().startsWith('data:image')) {
      return trimmed;
    }

    let formatted = trimmed;
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
    }

    try {
      const parsed = new URL(formatted);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  // 保存书签
  async saveDial() {
    const url = document.getElementById('dial-url').value.trim();
    const title = document.getElementById('dial-title').value.trim();
    const thumbnailInput = document.getElementById('dial-thumbnail-url');
    const rawThumbnailUrl = thumbnailInput ? thumbnailInput.value.trim() : '';

    if (!url || !title) {
      alert('请填写完整信息');
      return;
    }

    // 确保URL格式正确
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }

    try {
      new URL(formattedUrl);
    } catch (e) {
      alert('请输入有效的网址');
      return;
    }

    const normalizedThumbnailUrl = this.normalizeThumbnailUrl(rawThumbnailUrl);
    if (rawThumbnailUrl && normalizedThumbnailUrl === null) {
      alert('请输入有效的图片 URL');
      return;
    }

    const bookmarkPayload = {
      url: formattedUrl,
      title: title,
      customThumbnailUrl: normalizedThumbnailUrl || ''
    };

    if (this.currentEditingId) {
      // 更新
      await this.dataManager.updateBookmark(this.currentEditingId, bookmarkPayload);
    } else {
      // 添加
      const bookmark = await this.dataManager.addBookmark(bookmarkPayload);

      if (!bookmarkPayload.customThumbnailUrl) {
        // 异步截取缩略图（不阻塞UI）
        this.dataManager.captureThumbnail(formattedUrl).then(thumbnail => {
          if (thumbnail) {
            this.dataManager.saveThumbnail(formattedUrl, thumbnail).then(() => {
              console.log('缩略图已保存:', formattedUrl);
              // 重新加载以显示缩略图
              this.loadDials();
            });
          }
        }).catch(err => {
          console.error('截图失败:', err);
        });
      }
    }

    this.closeModal('dial-modal');
    this.loadDials();
  }

  // 打开删除确认
  openDeleteConfirm(id) {
    this.currentEditingId = id;
    this.openModal('confirm-modal');
  }

  // 确认删除
  async confirmDelete() {
    if (this.currentEditingId) {
      await this.dataManager.deleteBookmark(this.currentEditingId);
      this.closeModal('confirm-modal');
      this.loadDials();
    }
  }

  // 模态框控制
  openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
  }
  async loadApps() {
    try {
      const apps = await chrome.management.getAll();
      const appsList = document.getElementById('apps-list');
      appsList.innerHTML = '';

      apps
        .filter(app => app.type === 'extension' && app.enabled && app.isApp)
        .forEach(app => {
          const appItem = this.createAppItem(app);
          appsList.appendChild(appItem);
        });

      // 如果没有应用，显示提示
      if (appsList.children.length === 0) {
        appsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">暂无应用</p>';
      }
    } catch (error) {
      console.error('加载应用失败:', error);
    }
  }

  updateSidebarLayout(showApps) {
    const sidebar = document.getElementById('sidebar');
    const sidebarContent = document.querySelector('.sidebar-content');
    const appsSection = document.querySelector('.sidebar-section[data-section="apps"]');

    if (sidebarContent) {
      const columnCount = showApps ? 3 : 2;
      sidebarContent.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
    }

    if (appsSection) {
      if (showApps) {
        appsSection.style.display = 'flex';
        appsSection.setAttribute('aria-hidden', 'false');
      } else {
        appsSection.style.display = 'none';
        appsSection.setAttribute('aria-hidden', 'true');
      }
    }

    if (sidebar) {
      sidebar.style.width = showApps ? '1080px' : '720px';
    }
  }

  createAppItem(app) {
    const item = document.createElement('div');
    item.className = 'app-item';

    const iconUrl = app.icons && app.icons.length > 0
      ? app.icons[app.icons.length - 1].url
      : '';

    item.innerHTML = `
      <img src="${iconUrl}" alt="" class="app-icon" onerror="this.style.display='none'">
      <div class="app-name">${this.escapeHtml(app.name)}</div>
    `;

    item.addEventListener('click', () => {
      if (app.id) {
        chrome.management.launchApp(app.id);
      }
    });

    return item;
  }

  // 加载最近关闭的标签页
  async loadRecentTabs(searchQuery = '') {
    try {
      const recentTabsList = document.getElementById('recent-tabs-list');
      recentTabsList.innerHTML = '';

      // 如果有搜索词，从历史记录中搜索
      if (searchQuery.trim()) {
        const historyItems = await chrome.history.search({
          text: searchQuery,
          maxResults: 50,
          startTime: 0
        });

        if (historyItems.length === 0) {
          recentTabsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">未找到匹配的历史记录</p>';
          return;
        }

        historyItems.forEach(item => {
          const tabItem = this.createHistoryItem(item);
          recentTabsList.appendChild(tabItem);
        });
      } else {
        // 没有搜索词，显示最近关闭的标签页
        const settings = await readSettings();
        const maxResults = clampNumber(settings.maxRecentTabs, 5, 100, defaultSettings.maxRecentTabs);

        const sessions = await chrome.sessions.getRecentlyClosed({ maxResults });
        const tabs = sessions.filter(session => session.tab);

        if (tabs.length === 0) {
          recentTabsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">暂无最近关闭的标签页</p>';
          return;
        }

        tabs.forEach(session => {
          const tabItem = this.createRecentTabItem(session);
          recentTabsList.appendChild(tabItem);
        });
      }
    } catch (error) {
      console.error('加载最近标签页失败:', error);
      document.getElementById('recent-tabs-list').innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">无法加载标签页</p>';
    }
  }

  createRecentTabItem(session) {
    const tab = session.tab;
    const item = document.createElement('div');
    item.className = 'recent-tab-item';

    const faviconUrl = tab.favIconUrl || this.dataManager.getFaviconUrl(tab.url || '');

    item.innerHTML = `
      <img src="${faviconUrl}" alt="" class="recent-tab-favicon" onerror="this.style.display='none'">
      <div class="recent-tab-info">
        <div class="recent-tab-title">${this.escapeHtml(tab.title || 'Untitled')}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      if (session.tab.sessionId) {
        chrome.sessions.restore(session.tab.sessionId);
      } else if (tab.url) {
        window.open(tab.url, '_blank');
      }
    });

    return item;
  }

  // 创建历史记录项
  createHistoryItem(historyItem) {
    const item = document.createElement('div');
    item.className = 'recent-tab-item';

    const faviconUrl = this.dataManager.getFaviconUrl(historyItem.url || '');
    const timeAgo = this.getTimeAgo(historyItem.lastVisitTime);

    item.innerHTML = `
      <img src="${faviconUrl}" alt="" class="recent-tab-favicon" onerror="this.style.display='none'">
      <div class="recent-tab-info">
        <div class="recent-tab-title">${this.escapeHtml(historyItem.title || historyItem.url || 'Untitled')}</div>
        <div class="recent-tab-time">${timeAgo}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      if (historyItem.url) {
        window.open(historyItem.url, '_blank');
      }
    });

    return item;
  }

  // 搜索Chrome书签
  async searchBookmarks(query) {
    const bookmarksList = document.getElementById('bookmarks-list');

    if (!query.trim()) {
      this.loadChromeBookmarks('1');
      return;
    }

    try {
      const results = await chrome.bookmarks.search(query);
      bookmarksList.innerHTML = '';

      // 添加返回按钮
      const backItem = document.createElement('div');
      backItem.className = 'bookmark-item bookmark-back';
      backItem.innerHTML = `
        <span class="bookmark-back-icon">←</span>
        <div class="bookmark-title">返回</div>
      `;
      backItem.addEventListener('click', () => {
        document.getElementById('bookmark-search').value = '';
        this.loadChromeBookmarks('1');
      });
      bookmarksList.appendChild(backItem);

      if (results.length === 0) {
        bookmarksList.innerHTML += '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">未找到书签</p>';
        return;
      }

      results.forEach(bookmark => {
        if (bookmark.url) {
          const item = this.createBookmarkItem(bookmark);
          bookmarksList.appendChild(item);
        }
      });
    } catch (error) {
      console.error('搜索书签失败:', error);
    }
  }

  // 加载Chrome书签
  async loadChromeBookmarks(folderId = '1') {
    try {
      const bookmarksList = document.getElementById('bookmarks-list');
      bookmarksList.innerHTML = '';

      // 获取当前文件夹
      const folder = await chrome.bookmarks.getSubTree(folderId);

      if (folder && folder[0]) {
        const currentFolder = folder[0];

        // 如果不是根目录，显示返回按钮
        if (currentFolder.parentId) {
          const backItem = document.createElement('div');
          backItem.className = 'bookmark-item bookmark-back';
          backItem.innerHTML = `
            <span class="bookmark-back-icon">←</span>
            <div class="bookmark-title">返回上一级</div>
          `;
          backItem.addEventListener('click', () => {
            this.loadChromeBookmarks(currentFolder.parentId);
          });
          bookmarksList.appendChild(backItem);
        }

        const bookmarks = currentFolder.children || [];

        if (bookmarks.length === 0) {
          bookmarksList.innerHTML += '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">暂无书签</p>';
          return;
        }

        bookmarks.forEach(bookmark => {
          const item = this.createBookmarkItem(bookmark);
          bookmarksList.appendChild(item);
        });
      }
    } catch (error) {
      console.error('加载书签失败:', error);
      document.getElementById('bookmarks-list').innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 14px;">无法加载书签</p>';
    }
  }

  createBookmarkItem(bookmark) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';

    if (bookmark.url) {
      const faviconUrl = this.dataManager.getFaviconUrl(bookmark.url);
      item.innerHTML = `
        <img src="${faviconUrl}" alt="" class="bookmark-favicon" onerror="this.style.display='none'">
        <div class="bookmark-title">${this.escapeHtml(bookmark.title || bookmark.url)}</div>
      `;

      item.addEventListener('click', () => {
        window.open(bookmark.url, '_blank');
      });
    } else {
      // 文件夹
      item.classList.add('bookmark-folder-item');
      item.innerHTML = `
        <span class="bookmark-folder-icon">📁</span>
        <div class="bookmark-title bookmark-folder">${this.escapeHtml(bookmark.title)}</div>
        <span class="bookmark-folder-arrow">›</span>
      `;

      item.addEventListener('click', () => {
        this.loadChromeBookmarks(bookmark.id);
      });
    }

    return item;
  }

  // 时间格式化
  getTimeAgo(timestamp) {
    // Chrome sessions API返回的时间戳是以秒为单位的，需要转换为毫秒
    const now = Date.now();

    // 如果时间戳无效，返回未知
    if (!timestamp || timestamp <= 0) {
      return '未知时间';
    }

    // 判断时间戳单位：如果小于10000000000，说明是秒级时间戳，需要转换为毫秒
    let timestampMs = timestamp;
    if (timestamp < 10000000000) {
      timestampMs = timestamp * 1000;
    }

    const diff = now - timestampMs;

    // 如果差值为负数或过大，可能是数据错误
    if (diff < 0 || diff > 365 * 24 * 60 * 60 * 1000) {
      return new Date(timestampMs).toLocaleDateString('zh-CN');
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 10) return '刚刚';
    if (seconds < 60) return `${seconds} 秒前`;
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return new Date(timestampMs).toLocaleDateString('zh-CN');
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 拖拽处理方法
  handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    this.draggedElement = e.target;
  }

  handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.dial-item');
    if (target && target !== this.draggedElement) {
      const container = document.getElementById('dials-grid');
      const afterElement = this.getDragAfterElement(container, e.clientX, e.clientY);

      if (afterElement == null) {
        container.appendChild(this.draggedElement);
      } else {
        container.insertBefore(this.draggedElement, afterElement);
      }
    }
    return false;
  }

  handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    return false;
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    this.saveBookmarkOrder();
  }

  getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.dial-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  async saveBookmarkOrder() {
    const items = document.querySelectorAll('.dial-item:not(.add-dial)');
    const bookmarks = await this.dataManager.getBookmarks();
    const newOrder = [];

    items.forEach((item) => {
      const id = item.dataset.id; // 保持字符串类型
      const bookmark = bookmarks.find(b => b.id === id);
      if (bookmark) {
        newOrder.push(bookmark);
      }
    });

    // 确保新顺序包含所有书签
    if (newOrder.length === bookmarks.length) {
      await this.dataManager.saveBookmarks(newOrder);
      console.log('书签顺序已保存:', newOrder.map(b => b.title));
    } else {
      console.error('书签数量不匹配，取消保存');
    }
  }

  // 应用设置
  async applySettings() {
    try {
      const settings = await readSettings();
      this.currentSettings = settings;
      const root = document.documentElement;
      const body = document.body;

      // 应用主题
      if (settings.theme === 'dark') {
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

      const backgroundColor = settings.backgroundColor || (settings.theme === 'dark' ? '#1a1a1a' : defaultSettings.backgroundColor);
      body.style.backgroundColor = backgroundColor;

      // 应用列数设置
      const dialsGrid = document.getElementById('dials-grid');
      if (dialsGrid) {
        if (settings.columns && settings.columns !== 'auto') {
          const columnCount = parseInt(settings.columns, 10);
          if (Number.isFinite(columnCount) && columnCount > 0) {
            dialsGrid.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
          } else {
            dialsGrid.style.gridTemplateColumns = '';
          }
        } else {
          dialsGrid.style.gridTemplateColumns = '';
        }
      }

      // 清理旧版本残留的覆盖层
      const legacyOverlay = document.getElementById('bg-overlay');
      if (legacyOverlay) {
        legacyOverlay.remove();
      }

      // 应用背景
      if (settings.backgroundImageData || settings.backgroundImage) {
        const bgUrl = settings.backgroundImageData || settings.backgroundImage;
        const { size, position, repeat } = resolveBackgroundStyle(settings.backgroundStyle);

        body.style.backgroundImage = `url(${bgUrl})`;
        body.style.backgroundSize = size;
        body.style.backgroundPosition = position;
        body.style.backgroundRepeat = repeat;
        body.style.backgroundAttachment = 'fixed';

        updateBackgroundOverlay(settings.backgroundOpacity, settings.theme);
      } else {
        body.style.backgroundImage = '';
        body.style.backgroundSize = '';
        body.style.backgroundPosition = '';
        body.style.backgroundRepeat = '';
        body.style.backgroundAttachment = '';
        updateBackgroundOverlay(100, settings.theme);
      }

      // 应用字体大小
      const fontSizeMap = {
        small: '12px',
        medium: '14px',
        large: '16px',
        xlarge: '18px'
      };
      root.style.fontSize = fontSizeMap[settings.fontSize] || fontSizeMap.medium;

      // 应用显示图标与标题设置
      const showFavicons = toBoolean(settings.showFavicons, defaultSettings.showFavicons);
      root.style.setProperty('--favicon-display', showFavicons ? 'block' : 'none');

      const showTitles = toBoolean(settings.showTitles, defaultSettings.showTitles);
      root.style.setProperty('--title-display', showTitles ? '-webkit-box' : 'none');

      const showAddButton = toBoolean(settings.showAddButton, defaultSettings.showAddButton);
      const addButton = document.getElementById('add-dial-btn');
      if (addButton) {
        addButton.style.display = showAddButton ? '' : 'none';
        addButton.setAttribute('aria-hidden', showAddButton ? 'false' : 'true');
      }

      const showSettingsButton = toBoolean(settings.showSettingsButton, defaultSettings.showSettingsButton);
      const settingsButton = document.getElementById('settings-btn');
      if (settingsButton) {
        settingsButton.style.display = showSettingsButton ? '' : 'none';
        settingsButton.setAttribute('aria-hidden', showSettingsButton ? 'false' : 'true');
      }

      // 应用侧边栏位置
      const sidebar = document.getElementById('sidebar');
      const sidebarToggle = document.getElementById('sidebar-toggle');
      const sidebarHoverHandle = document.getElementById('sidebar-hover-handle');

      if (sidebar && sidebarToggle) {
        if (settings.sidebarPosition === 'left') {
          sidebar.classList.add('sidebar-left');
          sidebar.classList.remove('sidebar-right');
          sidebarToggle.style.left = '20px';
          sidebarToggle.style.right = 'auto';
        } else {
          sidebar.classList.add('sidebar-right');
          sidebar.classList.remove('sidebar-left');
          sidebarToggle.style.right = '20px';
          sidebarToggle.style.left = 'auto';
        }
      }

      if (sidebarHoverHandle) {
        if (settings.sidebarPosition === 'left') {
          sidebarHoverHandle.classList.add('left-position');
          sidebarHoverHandle.classList.remove('right-position');
        } else {
          sidebarHoverHandle.classList.add('right-position');
          sidebarHoverHandle.classList.remove('left-position');
        }
        const arrow = sidebarHoverHandle.querySelector('.handle-arrow');
        if (arrow) {
          arrow.textContent = settings.sidebarPosition === 'left' ? '›' : '‹';
        }
      }

      const showApps = toBoolean(settings.showApps, defaultSettings.showApps);
      this.updateSidebarLayout(showApps);
      if (showApps) {
        await this.loadApps();
      } else {
        const appsList = document.getElementById('apps-list');
        if (appsList) {
          appsList.innerHTML = '';
        }
      }

      applyCustomCss(settings.customCSS);

      const autoOpenSidebar = toBoolean(settings.autoOpenSidebar, defaultSettings.autoOpenSidebar);
      if (autoOpenSidebar) {
        setTimeout(() => {
          if (this.sidebarElement) {
            this.openSidebar();
          } else if (sidebar) {
            sidebar.classList.add('open');
          }
        }, 300);
      }

    } catch (error) {
      console.error('应用设置失败:', error);
    }
  }
}

// 初始化
const dataManager = new DataManager();
const uiManager = new UIManager(dataManager);

// 监听书签变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.speed_dial_bookmarks) {
    uiManager.loadDials();
  }
  // 监听设置变化
  if (namespace === 'local' && changes[SETTINGS_KEY]) {
    uiManager.applySettings();
  }
});

// 定期刷新最近标签页
setInterval(() => {
  uiManager.loadRecentTabs();
}, 30000); // 每30秒刷新一次

// 初始加载Chrome书签
uiManager.loadChromeBookmarks();
