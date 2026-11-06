# STUDY QUEST｜学习冒险

面向大学生的便携式学习舱租赁与学习管理手机 Web App 原型。项目采用 React、TypeScript、Vite 与 React Router，实现从租赁、专注学习到归还和成果结算的完整演示流程。

## 独立路由

- `/` — 首页 HOME
- `/rent` — 设备租赁 RENT A POD
- `/pod` — 我的学习舱 MY POD
- `/focus` — 学习计时 FOCUS MODE
- `/return` — 学习舱归还 RETURN POD
- `/journey` — 学习成果 MY JOURNEY

## 交互与状态

- 演示二维码扫描、租赁确认与设备状态切换
- 25 / 45 / 60 分钟计时，支持开始、暂停、继续和提前结束
- 基于绝对时间戳的计时逻辑，刷新或切换页面后仍保持准确
- 分步折叠、移回、扫码确认归还，不能跳过前置步骤
- 学习记录、科目统计、学习日历、XP 与徽章均从 LocalStorage 动态计算
- 正式界面为 390 × 844 px 手机画布；桌面预览提供独立页面切换工具

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run check
npm run build
```

GitHub Pages 构建：

```bash
npm run build:pages
```

该命令使用 `/study-quest/` 资源基址，并生成 `404.html` SPA 回退，保证独立路由在 GitHub Pages 刷新后仍可恢复。推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会自动构建并部署公开站点。

扫码、校园设备后台与支付均为明确标注的演示功能，未连接真实硬件或校园管理系统。
