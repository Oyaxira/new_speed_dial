// 获取统计数据
async function loadStats() {
  try {
    // 获取书签数量
    const result = await chrome.storage.local.get('speed_dial_bookmarks');
    const bookmarks = result.speed_dial_bookmarks || [];
    document.getElementById('bookmark-count').textContent = bookmarks.length;

    // 获取最近标签数量
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
    const recentTabs = sessions.filter(session => session.tab);
    document.getElementById('recent-count').textContent = recentTabs.length;
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

// 打开新标签页
document.getElementById('open-newtab').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://newtab/' });
  window.close();
});

// 添加当前页面
document.getElementById('add-current').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      const result = await chrome.storage.local.get('speed_dial_bookmarks');
      const bookmarks = result.speed_dial_bookmarks || [];

      // 检查是否已存在
      const exists = bookmarks.some(b => b.url === tab.url);
      if (exists) {
        alert('该页面已添加到书签！');
        return;
      }

      const newBookmark = {
        id: Date.now().toString(),
        title: tab.title || 'Untitled',
        url: tab.url,
        createdAt: Date.now()
      };

      bookmarks.push(newBookmark);
      await chrome.storage.local.set({ speed_dial_bookmarks: bookmarks });

      alert('已添加到书签台！');
      loadStats();
    } else {
      alert('无法添加此页面！');
    }
  } catch (error) {
    console.error('添加书签失败:', error);
    alert('添加失败，请重试！');
  }
});

// 打开设置页面
document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// 初始加载
loadStats();
