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

  // 截取当前标签页缩略图
  if (request.action === 'captureThumbnail') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('截图失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      // 压缩图片
      createImageBitmap(dataUrl).then(imageBitmap => {
        const canvas = new OffscreenCanvas(460, Math.ceil(460 / imageBitmap.width * imageBitmap.height));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

        canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 }).then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({ success: true, thumbnail: reader.result });
          };
          reader.readAsDataURL(blob);
        });
      }).catch(err => {
        // 如果createImageBitmap失败，直接返回原图
        sendResponse({ success: true, thumbnail: dataUrl });
      });
    });
    return true;
  }

  // 打开新标签页并截图
  if (request.action === 'captureTab') {
    // 创建一个激活的标签页，这样才能截图
    chrome.tabs.create({ url: request.url, active: true }, (tab) => {
      const tabId = tab.id;
      const windowId = tab.windowId;

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          // 等待页面渲染
          setTimeout(() => {
            chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 80 }, async (dataUrl) => {
              if (chrome.runtime.lastError) {
                console.error('截图失败:', chrome.runtime.lastError);
                chrome.tabs.remove(tabId).catch(() => {});
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
              }

              try {
                // 使用 fetch 和 createImageBitmap 来处理图片（Service Worker 兼容）
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const imageBitmap = await createImageBitmap(blob);

                // 计算缩放后的尺寸（提高分辨率到920px）
                const targetWidth = 920;
                const targetHeight = Math.ceil(targetWidth / imageBitmap.width * imageBitmap.height);

                // 使用 OffscreenCanvas 压缩图片
                const canvas = new OffscreenCanvas(targetWidth, targetHeight);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

                // 转换为 Blob 然后转为 Data URL（提高质量到85%）
                const compressedBlob = await canvas.convertToBlob({
                  type: 'image/jpeg',
                  quality: 1
                });

                const reader = new FileReader();
                reader.onloadend = () => {
                  // 截图完成后关闭标签页
                  chrome.tabs.remove(tabId).catch(() => {});
                  sendResponse({ success: true, thumbnail: reader.result });
                };
                reader.readAsDataURL(compressedBlob);

              } catch (err) {
                console.error('图片压缩失败:', err);
                // 如果压缩失败，直接返回原始截图
                chrome.tabs.remove(tabId).catch(() => {});
                sendResponse({ success: true, thumbnail: dataUrl });
              }
            });
          }, 1500);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // 15秒超时
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.remove(tabId).catch(() => {});
        sendResponse({ success: false, error: '截图超时' });
      }, 15000);
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
