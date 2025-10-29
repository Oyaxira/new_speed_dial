# Speed Dial - 快速拨号扩展

一个功能丰富的 Chrome 扩展，用于替代默认的新标签页，提供快速拨号、书签管理和侧边栏功能。基于 Manifest V3 开发，采用网页缩略图截图技术，提供更直观的视觉体验。

## 🌟 主要功能

### 1. 快速拨号 (Speed Dial)
- ✅ 添加、编辑、删除快速拨号书签
- ✅ **自动网页截图**：添加书签时自动截取网页缩略图（920px 高清）
- ✅ **手动更新截图**：编辑时可重新截取缩略图
- ✅ 拖拽排序书签
- ✅ 响应式网格布局（16:9 比例卡片）
- ✅ 可自定义网格列数（3-8列或自动）
- ✅ 支持显示/隐藏图标和标题

### 2. 侧边栏功能
- ✅ **应用程序列表**：快速访问已安装的 Chrome 应用
- ✅ **书签管理**：浏览和搜索 Chrome 书签，支持文件夹导航
- ✅ **最近标签页**：查看和恢复最近关闭的标签页（默认显示20个）
- ✅ **历史记录搜索**：输入关键词搜索浏览历史（最多50条）
- ✅ 可自定义侧边栏位置（左侧/右侧）
- ✅ 自动打开侧边栏选项
- ✅ 3栏横向布局（1080px宽）

### 3. 自定义设置
- ✅ 主题切换（浅色/深色）
- ✅ 自定义网格列数（3-8列或自动）
- ✅ 背景图片上传和预设
- ✅ 背景样式设置（覆盖/包含/平铺/居中）
- ✅ 背景不透明度调整（0-100%）
- ✅ 背景颜色设置
- ✅ 字体大小调整（小/中/大/特大）
- ✅ 显示/隐藏网站图标
- ✅ 显示/隐藏标题
- ✅ 最近标签页数量设置（5-100个）
- ✅ 启用动画效果
- ✅ 自定义 CSS 支持

### 4. 数据管理
- ✅ 导出/导入所有数据（书签和设置）
- ✅ 本地数据存储
- ✅ 重置所有设置
- ✅ 高分辨率缩略图本地存储

### 5. 其他特性
- 🎨 现代化 UI 设计，Glass 效果
- 🧩 Tailwind CSS 组件化样式体系
- 🔍 实时搜索功能（书签、历史记录）
- ⚡ 快速响应
- 📱 响应式布局（适配 2K/4K 屏幕）
- 🖱️ 拖拽排序书签
- ⌨️ 键盘快捷键支持
- 🖼️ 网页缩略图截图技术

## 🚀 安装方法

### 方法1：开发者模式安装
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `new_speed_dial` 文件夹
6. 完成！打开新标签页即可使用

### 方法2：打包安装
1. 在扩展管理页面点击"打包扩展程序"
2. 选择 `new_speed_dial` 文件夹
3. 生成 .crx 文件
4. 拖拽到扩展管理页面安装

## 📁 项目结构

```
new_speed_dial/
├── manifest.json           # 扩展配置文件（Manifest V3）
├── background.js          # Service Worker（后台截图服务）
├── newtab.html           # 新标签页 HTML
├── popup.html            # 弹窗页面
├── options.html          # 设置页面
├── README.md             # 说明文档
├── package.json          # Tailwind 构建脚本与依赖
├── GUIDE.md              # 开发指南
├── ini.md                # 初始化说明
├── icon-generator.html   # 图标生成工具
├── icons/                # 图标文件夹
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── scripts/              # JavaScript 脚本
│   ├── newtab.js        # 新标签页逻辑（含截图功能）
│   ├── popup.js         # 弹窗逻辑
│   ├── options.js       # 设置页面逻辑
│   ├── settings.js      # 设置管理
│   └── utils.js         # 工具函数
├── styles/              # 构建后的样式文件
│   └── tailwind.generated.css # Tailwind 产物（需构建生成）
├── src/
│   └── styles/
│       └── tailwind.css # Tailwind 源文件（含 @apply 组件层）
└── old_speed_dial/      # 旧版本参考代码（Manifest V2）
```

## 🎯 使用说明

### 添加书签
1. 打开新标签页
2. 点击"+"按钮
3. 输入网址和标题
4. 点击保存
5. **扩展会自动打开该网页截图**（约1.5秒后自动关闭）
6. 书签卡片会显示网页截图

### 编辑书签
1. 鼠标悬停在书签上
2. 点击编辑按钮（✏️）
3. 修改信息
4. **点击"🔄 重新截取缩略图"按钮**可更新截图
5. 保存修改

### 拖拽排序
1. 按住书签卡片不放
2. 拖动到目标位置
3. 松开鼠标
4. 新顺序会自动保存

### 删除书签
1. 鼠标悬停在书签上
2. 点击删除按钮（🗑️）
3. 确认删除

### 使用侧边栏
1. 点击右下角的侧边栏按钮（☰）
2. 浏览应用程序、书签和最近标签页
3. **使用搜索框快速查找**
   - 书签搜索：搜索 Chrome 书签
   - 最近标签页搜索：搜索浏览历史（输入关键词）
4. 点击项目即可打开
5. 点击×关闭侧边栏

### 自定义设置
1. 点击右上角设置按钮（⚙️）或点击右上角×关闭
2. 调整主题、列数、背景等
3. 上传自定义背景图片或选择预设
4. 调整侧边栏位置和最近标签页数量
5. 点击"保存设置"应用更改

## 🔧 技术栈

- **Manifest Version**: V3
- **HTML5 + CSS3**
- **Vanilla JavaScript**（零依赖）
- **Tailwind CSS + PostCSS 构建管线**
- **Chrome Extensions API**
  - chrome.storage（数据存储）
  - chrome.bookmarks（书签管理）
  - chrome.tabs（标签页操作，截图）
  - chrome.sessions（最近标签页）
  - chrome.management（应用列表）
  - chrome.history（历史记录搜索）
  - chrome.runtime（消息传递）
- **截图技术**
  - chrome.tabs.captureVisibleTab（网页截图）
  - OffscreenCanvas（图片压缩）
  - createImageBitmap（Service Worker 图片处理）

## 📝 与旧版本对比

### 旧版本 (Manifest V2)
- 使用 background.html
- 依赖多个第三方库（jQuery, Vue.js, Angular 等）
- 复杂的文件结构（20+ JS 文件）
- 不再被 Chrome 支持（2024年已弃用）
- 使用 WebSQL 数据库

### 新版本 (Manifest V3)
- 使用 Service Worker（background.js）
- 纯 JavaScript 实现，零依赖
- 简洁的代码结构（6个主要 JS 文件）
- 符合最新 Chrome 扩展标准
- 更好的性能和安全性
- 使用 chrome.storage.local
- **高清网页截图**（920px，质量85%）
- **拖拽排序**
- **响应式布局**（适配高分辨率屏幕）

## 🧰 Tailwind 构建流程

本项目的 UI 由 Tailwind CSS 提供支持，所有组件样式集中在 `src/styles/tailwind.css` 中，通过 `@apply` 定义语义化类名。

1. 安装依赖：`npm install`
2. 开发时实时构建：`npm run dev`（监听并输出到 `styles/tailwind.generated.css`）
3. 生产构建：`npm run build`（输出压缩版本）
4. 如需调整样式，请修改 `src/styles/tailwind.css`，然后重新运行上述命令生成新样式

> 注意：`styles/tailwind.generated.css` 是扩展加载所需的构建产物，应与源码一同提交/分发。

## 🛠️ 开发说明

### 权限说明
- `bookmarks`: 访问 Chrome 书签
- `storage`: 本地数据存储（书签和缩略图）
- `tabs`: 标签页管理和网页截图
- `sessions`: 访问最近关闭的标签页
- `management`: 访问已安装的应用程序
- `history`: 搜索浏览历史
- `<all_urls>`: 访问所有网站（用于截图）

### 数据存储结构

#### 书签数据
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

#### 缩略图数据
```javascript
{
  "thumbnail_https://www.google.com": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

#### 设置数据
```javascript
{
  speed_dial_settings: {
    theme: 'light',              // 主题
    columns: 'auto',             // 列数
    showTitles: true,            // 显示标题
    showFavicons: true,          // 显示图标
    backgroundImage: '',         // 背景图片（线上资源）
    backgroundImageData: '',     // 上传的背景图片
    backgroundStyle: 'cover',    // 背景样式
    backgroundOpacity: 100,      // 背景不透明度
    backgroundColor: '#f5f5f5',  // 背景颜色
    fontSize: 'medium',          // 字体大小
    sidebarPosition: 'right',    // 侧边栏位置
    autoOpenSidebar: false,      // 自动打开侧边栏
    maxRecentTabs: 20,           // 最近标签页数量
    showApps: true,              // 显示应用程序面板
    customCSS: ''                // 自定义CSS
  }
}
```

### 截图工作流程
1. 用户添加书签或点击"重新截取缩略图"
2. `newtab.js` 发送消息到 `background.js`
3. Service Worker 创建新标签页（active: true）
4. 等待页面加载完成（status: 'complete'）
5. 延迟1.5秒让页面渲染
6. 使用 `captureVisibleTab` 截取可见区域
7. 压缩图片到 920px 宽度，JPEG 质量 85%
8. 转换为 Base64 Data URL
9. 存储到 `chrome.storage.local`
10. 关闭临时标签页
11. 更新 UI 显示缩略图

### 自定义样式
可以修改 `styles/newtab.css` 中的 CSS 变量来自定义主题：

```css
:root {
  --primary-color: #4285f4;    /* 主色调 */
  --bg-color: #f5f5f5;          /* 背景色 */
  --card-bg: #ffffff;           /* 卡片背景色 */
  --text-color: #202124;        /* 文字颜色 */
  --favicon-display: block;     /* 图标显示 */
  --title-display: block;       /* 标题显示 */
  /* ... 更多变量 */
}
```

## ⌨️ 键盘快捷键

- `Ctrl+Shift+S` (Windows/Linux) 或 `Cmd+Shift+S` (Mac)：切换侧边栏

## 📊 性能优化

- 缩略图使用 JPEG 格式，减少存储空间
- 异步加载缩略图，不阻塞 UI
- 拖拽排序使用节流，避免频繁保存
- Service Worker 后台处理截图，不影响前台性能
- CSS 动画使用 GPU 加速

## ✅ 已完成功能

- ✅ 书签拖拽排序
- ✅ 网页缩略图截图
- ✅ 背景图片上传
- ✅ 主题切换
- ✅ 侧边栏位置切换
- ✅ 历史记录搜索
- ✅ 导入/导出数据
- ✅ 响应式布局（2K/4K 适配）
- ✅ 显示/隐藏图标和标题
- ✅ 自定义列数和字体

## 🔮 未来计划

- [ ] 文件夹分组管理
- [ ] 标签和分类系统
- [ ] 云同步功能
- [ ] 更多主题和背景预设
- [ ] 访问统计和热力图
- [ ] 多语言支持
- [ ] 快捷键自定义
- [ ] Chrome 应用商店发布


## 📄 许可证

MIT License

## 👨‍💻 作者

Oyaxira

---

**注意**：
- 首次安装后会自动添加3个默认书签（Google, GitHub, YouTube），可以自行删除或修改
- 截图功能需要 `tabs` 权限，会短暂打开网页进行截图
- 缩略图存储在本地，建议定期清理不需要的书签以节省空间
- 高分辨率截图（920px）每张约 100-300KB
