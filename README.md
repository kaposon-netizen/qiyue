# 奇阅魔方 ✦

> 把难以阅读的经典，转化成你最容易吸收的方式。

**奇阅魔方**是一款面向家庭的 AI 阅读助手，专为帮助孩子读懂经典名著而设计。上传 EPUB 电子书，选择改写风格，AI 将整章内容转化为孩子喜欢的表达方式——情节一字不少，只是换了一种更容易进入的"接口"。

同时支持朗读、笔记、想法记录、问 AI 等功能，适配手机、平板、桌面多端。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **AI 改写** | 四种风格（故事流、对话版、探险风、简白版），整章改写并本地缓存 |
| **多模型支持** | Claude、智谱 GLM、千问 Qwen、Gemini，可随时切换 |
| **TTS 朗读** | 逐句朗读，支持暂停/继续/调速（0.7×–1.5×） |
| **笔记系统** | 选中文字加入笔记，支持想法记录、问 AI、跨书跳转 |
| **阅读位置记忆** | 自动保存章节和滚动位置，下次打开直接恢复 |
| **多主题** | 纸白、薄荷、天空、薰衣草、蜜桃、夜间，字号行距可调 |
| **离线缓存** | 改写结果存入 IndexedDB，无需重复消耗 API |
| **响应式布局** | 自动适配手机（<768px）、平板（768–1100px）、桌面（>1100px） |

---

## 技术栈

- **前端**：React 18 + Vite（单文件 `App.jsx`，无额外依赖）
- **后端**：Node.js + Express（`server.js`，仅做 Claude API 反代，智谱/千问/Gemini 直调）
- **移动端**：Capacitor 6（Android APK 打包）
- **TTS**：`@capacitor-community/text-to-speech`
- **EPUB 解析**：JSZip（动态导入）
- **存储**：IndexedDB（书籍+改写缓存）+ localStorage（设置+阅读位置+笔记）

---

## 目录结构

```
qiyue/
├── src/
│   └── App.jsx          # 全部前端逻辑（React）
├── server.js            # 本地代理服务器（Claude API）
├── vite.config.js       # Vite 配置（含 /api 反代）
├── package.json
├── android/             # Capacitor Android 项目（cap init 后生成）
│   └── app/src/main/res/
│       └── mipmap-*/    # 应用图标
└── public/
```

---

## 快速开始

### 前置准备

至少需要以下 **一个** AI API Key：

| 服务 | 注册地址 | 免费额度 |
|------|---------|---------|
| 智谱 GLM-4 Flash | https://open.bigmodel.cn | ✅ 免费 |
| 千问 Qwen | https://dashscope.aliyun.com | ✅ 有免费额度 |
| Claude | https://console.anthropic.com | 付费 |
| Gemini | https://aistudio.google.com | ✅ 有免费额度 |

> **推荐新手**：先用智谱 GLM-4 Flash，注册即免费，无需绑卡。

---

## 安装教程 — Mac

### 1. 安装基础工具

```bash
# 安装 Homebrew（如已安装跳过）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js 18+
brew install node

# 验证
node -v   # 应输出 v18.x.x 或更高
npm -v
```

### 2. 克隆项目

```bash
git clone https://github.com/kaposon-netizen/qiyue
cd qiyue
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动开发服务器

打开两个终端窗口：

**终端 1 — 启动后端代理（Claude API 用）：**
```bash
node server.js
# 输出：Server running on http://localhost:3000
```

**终端 2 — 启动前端：**
```bash
npm run dev
# 输出：Local: http://localhost:5173
```

用浏览器打开 `http://localhost:5173`，在设置中填入 API Key 即可开始使用。

### 5. 常见问题

**白屏 / 页面加载失败：**
```bash
# 清除 Vite 缓存后重启
rm -rf node_modules/.vite
npm run dev
# 浏览器按 Ctrl+Shift+R 强制刷新
```

**端口冲突：**
```bash
# 查找占用 3000 端口的进程
lsof -i :3000
kill -9 <PID>
```

---

## 安装教程 — Windows

### 1. 安装基础工具

**安装 Node.js：**
1. 访问 https://nodejs.org，下载 **LTS 版本**（推荐 20.x）
2. 运行安装程序，全程默认选项，确保勾选 "Add to PATH"
3. 安装完成后打开 **PowerShell** 验证：

```powershell
node -v    # 应输出 v20.x.x
npm -v
```

**安装 Git（如未安装）：**
1. 访问 https://git-scm.com/download/win，下载并安装
2. 安装时选择 "Git from the command line and also from 3rd-party software"

### 2. 克隆项目

打开 **PowerShell** 或 **Git Bash**：

```powershell
git clone https://github.com/your-username/qiyue-mofang.git
cd qiyue-mofang
```

### 3. 安装依赖

```powershell
npm install
```

> 如遇权限错误，以**管理员身份**运行 PowerShell 后重试。

### 4. 启动开发服务器

打开**两个** PowerShell 窗口：

**窗口 1 — 后端代理：**
```powershell
node server.js
```

**窗口 2 — 前端：**
```powershell
npm run dev
```

浏览器打开 `http://localhost:5173`，在设置（⚙）中填入 API Key。

### 5. 常见问题

**`npm install` 报网络错误：**
```powershell
# 切换到国内镜像
npm config set registry https://registry.npmmirror.com
npm install
```

**`node server.js` 报"找不到模块"：**
```powershell
npm install express cors
node server.js
```

**防火墙弹窗：** 点击"允许访问"，否则代理无法工作。

---

## 打包 Android APK

> 需要安装 Android Studio。下载地址：https://developer.android.com/studio

### Mac 打包步骤

```bash
# 1. 安装 Capacitor（首次）
npm install @capacitor/core @capacitor/android @capacitor-community/text-to-speech
npx cap init qiyue com.qiyue.mofang --web-dir dist
npx cap add android

# 2. 构建 + 同步（每次更新代码后执行）
cd ~/qiyue
npm run build && npx cap sync android

# 3. 复制图标（如需更新图标）
cp -r ~/Downloads/qiyue_icons_new/mipmap-* ~/qiyue/android/app/src/main/res/
# 删除覆盖 PNG 的 adaptive XML（重要！）
for xml in ic_launcher.xml ic_launcher_round.xml; do
  rm -f ~/qiyue/android/app/src/main/res/mipmap-anydpi-v26/$xml
done

# 4. 编译 APK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
cd ~/qiyue/android
./gradlew assembleDebug

# 5. 安装到手机（手机需开启 USB 调试）
adb uninstall com.qiyue.mofang   # 卸载旧版本（首次跳过）
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Windows 打包步骤

```powershell
# 1. 构建 + 同步
cd C:\path\to\qiyue
npm run build
npx cap sync android

# 2. 设置 JAVA_HOME（路径根据 Android Studio 实际安装位置调整）
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# 3. 编译 APK
cd android
.\gradlew.bat assembleDebug

# 4. 安装到手机
adb uninstall com.qiyue.mofang
adb install app\build\outputs\apk\debug\app-debug.apk
```

**APK 输出路径：**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 生成应用图标

图标源文件为 1024×1024 PNG，运行以下脚本自动生成全套尺寸：

```bash
python3 << 'EOF'
from PIL import Image
import os

src = os.path.expanduser('~/Downloads/qiyue.png')   # 替换为你的图标路径
img = Image.open(src).convert('RGBA')
res = os.path.expanduser('~/qiyue/android/app/src/main/res')

sizes = {
  'mipmap-mdpi':     48,
  'mipmap-hdpi':     72,
  'mipmap-xhdpi':    96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
}
for folder, size in sizes.items():
    d = f'{res}/{folder}'
    os.makedirs(d, exist_ok=True)
    r = img.resize((size, size), Image.LANCZOS)
    r.save(f'{d}/ic_launcher.png')
    r.save(f'{d}/ic_launcher_round.png')

# 删除 adaptive XML（否则会覆盖 PNG 图标）
for xml in ['ic_launcher.xml', 'ic_launcher_round.xml']:
    p = f'{res}/mipmap-anydpi-v26/{xml}'
    if os.path.exists(p):
        os.remove(p)
        print(f'已删除: {p}')

print('图标生成完成 ✓')
EOF
```

> 需要安装 Pillow：`pip3 install Pillow`

---

## server.js 配置说明

`server.js` 是本地代理服务器，仅用于转发 Claude API 请求（解决浏览器 CORS 限制）。智谱、千问、Gemini 均由前端直接调用，无需代理。

```javascript
// 监听端口（默认 3000）
const PORT = process.env.PORT || 3000

// 支持的端点
POST /api/chat     → Claude API（需在 App 设置中填写 API Key）
POST /api/gemini   → Gemini API 反代（可选）
```

**API Key 填写位置：** 应用内 ⚙ 设置 → AI 模型 → 对应服务的 API Key 输入框。

Key 存储在浏览器 localStorage，不上传服务器。

---

## 数据存储说明

所有数据存储在**本地设备**，不上传任何服务器：

| 数据类型 | 存储位置 | Key |
|---------|---------|-----|
| 书籍全文 + 章节 | IndexedDB `books` | 书籍 ID |
| AI 改写缓存 | IndexedDB `rw` | `bookId_chIdx_styleId` |
| 阅读设置 | localStorage | `qiyue_settings_v3` |
| 阅读位置 | localStorage | `qiyue_read_pos` |
| 笔记列表 | localStorage | `qiyue_notes_v1` |

---

## API Key 获取指南

### 智谱 GLM（推荐·免费）

1. 访问 https://open.bigmodel.cn，注册账号
2. 进入「控制台」→「API Keys」→「新建 API Key」
3. 复制 Key，填入应用设置

### 千问 Qwen

1. 访问 https://dashscope.aliyun.com，用阿里云账号登录
2. 开通「灵积模型服务」
3. 进入「API-KEY管理」→ 新建并复制

### Claude

1. 访问 https://console.anthropic.com，注册账号
2. 进入「API Keys」→「Create Key」
3. Key 以 `sk-ant-` 开头

### Gemini

1. 访问 https://aistudio.google.com
2. 点击「Get API Key」→「Create API key」
3. 注意：中国大陆地区需要代理

---

## 开发说明

### 修改前端

编辑 `src/App.jsx`，保存后浏览器自动热更新。

### 添加新的 AI 提供商

在 `App.jsx` 顶部 `PROVIDERS` 数组中添加配置：

```javascript
{ 
  id: 'newprovider', 
  name: '服务名称',
  directUrl: 'https://api.example.com/v1/chat/completions',  // 支持 CORS 则直调
  // 或：endpoint: '/api/newprovider'                         // 否则走 server.js 代理
  models: [
    { id: 'model-id', name: '模型显示名' }
  ]
}
```

### 添加新的改写风格

在 `STYLES` 数组中添加：

```javascript
{ 
  id: 'newstyle', 
  name: '风格名', 
  desc: '一句话说明',
  prompt: `你的系统提示词……`
}
```

### 响应式断点

```javascript
const width = useWidth()   // 监听 window resize
const isMob = width < 768  // 手机竖屏
const isTab = width >= 768 && width < 1100  // 平板 / 手机横屏
// width >= 1100 → 桌面
```

---

## 常见问题 FAQ

**Q：改写速度很慢怎么办？**  
A：选择更快的模型（智谱 GLM-4 Flash 或 Claude Haiku），或检查网络连接。长章节会自动分段改写（每段约 1800 字）。

**Q：上传 EPUB 后没有章节内容？**  
A：部分 EPUB 文件的章节文字内容极短（<80字），会被过滤。尝试其他来源的 EPUB 文件。推荐从 [Project Gutenberg](https://www.gutenberg.org) 或 [标准书库](http://www.biaozhunshu.com) 下载。

**Q：Android 上文字选择弹出框消失太快？**  
A：轻触选中文字后，等待绿色选择句柄稳定，浮层会在 250ms 后出现。拖动句柄调整选区时浮层暂时隐藏，松手后重新出现。

**Q：笔记的"跳转到书中"没有反应？**  
A：确认对应书籍仍在书库中（未被删除）。跳转同章节内的笔记，滚动会直接触发；跨章节或跨书跳转需要 200ms 加载时间。

**Q：API Key 安全吗？**  
A：Key 仅存储在你设备的 `localStorage`，不经过任何第三方服务器。Claude 的请求通过本机 `server.js` 代理转发（不存储），其他服务由浏览器直接调用。

---

## 项目背景

奇阅魔方源于一个家庭场景：孩子对名著内容感兴趣，但文言文或翻译腔让他们很难读进去。问题不在于书的价值，而在于内容和读者之间不兼容的"接口"。

> 人类文明最大的浪费，不是创造太少，是吸收太慢。  
> — Simon Y，《人类文明最大的浪费，不是创造太少，是吸收太慢》

这个工具的设计原则：**内容一字不少，只改接口**。改写不是缩写，情节、人物、因果、主题完整保留，只是把古典/翻译腔的表达换成孩子更容易进入的方式。

作者按家里人的实际需求设计，欢迎 fork 后根据自己孩子的情况修改提示词和改写风格。

---

## 贡献指南

欢迎 PR。提交前请确认：

- [ ] 在手机端（Chrome DevTools 模拟或真机）测试过文字选择功能
- [ ] 改写功能测试：至少一个 AI 提供商能正常完成改写
- [ ] 没有引入新的 npm 依赖（尽量保持单文件架构）

提 Issue 时请注明：设备类型、浏览器/系统版本、复现步骤。

---

## License

MIT License — 自由使用、修改、分发，保留原始版权声明即可。

---

*✦ 奇阅魔方 · 让每一本经典都有机会被读进去*
