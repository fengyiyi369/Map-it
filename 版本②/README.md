# Map It 🗺️

思维导图笔记工具，支持云同步 + 多设备 + 团队协作。

## 技术栈
- React + TypeScript + Vite
- Supabase（登录 + 云数据库）
- Tailwind CSS + Motion

## 部署步骤

### 第一步：初始化数据库
1. 打开 Supabase 控制台
2. 点左侧 **SQL Editor** → **New Query**
3. 把 `supabase-setup.sql` 的内容粘贴进去，点 **Run**

### 第二步：上传代码到 GitHub
1. 在 GitHub 新建仓库 `map-it`
2. 上传所有文件

### 第三步：部署到 Vercel
1. 登录 vercel.com
2. Import 你的 GitHub 仓库
3. Framework 选 Vite，其他默认
4. 点 Deploy

### 第四步：手机添加到主屏幕
- iPhone：Safari 打开 → 分享 → 添加到主屏幕
- Android：Chrome 打开 → 菜单 → 添加到主屏幕

## 本地开发
```bash
npm install
npm run dev
```
