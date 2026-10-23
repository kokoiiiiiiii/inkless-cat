# Inkless Cat 🐾

![Inkless Cat logo](src/assets/Inkless%20Cat.png)

Inkless Cat 是一个纯前端、开箱即用的开源简历编辑器。它以“模块化 + 模板”的方式组织内容，提供实时预览、离线保存、JSON/Markdown 导出与浏览器一键打印（保存为 PDF），适合个人与团队协作维护简历版本。

语言：简体中文 | [English](./README.en.md)

在线体验：<https://inkless-cat.pages.dev>

## 特性 ✨

- 模块化编辑：按区块管理简历，支持启用/停用与拖拽排序。
- 实时预览：左侧编辑右侧预览，排版变化即时可见。
- 模板与主题：内置多款模板，支持自定义主题/配色/字体并保存为“自定义模板”。
- 多格式导出：支持 Resume JSON、Workspace JSON、Markdown；配合浏览器打印可生成 PDF。
- 导入与示例：自动识别 Resume / Workspace JSON，内置工程师/设计/产品等示例数据。
- 自动本地保存：正式持久化由 Zustand `persist` 负责，旧版 localStorage key 会在启动时自动迁移。
- 移动端友好：在小屏设备可一键切换“编辑/预览”。
- 快捷键：模块管理打开时，支持 Ctrl/⌘+Z 撤销上一次模块排序。

## 技术栈 🛠️

- React 19 + TypeScript
- Vite 8（开发/构建，Rolldown/Oxc；生产压缩继续使用 Terser）
- Tailwind CSS 4（CSS-first 主题与 Vite 插件）
- Immer（不可变数据与安全更新）
- Zustand + `persist`（实体/UI 状态与本地持久化）
- FSD 改良版分层（pages/widgets/features/entities/shared）+ 路径别名

## 使用说明 🧭

- 顶部操作：载入示例、清空、导入（JSON）、导出（JSON/Markdown）、打印/PDF、主题切换。
- 模块管理：开启/关闭标准模块，自定义模块（字段/列表/文本），拖拽排序，复原与撤销。
- 模板面板：切换模板样式、载入模板示例、保存/更新/删除自定义模板。
- 打印/PDF：点击“打印/PDF”，选择“保存为 PDF”。小屏会自动切到预览后再打印。
- 数据持久化：正式写入 `inkless-cat/resume-store` 与 `inkless-cat/ui-store`；旧 key 仅用于一次性迁移。

## 快速开始 🚀

环境要求：Node.js `24.x`（版本见 `.nvmrc`），npm `>=11.6.2 <12`。质量 CI 固定使用 npm `11.20.0`；Cloudflare Pages 使用 Node 24 随附的兼容 npm（Pages build image 的 npm 与所选 Node 版本对应）。
浏览器最低版本：Chrome 111、Edge 111、Firefox 128、Safari 16.4。

```bash
npm install           # 安装依赖
npm run dev           # 启动开发环境（默认 http://localhost:5173）
npm run build         # 产出静态构建（./dist）
npm run preview       # 本地预览构建产物
npm run lint          # 运行 ESLint 检查
npm test              # 运行 Vitest 回归测试（store persist、schema/migration、导入导出、模块交互）
npm run test:watch    # 监听模式下调试测试
npm run test:bench    # 运行基础性能基准
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
    editor-shell/         # 编辑器控制器、模板面板、滚动同步、IO 行为
    resume-preview/       # 简历实时预览
    export-resume/        # 导出 Resume JSON / Workspace JSON / Markdown
    import-resume/        # 导入 Resume JSON / Workspace JSON
    sort-modules/         # 模块排序（拖拽/复原/撤销）
    edit-module/          # 表单与列表等编辑逻辑
  entities/
    resume/               # 简历数据结构、schema、migration、选择器与工厂
    module/               # 模块定义/顺序/拖拽工具
    template/             # 模板类型、schema、migration 与内置样例
    ui/                   # UI 状态（主题/模板开关等）
    workspace/            # workspace schema、migration、persist 兼容层
  shared/                 # 通用 hooks/lib/config/ui
  styles/                 # 全局样式与打印样式
  assets/                 # 图标/图片/字体
  main.tsx                # 入口
```

## 状态管理与持久化 🗂️

- 单一正式协议：只保留 Zustand `persist` 作为正式持久化来源；不会再由 hook 重复写 `inkless-cat-data`、`inkless-cat-theme` 等旧 key。
- Store 分层：`entities/resume` 持久化 `resume + activeSections`，`entities/ui` 持久化 `theme + templateId + customTemplates`。
- 会话态不持久化：`hasResumeChanges`、`templatePanelOpen`、`modulePanelOpen`、`mobileView` 仅保留在当前会话。
- 启动迁移：应用启动时会尝试把旧版 localStorage key 迁移为新的 persist 结构，迁移成功后清理旧 key。
- DOM 同步：主题切换会同步 `document.documentElement` 的 `dark` class 与 `data-theme`，避免闪烁。
- 监控：Store 日志输出前缀为 `[store:resume]` / `[store:ui]`，便于排查状态异常。

## 导入导出格式 📦

### Resume JSON

- 只包含简历正文数据。
- 根对象带 `schemaVersion`，便于后续迁移。
- 适合与其他工具交换数据。

示例：

```json
{
  "schemaVersion": 1,
  "personal": {},
  "experience": [],
  "education": [],
  "projects": [],
  "skills": [],
  "socials": [],
  "languages": [],
  "interests": [],
  "awards": [],
  "customSections": []
}
```

### Workspace JSON

- 适合完整备份/恢复编辑现场。
- 包含模板、主题、自定义模板与模块启停顺序。

示例：

```json
{
  "version": 1,
  "resume": {},
  "activeSections": [],
  "theme": "light",
  "templateId": "modern-blue",
  "customTemplates": []
}
```

### 导入链路

- 导入时统一执行：`parse JSON -> schema validate -> migrate -> normalize -> write store`
- 非法 JSON、缺字段、错类型、未来版本号都会被拦截。
- 导入入口会自动识别 Resume JSON 与 Workspace JSON。

## Schema 与 Migration 🔄

- `resume.schemaVersion = 1`
- `workspace.version = 1`
- 迁移入口：
  - `entities/resume/migrations/resume.ts`
  - `entities/template/migrations/template.ts`
  - `entities/workspace/migrations/workspace.ts`
  - `entities/workspace/model/persist.ts`
- 后续升级时，请优先在 migration 层追加版本兼容，而不是把兼容判断散落到 store / hook / 页面里。

## 二次开发说明 🧱

### 新增模块

1. 在 `src/entities/module/lib/sections.ts` 中声明 section definition 与默认排序。
2. 在 `src/entities/resume/schema/resume.ts` 与 `src/entities/resume/lib/normalizers.ts` 中补齐 schema / normalize。
3. 在模块编辑器与预览层补 UI。
4. 为导入导出与 migration 增加测试。

### 新增模板

1. 在 `src/entities/template/lib/templates.ts` 或 `src/entities/template/lib/samples/*` 中增加模板定义。
2. 若模板需要自定义主题字段，优先复用 `TemplateTheme` 与 `normalizeTemplateTheme`。
3. 如需持久化兼容，请同步更新 template migration 测试。

## 质量与工程 🔧

- Lint：基于 `eslint.config.js`，集成 React/TS/import/jsx-a11y/unicorn/security/tailwindcss 等规则，约束跨层导入与路径穿透。
- 样式扫描：Tailwind 4 的 CSS-first 配置显式扫描 `src/` 与 `index.html`；主题令牌维护在 `src/index.css`。
- 构建：Vite 8 + Terser；生产环境剔除 `console`/`debugger`。

## 数据与隐私 🔐

- 纯前端应用，不依赖任何后端服务与数据库，不上传你的简历数据。
- 正式持久化键：
  - `inkless-cat/resume-store`
  - `inkless-cat/ui-store`
- 旧版 key（如 `inkless-cat-data`、`resume-studio-data` 等）只在迁移阶段读取，成功后会被清理。

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
