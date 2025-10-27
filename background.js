// Service Worker for Speed Dial Extension

// 安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Speed Dial 扩展已安装');

    // 初始化默认数据
    chrome.storage.local.get('speed_dial_bookmarks', (result) => {
      if (!result.speed_dial_bookmarks) {
        // 添加一些默认书签
        const defaultBookmarks = [
          {
            id: Date.now().toString(),
            title: 'Google',
            url: 'https://www.google.com',
            createdAt: Date.now()
          },
          {
            id: (Date.now() + 1).toString(),
            title: 'GitHub',
            url: 'https://github.com',
            createdAt: Date.now()
          },
          {
            id: (Date.now() + 2).toString(),
            title: 'YouTube',
            url: 'https://www.youtube.com',
            createdAt: Date.now()
          }
        ];

        chrome.storage.local.set({ speed_dial_bookmarks: defaultBookmarks });
      }
    });
  } else if (details.reason === 'update') {
    console.log('Speed Dial 扩展已更新');
  }
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 可以在这里记录关闭的标签页
  console.log('标签页已关闭:', tabId);
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBookmarks') {
    chrome.storage.local.get('speed_dial_bookmarks', (result) => {
      sendResponse({ bookmarks: result.speed_dial_bookmarks || [] });
    });
    return true; // 保持消息通道开放
  }

  if (request.action === 'addBookmark') {
    chrome.storage.local.get('speed_dial_bookmarks', (result) => {
      const bookmarks = result.speed_dial_bookmarks || [];
      bookmarks.push(request.bookmark);
      chrome.storage.local.set({ speed_dial_bookmarks: bookmarks }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'deleteBookmark') {
    chrome.storage.local.get('speed_dial_bookmarks', (result) => {
      const bookmarks = result.speed_dial_bookmarks || [];
      const filtered = bookmarks.filter(b => b.id !== request.id);
      chrome.storage.local.set({ speed_dial_bookmarks: filtered }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

// 命令监听（可以添加键盘快捷键）
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-sidebar') {
    // 打开侧边栏的逻辑
    console.log('打开侧边栏');
  }
});

console.log('Speed Dial Service Worker 已启动');
