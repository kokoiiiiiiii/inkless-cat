# Inkless Cat 🐾

![Inkless Cat logo](src/assets/Inkless%20Cat.png)

Inkless Cat 是一个纯前端、开箱即用的开源简历编辑器。它以“模块化 + 模板”的方式组织内容，提供实时预览、离线保存、JSON/Markdown 导出与浏览器一键打印（保存为 PDF），适合个人与团队协作维护简历版本。

语言：简体中文 | [English](./README.en.md)

在线体验：https://inkless-cat.pages.dev/

## 特性 ✨

- 模块化编辑：按区块管理简历，支持启用/停用与拖拽排序。
- 实时预览：左侧编辑右侧预览，排版变化即时可见。
- 模板与主题：内置多款模板，支持自定义主题/配色/字体并保存为“自定义模板”。
- 多格式导出：导出 JSON、Markdown；配合浏览器打印可生成 PDF。
- 导入与示例：支持导入 JSON，内置工程师/设计/产品等示例数据。
- 自动本地保存：变更自动写入浏览器 localStorage，可清空或载入示例。
- 移动端友好：在小屏设备可一键切换“编辑/预览”。
- 快捷键：模块管理打开时，支持 Ctrl/⌘+Z 撤销上一次模块排序。

## 技术栈 🛠️

- React 19 + TypeScript
- Vite 7（开发/构建）
- Tailwind CSS + SCSS（样式）
- Immer（不可变数据与安全更新）
- FSD 改良版分层（pages/widgets/features/entities/shared）+ 路径别名

## 使用说明 🧭

- 顶部操作：载入示例、清空、导入（JSON）、导出（JSON/Markdown）、打印/PDF、主题切换。
- 模块管理：开启/关闭标准模块，自定义模块（字段/列表/文本），拖拽排序，复原与撤销。
- 模板面板：切换模板样式、载入模板示例、保存/更新/删除自定义模板。
- 打印/PDF：点击“打印/PDF”，选择“保存为 PDF”。小屏会自动切到预览后再打印。
- 数据持久化：本地保存键包括 `inkless-cat-data`、`inkless-cat-theme`、`inkless-cat-template` 等，清空即可重置。

## 快速开始 🚀

环境要求：Node.js 18+，npm 9+（或等价包管理器）

```bash
npm install           # 安装依赖
npm run dev           # 启动开发环境（默认 http://localhost:5173）
npm run build         # 产出静态构建（./dist）
npm run preview       # 本地预览构建产物
npm run lint          # 运行 ESLint 检查
```

## 架构与目录 🧩

项目采用 FSD 改良版分层，限制跨层耦合与路径穿透：pages → widgets → features → entities → shared。统一从各层 `index.ts` 公共入口导入，结合 Vite/TS 路径别名（`@app/*`、`@pages/*`、`@widgets/*`、`@features/*`、`@entities/*`、`@shared/*`、`@/*`）。

```text
src/
  app/                    # Provider/入口装配
  pages/
    editor/               # 路由级页面（仅做编排）
  widgets/
    topbar/               # 页头与操作区
    modules-panel/        # 模块管理与编辑面板
    template-selector/    # 模板选择与自定义
  features/
    editor-shell/         # 编辑器控制器与本地存储/滚动同步
    resume-preview/       # 简历实时预览
    export-resume/        # 导出 JSON/Markdown
    import-resume/        # 导入 JSON
    sort-modules/         # 模块排序（拖拽/复原/撤销）
    edit-module/          # 表单与列表等编辑逻辑
  entities/
    resume/               # 简历数据结构/选择器/工厂与校正
    module/               # 模块定义/顺序/拖拽工具
    template/             # 模板类型与内置样例
    ui/                   # UI 状态（主题/模板开关等）
  shared/                 # 通用 hooks/lib/config/ui
  styles/                 # 全局样式与打印样式
  assets/                 # 图标/图片/字体
  main.tsx                # 入口
```

## 质量与工程 🔧

- Lint：基于 `eslint.config.js`，集成 React/TS/import/jsx-a11y/unicorn/security/tailwindcss 等规则，约束跨层导入与路径穿透。
- 样式扫描：Tailwind `content` 已覆盖 `features/entities/widgets/pages/shared/app`，避免生产环境样式被摇掉。
- 构建：Vite 7 + Terser；生产环境剔除 `console`/`debugger`。

## 数据与隐私 🔐

- 纯前端应用，不依赖任何后端服务与数据库，不上传你的简历数据。
- 本地保存使用浏览器 `localStorage`：
  - `inkless-cat-data`：当前简历数据快照
  - `inkless-cat-theme`：主题（light/dark）
  - `inkless-cat-template`：选中模板 ID
  - `inkless-cat-sections`：启用模块顺序
  - `inkless-cat-custom-templates`：自定义模板列表

## 路线图 🗺️

- 更多内置模板与打印版式优化
- Markdown 导出样式增强（可配置标题/分隔符）
- 模板/主题分享（导入导出包）
- 更细粒度的快捷键与可访问性优化
- i18n 与多语言文案

## 贡献指南 🤝

欢迎通过 Issue 或 Pull Request 贡献功能、修复问题或改进文档：

1) 先在 Issue 中描述改动意图与方案；
2) Fork 仓库，在新分支实现；
3) 提交前运行 `npm run lint` 并完善说明；
4) 遵循分层与公共入口导入原则（见上文架构说明）。

## 许可证 📄

本项目采用 Apache License 2.0，详见 LICENSE。
