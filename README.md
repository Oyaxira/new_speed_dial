# Speed Dial - 快速拨号扩展

一个功能丰富的 Chrome 扩展，用于替代默认的新标签页，提供快速拨号、书签管理和侧边栏功能。基于 Manifest V3 开发。

## 🌟 主要功能

### 1. 快速拨号 (Speed Dial)
- ✅ 添加、编辑、删除快速拨号书签
- ✅ 自动获取网站图标
- ✅ 支持搜索和过滤
- ✅ 响应式网格布局
- ✅ 可自定义网格列数

### 2. 侧边栏功能
- ✅ **应用程序列表**：快速访问已安装的 Chrome 应用
- ✅ **书签管理**：浏览和搜索 Chrome 书签
- ✅ **最近标签页**：查看和恢复最近关闭的标签页
- ✅ 可自定义侧边栏位置（左侧/右侧）

### 3. 自定义设置
- ✅ 主题切换（浅色/深色）
- ✅ 自定义网格列数
- ✅ 背景颜色设置
- ✅ 字体大小调整
- ✅ 自定义 CSS 支持

### 4. 数据管理
- ✅ 导出/导入书签和设置
- ✅ 本地数据存储
- ✅ 数据备份恢复

### 5. 其他特性
- 🎨 现代化UI设计
- 🔍 实时搜索功能
- ⚡ 快速响应
- 📱 响应式布局
- ⌨️ 键盘快捷键支持

## 🚀 安装方法

### 方法1：开发者模式安装

## 📁 项目结构

```
new_speed_dial/
├── manifest.json           # 扩展配置文件
├── background.js          # 后台服务脚本
├── newtab.html           # 新标签页 HTML
├── popup.html            # 弹窗页面
├── options.html          # 设置页面
├── README.md             # 说明文档
├── icons/                # 图标文件夹
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── scripts/              # JavaScript 脚本
│   ├── newtab.js        # 新标签页逻辑
│   ├── popup.js         # 弹窗逻辑
│   ├── options.js       # 设置页面逻辑
│   ├── utils.js         # 工具函数
│   └── settings.js      # 设置管理
└── styles/              # 样式文件
    ├── newtab.css       # 新标签页样式
    └── sidebar.css      # 侧边栏样式
``` newtab.html           # 新标签页HTML
├── popup.html            # 弹出窗口HTML
├── README.md             # 说明文档
├── icons/                # 图标文件夹
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── styles/               # 样式文件
│   └── newtab.css
└── scripts/              # JavaScript文件
    ├── newtab.js
    └── popup.js
```

## 🎯 使用说明

### 添加书签
1. 打开新标签页
2. 点击"+"按钮
3. 输入网址和标题
4. 点击保存

### 编辑书签
1. 鼠标悬停在书签上
2. 点击编辑按钮（✏️）
3. 修改信息后保存

### 删除书签
1. 鼠标悬停在书签上
2. 点击删除按钮（🗑️）
3. 确认删除

### 使用侧边栏
1. 点击右下角的侧边栏按钮（☰）
2. 浏览应用程序、书签和最近标签页
3. 点击项目即可打开
4. 点击×关闭侧边栏

### 搜索功能
- **顶部搜索栏**：搜索已添加的快速拨号书签
- **侧边栏书签搜索**：搜索Chrome书签栏中的所有书签

## 🔧 技术栈

- **Manifest Version**: V3
- **HTML5 + CSS3**
- **Vanilla JavaScript**
- **Chrome Extensions API**
  - chrome.storage
  - chrome.bookmarks
  - chrome.tabs
  - chrome.sessions
  - chrome.management

## 📝 与旧版本对比

### 旧版本 (Manifest V2)
- 使用background.html
- 依赖多个第三方库（jQuery, Vue.js等）
- 复杂的文件结构
- 不再被Chrome支持

### 新版本 (Manifest V3)
- 使用Service Worker
- 纯JavaScript实现，无依赖
- 简洁的代码结构
- 符合最新Chrome扩展标准
- 更好的性能和安全性

## 🛠️ 开发说明

### 权限说明
- `bookmarks`: 访问Chrome书签
- `storage`: 本地数据存储
- `tabs`: 标签页管理
- `sessions`: 访问最近关闭的标签页
- `management`: 访问已安装的应用程序
- `favicon`: 获取网站图标

### 数据存储
扩展使用 `chrome.storage.local` 存储书签数据，数据格式：

```javascript
{
  speed_dial_bookmarks: [
    {
      id: "1234567890",
      title: "Google",
      url: "https://www.google.com",
      createdAt: 1234567890000
    }
  ]
}
```

### 自定义样式
可以修改 `styles/newtab.css` 中的CSS变量来自定义主题：

```css
:root {
  --primary-color: #4285f4;    /* 主色调 */
  --bg-color: #f5f5f5;          /* 背景色 */
  --card-bg: #ffffff;           /* 卡片背景色 */
  --text-color: #202124;        /* 文字颜色 */
  /* ... 更多变量 */
}
```

## ⌨️ 键盘快捷键

- `Ctrl+Shift+S` (Windows/Linux) 或 `Cmd+Shift+S` (Mac)：切换侧边栏

## � 未来计划

- [ ] 添加拖拽排序功能
- [ ] 支持文件夹分组
- [ ] 添加更多主题选项
- [ ] 支持背景图片上传
- [ ] 添加统计功能（访问次数等）
- [ ] 支持多语言
- [ ] 集成搜索引擎快速搜索
- [ ] 主题切换
- [ ] 云同步
- [ ] 拖拽排序
- [ ] 导入/导出书签
- [ ] 更多自定义选项

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 👨‍💻 作者

基于旧版Speed Dial 2重新开发，适配Manifest V3标准。

---

**注意**：首次安装后会自动添加3个默认书签（Google, GitHub, YouTube），可以自行删除或修改。
