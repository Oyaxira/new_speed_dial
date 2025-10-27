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
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDials();
    this.loadApps();
    this.loadRecentTabs();
    this.applySettings();
  }

  bindEvents() {
    // 添加书签按钮
    document.getElementById('add-dial-btn').addEventListener('click', () => {
      this.openAddModal();
    });

    // 侧边栏切换
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
    });

    document.getElementById('sidebar-close').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
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

    // 点击模态框背景关闭
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });
  }

  // 加载快速拨号
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

    // 异步加载缩略图
    this.dataManager.getThumbnail(bookmark.url).then(thumbnail => {
      const content = item.querySelector('.dial-content');
      if (thumbnail && content) {
        // 如果有缩略图，显示缩略图作为背景
        content.style.backgroundImage = `url(${thumbnail})`;
        content.style.backgroundSize = 'contain';
        content.style.backgroundPosition = 'center';
        content.classList.add('has-thumbnail');
        // 隐藏favicon
        const favicon = content.querySelector('.dial-favicon');
        if (favicon) favicon.style.display = 'none';
      }
    });

    const faviconUrl = this.dataManager.getFaviconUrl(bookmark.url);

    item.innerHTML = `
      <div class="dial-content">
        <img src="${faviconUrl}" alt="" class="dial-favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23ccc%22 width=%2248%22 height=%2248%22/></svg>'">
        <div class="dial-title">${this.escapeHtml(bookmark.title)}</div>
        <div class="dial-actions">
          <button class="dial-action-btn edit" data-id="${bookmark.id}" title="编辑">✏️</button>
          <button class="dial-action-btn delete" data-id="${bookmark.id}" title="删除">🗑️</button>
        </div>
      </div>
    `;

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

  // 保存书签
  async saveDial() {
    const url = document.getElementById('dial-url').value.trim();
    const title = document.getElementById('dial-title').value.trim();

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

    if (this.currentEditingId) {
      // 更新
      await this.dataManager.updateBookmark(this.currentEditingId, {
        url: formattedUrl,
        title: title
      });
    } else {
      // 添加
      const bookmark = await this.dataManager.addBookmark({
        url: formattedUrl,
        title: title
      });

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

  // 加载应用程序
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
        const result = await chrome.storage.local.get('speed_dial_settings');
        const settings = result.speed_dial_settings || {};
        const maxResults = settings.maxRecentTabs || 20;

        const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: maxResults });
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
    // Chrome的时间戳是从Chrome纪元开始的，需要转换为标准时间戳
    // 添加调试信息
    console.log('Session lastModified:', session.lastModified, 'Type:', typeof session.lastModified);
    const timeAgo = this.getTimeAgo(session.lastModified);

    item.innerHTML = `
      <img src="${faviconUrl}" alt="" class="recent-tab-favicon" onerror="this.style.display='none'">
      <div class="recent-tab-info">
        <div class="recent-tab-title">${this.escapeHtml(tab.title || 'Untitled')}</div>
        <div class="recent-tab-time">${timeAgo}</div>
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
      const result = await chrome.storage.local.get('speed_dial_settings');
      const settings = result.speed_dial_settings || {};

      // 应用主题
      if (settings.theme === 'dark') {
        document.documentElement.style.setProperty('--bg-color', '#1a1a1a');
        document.documentElement.style.setProperty('--card-bg', '#2d2d2d');
        document.documentElement.style.setProperty('--text-color', '#e8eaed');
        document.documentElement.style.setProperty('--text-secondary', '#9aa0a6');
        document.documentElement.style.setProperty('--border-color', '#3c4043');
        document.documentElement.style.setProperty('--hover-bg', '#3c4043');
      } else {
        document.documentElement.style.setProperty('--bg-color', '#f5f5f5');
        document.documentElement.style.setProperty('--card-bg', '#ffffff');
        document.documentElement.style.setProperty('--text-color', '#202124');
        document.documentElement.style.setProperty('--text-secondary', '#5f6368');
        document.documentElement.style.setProperty('--border-color', '#dadce0');
        document.documentElement.style.setProperty('--hover-bg', '#f1f3f4');
      }

      // 应用列数设置
      const dialsGrid = document.getElementById('dials-grid');
      if (settings.columns && settings.columns !== 'auto') {
        dialsGrid.style.gridTemplateColumns = `repeat(${settings.columns}, 1fr)`;
      } else {
        dialsGrid.style.gridTemplateColumns = '';
      }

      // 应用背景图片
      if (settings.backgroundImageData || settings.backgroundImage) {
        const bgUrl = settings.backgroundImageData || settings.backgroundImage;
        const opacity = settings.backgroundOpacity || 100;
        const style = settings.backgroundStyle || 'cover';

        document.body.style.backgroundImage = `url(${bgUrl})`;
        document.body.style.backgroundSize = style;
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = style === 'repeat' ? 'repeat' : 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';

        // 应用不透明度
        if (opacity < 100) {
          // 移除旧的overlay
          const oldOverlay = document.getElementById('bg-overlay');
          if (oldOverlay) oldOverlay.remove();

          const overlay = document.createElement('div');
          overlay.id = 'bg-overlay';
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, ${(100 - opacity) / 100});
            pointer-events: none;
            z-index: -1;
          `;
          document.body.appendChild(overlay);
        }
      } else if (settings.backgroundColor) {
        document.body.style.backgroundColor = settings.backgroundColor;
        document.body.style.backgroundImage = '';
      }

      // 应用字体大小
      if (settings.fontSize) {
        const fontSizeMap = {
          small: '12px',
          medium: '14px',
          large: '16px',
          xlarge: '18px'
        };
        document.documentElement.style.fontSize = fontSizeMap[settings.fontSize] || '14px';
      }

      // 应用显示图标设置
      if (settings.showFavicons === false) {
        document.documentElement.style.setProperty('--favicon-display', 'none');
      } else {
        document.documentElement.style.setProperty('--favicon-display', 'block');
      }

      // 应用显示标题设置
      if (settings.showTitles === false) {
        document.documentElement.style.setProperty('--title-display', 'none');
      } else {
        document.documentElement.style.setProperty('--title-display', 'block');
      }

      // 应用侧边栏位置
      const sidebar = document.getElementById('sidebar');
      const sidebarToggle = document.getElementById('sidebar-toggle');

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

      // 自动打开侧边栏
      if (settings.autoOpenSidebar) {
        setTimeout(() => {
          sidebar.classList.add('open');
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
  if (namespace === 'local' && changes.speed_dial_settings) {
    uiManager.applySettings();
  }
});

// 定期刷新最近标签页
setInterval(() => {
  uiManager.loadRecentTabs();
}, 30000); // 每30秒刷新一次

// 初始加载Chrome书签
uiManager.loadChromeBookmarks();
