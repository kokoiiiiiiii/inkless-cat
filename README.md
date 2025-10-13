# Inkless Cat 🐾

![Inkless Cat logo](src/assets/Inkless%20Cat.png)

Inkless Cat 是一个纯前端的简历创作工具，用模块化的方式帮助你排版和管理职业故事。通过实时预览与灵活的导出能力，它希望成为社区共同维护的开源简历编辑器 😺。

**[立即体验 ☁️](https://inkless-cat.pages.dev/)**

## 特性 ✨

- 🧩 模块化编辑：以区块形式管理内容，快速调整排序与布局。
- 👀 实时预览：编辑器与预览区同步更新，所见即所得。
- 🎨 模板与主题：支持多主题设计，自定义字体、配色与间距。
- 📤 多种导出：支持 Markdown 与 JSON 导出，方便版本管理与与他人协作。
- ⚡ 纯前端：基于浏览器即可使用，无需部署后端服务。

## 技术栈 🛠️

- ⚛️ React 19 + TypeScript 构建组件与数据流。
- ⚡ Vite 7 提供极速的开发与构建体验。
- 💨 Tailwind CSS 负责原子化样式与主题能力。
- 🌀 Immer 辅助实现不可变数据与撤销重做等高级操作。

## 快速开始 🚀

### 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本（或使用兼容的包管理器）

### 安装与运行

```bash
npm install           # 安装依赖
npm run dev           # 启动开发环境
npm run build         # 生成生产版本
npm run preview       # 预览打包结果
npm run lint          # 运行 ESLint 以保持代码质量
```

默认情况下开发服务器运行在 `http://localhost:5173`（具体端口可能因占用而变化）🌐。

## 项目结构 🗂️

```text
inkless-cat/
├─ src/               # 核心源代码与业务逻辑
│  ├─ assets/         # 静态资源（图标、字体等）
│  ├─ components/     # 可复用 UI 组件
│  ├─ hooks/          # 自定义 React Hooks
│  ├─ pages/          # 页面级组件与路由入口
│  ├─ stores/         # 状态管理（immer 数据结构）
│  └─ utils/          # 工具函数
├─ public/            # 静态公共资源
├─ package.json       # 项目依赖与脚本定义
└─ vite.config.js     # Vite 配置文件
```

## 贡献指南 🤝

欢迎通过 issue 或 Pull Request 贡献功能、修复问题或改进文档。建议在提交之前：

1. 先在 Issue 中描述计划的改动，便于讨论。
2. Fork 仓库并在新的分支上工作。
3. 确保通过 `npm run lint` 与相关测试，并在 Pull Request 中描述变更。

## 许可证 📄

本项目采用 [Apache License 2.0](LICENSE)。欢迎在遵循许可证的前提下自由使用与分发。
