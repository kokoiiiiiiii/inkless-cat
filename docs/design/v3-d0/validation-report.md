# Inkless-Cat V3 D0 · 技术与验证报告

## 状态与评审边界

**当前状态：CONDITIONAL。** 两套方向、推荐方向原型、截图、Cloudflare Preview 及主要工程/浏览器验证已完成。报告/证据 docs-only Head `54b85df` 的 GitHub Actions quality 与 Linux Firefox 均成功；Chromium 为 95/95、Firefox 为 13/13，Pages Preview 部署成功。实际浏览器 UI 的 200% Zoom 未能在本机自动化环境驱动；真实 iPhone Safari 与软键盘仍为设备验收 Pending。这些不是 Pass。用户尚未接受任何设计方向。

- 确认的 `main` 基线 SHA：`7eac5487caf25610f5edcaf87524027595cfc754`
- 独立开发分支：`codex/inkless-cat-v3-d0`
- 原型代码 commit / PR 初始 Head SHA：`056b591057be7135e20ee2bca4f2e441dedb8017`；后续仅补齐本报告的文档 commit 会改变最终 PR Head，不改变原型运行时代码。
- Draft PR：[#19](https://github.com/kokoiiiiiiii/inkless-cat/pull/19)，保持 Draft，未合并。
- 首轮 GitHub Actions：[run 40230436678](https://github.com/kokoiiiiiiii/inkless-cat/actions/runs/40230436678)；首轮证据包：[inkless-cat-v3-d0-evidence](https://github.com/kokoiiiiiiii/inkless-cat/actions/runs/40230436678/artifacts/12613001763)。该 run 有两项测量测试失败，不能当成整套 CI 通过。
- 修正后代码测试：[run 40232146235](https://github.com/kokoiiiiiiii/inkless-cat/actions/runs/40232146235)，Chromium quality 95/95、Linux Firefox 13/13 均通过；production audit、typecheck、lint、416 个单测和 build 均通过。
- 最终报告/证据 Head `54b85df` 的 PR 复跑：[run 40233150895](https://github.com/kokoiiiiiiii/inkless-cat/actions/runs/40233150895)，quality 成功（95/95 Chromium、416 单测、audit/typecheck/lint/build）且 Linux Firefox acceptance 成功（13/13）。`visual-parity` 因 PR 未带该专用 label 被条件跳过，不计作 Pass。
- Cloudflare branch Preview：[打开 `/design/v3-d0`](https://codex-inkless-cat-v3-d0.inkless-cat.pages.dev/design/v3-d0?direction=a)；报告 Head `54b85df` 的部署已成功，内置浏览器复核 A/B 可切换：[commit Preview](https://1a91ccb9.inkless-cat.pages.dev/design/v3-d0?direction=a)。
- 最终 CI evidence artifact：[inkless-cat-v3-d0-evidence](https://github.com/kokoiiiiiiii/inkless-cat/actions/runs/40233150895/artifacts/12614525698)。运行时测试代码无后续变更；本次文档修订仅纠正报告对 final run 的记录。
- 原工作区中原有 AI interview 未提交更改留在原 checkout；本工作只在独立 managed worktree 进行。
- PR #17 / #18 不修改、不合并；正式编辑器、业务 Store、Controller、Print CSS、生产 Provider/key 路径均不修改。

## 依赖与前端结构审查

| 项目 | 结果 |
|---|---|
| React / React DOM | 项目已有 19.3.1，D0 无重复版本 |
| Vite / React plugin | 项目已有 8.3.5 / 6.1.2；未升级 |
| Tailwind CSS 4 | 已有 4.3.3；无新的 `@theme` 或 `@import` |
| React animation | 新增固定 direct dependency `motion@13.5.1`，原型只 import `motion/react`。`motion` 自身依赖同版本 `framer-motion@13.5.1` 实现；无另行声明的 `framer-motion`、GSAP 或第二个 engine，React/React DOM 单实例去重 |
| Dialog primitive | 新增固定 `@base-ui/react@1.6.0`，Base UI 是唯一 Portal/Overlay/Focus 管理 primitive；无 Radix |
| shadcn/ui | 评审官方 Base UI Button 源码，按其 Base UI primitive + `data-slot` wrapper 方式构建本地 `StudioButton`，variants 由 CSS Module 与 V3 token 定制；Field/Input 为本地可访问 wrapper，Dialog 使用同一 Base UI family。没有套用 shadcn 默认页面主题 |
| FSD 与状态 | 入口只 lazy-load `src/pages/studio-v3-d0/`；使用内存中的合成 Fixture 和局部 useState，不导入正式 Resume entity/Store/Controller |
| 页面样式 | CSS Modules；`@reference` 只读取既有 Tailwind，未输出 utility/base。V3 token 仅位于根容器 `data-studio-v3`；组件类名也由 CSS Modules 限定 |
| Portal / dark theme | Base UI 对话框 portal 容器置于 V3 根内；浅/深主题采用本地 `data-theme` 变量 |
| 打印 | D0 路由提供明确的 Demo 导出/打印解释，不调用真实导出；正式 A4 CSS 文件未更改 |
| 请求与持久化 | 浏览器用例未发现外网请求；原型不读取真实 Provider 配置/API Key，不写 localStorage；刷新/离开页面会丢弃 demo 编辑 |

### shadcn/ui 与 Base UI 选择依据

在运行 CLI 前核对了 `components.json`、Tailwind 4 Vite plugin、既有 FSD alias 和 `src/index.css` 的 Tailwind `@source` 与打印规则。仓库没有 `components.json`，正式 CSS 会扫描 `src/`；shadcn 官方说明 `components.json` 仅在使用 CLI 时必需，source copy 可以手动集成。本次从官方 Base UI Button source 审查组件接口与 `data-slot` 做法，然后将按钮 variants 重写为 V3 CSS Module；Input、Textarea 和 Dialog shell 也限制在 V3 目录，不改全局变量。没有执行 `init/add` CLI，也没有生成/改动全局主题。见 [shadcn Base UI Button source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/button.tsx) 与 [components.json 说明](https://ui.shadcn.com/docs/components-json)。

Base UI 1.6.0 与 React 19 的受控 Dialog 在 Chromium/WebKit 中完成键盘、Escape、焦点边界和焦点恢复测试；shadcn-style Button 使用同一 Base UI primitive。Firefox 本机在打开页面前启动 content helper 失败；首轮 Linux Firefox 为 12/13，窄屏检测把关闭状态的原生章节菜单子节点计入几何边界。增加 `toBeHidden` 语义断言并修正边界检测后，Linux Firefox 在代码 Head `1e09ec1` 与报告 Head `54b85df` 均为 13/13 通过。Modal 复用同一套 Base UI overlay/focus 管理；不存在 Radix 重复 primitive。

### Amicro 源码审查

- 源仓库：[`Subhan-code/Amicro--Micro-transitions-`](https://github.com/Subhan-code/Amicro--Micro-transitions-)，本轮审查 clone 的 HEAD `dc2a183f3a5e6e0ea1b0d75530ac084e3a4e0bd2`；包版本 `@subhanhq/amicro@1.0.1`，package 与仓库均声明 MIT。仓库 README 将 React 18/19、Tailwind 3/4 列为支持范围，包当前依赖 `motion@^12.23.24`。
- 检查候选 `FadeUp`：默认 600ms、20px 位移；没有 reduced-motion 处理，调用侧需要 `framer-motion`。不适合文案编辑区域，也与本项目统一 `motion` package 版本不一致。
- 检查候选 `MagneticButton`：使用 `onMouseMove`、Spring transform 和 hover scale；对触控没有等效反馈，没有 reduced-motion 路径，并将多个 transform 动作叠在按钮上。与本项目“不移动高频操作按钮”和动画职责约束冲突。
- 检查候选 reduced-motion hook：监听 `prefers-reduced-motion`，但当前候选组件并未统一使用该 hook；Hook 首次状态在 effect 后才同步。
- registry JSON 为 FadeUp/MagneticButton 显式列出 `framer-motion` 依赖；引入它会形成第二动画包/命名路径风险。Amicro 包本身的依赖列表还包含它的站点/支付/分析相关包。本 D0 不安装 Amicro package、CLI 或 registry 源码，也未复制第三方组件。Prototype 仅由已固定的 `motion@13.5.1` 自建短动效。

源码证据：[`package.json`](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/package.json)、[MIT License](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/LICENSE)、[`FadeUp` registry source](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/registry/ui/entrance/fade-up.tsx)、[`MagneticButton` registry source](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/registry/ui/hover/magnetic-button.tsx)、[`FadeUp` dependency manifest](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/registry/ui/fade-up.json)、[`MagneticButton` dependency manifest](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/registry/ui/magnetic-button.json)。

### Motion 职责与动画预算

- CSS：按钮色彩/边框 120ms；小型本地加载符号 800ms 循环，仅在有文字标签的 demo loading 时出现。
- Motion: `motion/react` 控制工作视图变化，160ms、透明度 + 4px；不对简历文字或输入字段本身做进场动画。
- Dialog CSS Module：Backdrop 140ms、面板 160ms、垂直 5px；没有第二个 JS animation engine。
- `MotionConfig reducedMotion="user"`、`useReducedMotion()`、局部 `prefers-reduced-motion` CSS 一起处理视图变化、滚动和 CSS 动效；减少模式关闭滚动平滑并把过渡压到 0.01ms。
- 初始性能预算在测量前确定：V3 lazy JS ≤300KB raw / 90KB gzip；V3 lazy CSS ≤50KB raw / 10KB gzip；production entry JS 增量 ≤1KB raw / 0.5KB gzip；production entry CSS 增量必须为 0B；原型模式切换 ≤250ms median、≤400ms p95；操作演示期间不得记录 ≥50ms Long Task。下面填写最终构建与运行测量，不以预算取代真实结果。

## CSS 与资源隔离

基线与 Head 构建产物均从同一 Vite 配置分别构建，Node 24.22.1 / npm 11.20.0。entry CSS 与 `main` 完全相同；V3 页面和 CSS 是 route lazy chunk。Rollup 将 `use-sync-external-store` 的 selector shim 提取为共享 `with-selector` chunk：它同时服务既有 Zustand 路径和新增 Base UI Dialog。它因此随当前生产入口的共享图预加载，带来一个可量化的小幅静态资源增量；这不是零影响。

| 资源 | `main` 基线 | V3 Head | 差值 | 状态 |
|---|---:|---:|---:|---|
| 初始 JS entry | 363.11 KB / 106.33 KB gzip | 363.49 KB / 106.45 KB gzip | +0.38 KB / +0.12 KB gzip | Pass |
| 初始静态预加载 JS 总量 | 549.27 KB / 166.54 KB gzip | 549.75 KB / 166.85 KB gzip | +0.48 KB / +0.31 KB gzip | Pass；小于预先定的 +1 KB / +0.5 KB budget |
| 初始全局 CSS | 80.84 KB / 12.53 KB gzip | 80.84 KB / 12.53 KB gzip | 0 B | Pass，字节大小完全相同 |
| V3 lazy JS | — | 251.73 KB / 78.57 KB gzip | — | Pass；≤300 KB / 90 KB gzip |
| V3 lazy CSS | — | 41.91 KB / 8.55 KB gzip | — | Pass；≤50 KB / 10 KB gzip |
| Phase 4B 独立资源 | 28.64 KB JS / 9.53 KB gzip；35.17 KB CSS / 6.84 KB gzip | 相同文件名与大小 | 0 B | Pass |

运行时资源测试在生产 `/` 确认不请求 V3 页面 chunk/CSS，也未出现 V3 root。构建确认没有新全局 CSS；V3 CSS Module 对话框 Portal 在 V3 root 下，主题变量未逸出。以上不表示初始 JS 完全没有资源变化；共享 selector chunk 的 +0.48 KB 静态 JS 已计入上表。

## 可访问性、浏览器与视口

| 检查 | 结果 |
|---|---|
| 正文/控件/主题对比度 | 代表性 token 的 WCAG 对比计算见 [Design System](design-system.md)，普通正文目标 4.5:1、非文本目标 3:1 |
| Keyboard & quick jump | Chromium E2E：快捷键、输入框内不抢占、章节切换 |
| Dialog focus | Chromium + WebKit E2E：Tab/Shift+Tab、Base UI focus guards、Escape close、焦点恢复；WebKit 首轮发现 focus-return 差异，采用 Base UI `finalFocus` + 触发器追踪后 targeted 与完整 WebKit suite 均通过 |
| 触控目标 | CSS 检查与 Mobile 页面核对；主导航、输入、重排、模板和 Dialog close ≥44×44px |
| 响应矩阵 | Chromium：1440×900、1280×800、1024×768、768×1024、430×932、390×844、320×568、844×390；A/B 页面无横向溢出和不可解释出界元素。主要同条件截图为 1440×900 / 390×844，并保留 320px / 横屏截图 |
| 200% 应用文本尺寸 | Passed；Playwright 将两个方向的 prototype root font-size 分别设置为 200%，在 390px 与 320px 检查页面宽度。这是 CSS 应用内缩放模拟，不是浏览器文字放大或页面 Zoom |
| 200% 浏览器 Zoom | Pending；本机 Playwright Headless Chromium 的 Control+Plus 与 IAB tab 均不能改变 DPR / visual scale / viewport。CSS `zoom` 不等价，未用其冒充浏览器缩放 |
| Reduced Motion | Chromium Passed：模拟 `prefers-reduced-motion: reduce`，检查 demo loading 标记切换至 0.01ms |
| Chromium | Playwright 1.61.1 / Chromium 149.0.7827.55；完整现有生产 E2E + D0 + Print 路径通过 |
| Firefox | 本机 Playwright Firefox 1532 无法启动 content helper（`sandbox_extension_issue_file_to_process ... Operation not permitted`，之后 `RenderCompositorSWGL failed mapping default framebuffer`）；不是页面断言结果。修正后 GitHub Linux Firefox 复跑 13/13 通过 |
| WebKit desktop | Playwright WebKit 26.5 / macOS 27.0.0 arm64：完整 D0 套件通过。该结果不等于原生 iOS Safari |
| iPhone Safari | Pending 真实设备测试；包括软键盘、地址栏动态视口和安全区 |
| 软键盘、安全区 | CSS 使用动态视口与 safe-area inset；自动浏览器不能表示 iPhone 真实软键盘/Safari 地址栏，仍为设备验收项 |

## 测试记录

OS：macOS 27.0.0 arm64；Node 24.22.1；npm 11.20.0。Chromium 149 / WebKit 26.5 使用本地 Playwright browser builds。Firefox Playwright Nightly 已尝试，但宿主系统在测试打开前拒绝启动 content helper。lint 与 base-SHA 对照均为 370 warnings / 0 errors；D0 自有文件 lint 为 0 warnings。项目 SHA 将在 Draft PR commit 冻结；截图矩阵与性能证据由该 worktree 的 Playwright 命令生成。

| 命令 / 套件 | 最终结果 |
|---|---|
| `npm ci` | Passed (Node 24.22.1 / npm 11.20.0) |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; 0 errors, 370 warnings (existing repository warnings); D0-owned files: 0 warnings |
| `npm test` | Passed; 48 files / 416 tests |
| `npm run build` | Passed; Vite 8.3.5 transformed 949 modules |
| `npm audit --omit=dev --audit-level=moderate` | Passed; 0 production vulnerabilities |
| `git diff --check` | Passed |
| Full Chromium Playwright (existing E2E + D0 + production print) | GitHub Actions Passed; 95/95 tests on code Head `1e09ec1` |
| Corrected GitHub Linux Firefox acceptance (existing paths + D0) | Passed; 13/13 tests on code Head `1e09ec1` and report Head `54b85df` |
| Firefox Playwright local (existing acceptance + D0) | Environment failure before browser context; 4 launch timeouts, 2 interrupted at runner stop, 7 not run. This local process-start failure is superseded by the successful Linux CI browser run, not reported as a local pass |
| WebKit Playwright (D0) | Passed; 8 tests。与 Chromium 并行的一次复核出现 1 个移动导出 Dialog 间歇未打开；独立 targeted case 与 serial full suite 均通过，当前无可复现失败 |
| D0 screenshot matrix | Passed; 19 screenshots across A/B, PC/Mobile, templates, modules, preview, narrow and landscape |
| D0 interaction/frame probe | GitHub Actions Linux / Chromium; 24 view switches: first-frame median 14.9ms, p95 20.1ms; 333 observed animation frames, frame-delta median/p95 16.7ms, max 50ms, 0 frames >50ms; 0 Long Tasks ≥50ms in interaction window. See [performance.json](evidence/performance.json) |

### 首轮 GitHub CI 失败与修正

[首轮 run 40230436678](https://github.com/kokoiiiiiiii/inkless-cat/actions/runs/40230436678) 的基础审计、类型检查、Lint、单测和构建均通过；Chromium E2E 为 94/95。失败的性能断言是 observer 使用 `buffered: true`，把导航/初始挂载时、切换计时器开始之前的一次 70ms Long Task 收入视图切换样本；trace 显示该条目早于 `page.goto()` 完成。现已改为仅观察页面就绪后的交互窗口，不放宽性能阈值。首轮 artifact 保存了该 run 的原始证据。

首轮 Linux Firefox E2E 为 12/13。失败点在 390×844：测试遍历几何节点时，把默认关闭的原生 `<details>` 章节选择器中的 `nav` 与 4 个按钮也当作可见的越界内容；同轮 `documentElement.scrollWidth <= clientWidth` 与 Studio 宽度检查均通过。现增加菜单关闭时的 `toBeHidden()` 断言，并只从可见内容溢出检查中排除关闭 `<details>` 的后代。修正后的 Linux Firefox acceptance 在 Head `1e09ec1` 完整 13/13 通过。

浏览器测试明确区分 Passed、Failed、Interrupted 与 Not run。本机 Firefox failure 是本机启动限制；报告 Head `54b85df` 的 Linux Firefox 为 13/13，Chromium quality 为 95/95。Cloudflare Pages commit Preview 已在内置浏览器打开，A/B 路由切换可用。最终 PR 检查链接见上方；可选 `visual-parity` job 被条件跳过。200% 浏览器 Zoom 与真实 iPhone Safari 仍是单独的设备/浏览器验证缺口。

## 第二轮视觉与交互复核

实现者完成初轮截图与 Playwright E2E 后，再根据方向差异、手机窄屏、编辑 Sheet、状态反馈、Reduced Motion 和生产样式隔离进行第二轮检查。该复核来自同一执行者的第二轮证据检查，不是外部独立 Reviewer Agent 审计。发现的 Pageboard 390/320 标题宽度问题已修正，并加入 180px 最小内容轨迹的断言；测试截图以最终修复后的页面重生成。

## 已知 Pending 与严重度

| 状态 | 严重度 | 说明 |
|---|---|---|
| Headless Chromium 不支持真实 browser UI zoom 操作 | P2 / Pending | app root font-size 模拟不等价；需要真实浏览器用户级 200% Zoom 验收 |
| 浏览器文字放大 / 页面 Zoom | P2 / Pending | 仅完成 CSS root 字号模拟；需要可以控制用户级文字缩放与 200% 页面缩放的真实浏览器复核 |
| 真实 iPhone Safari / 软键盘 / 地址栏 | P2 / Pending | 设备验收，不以 Chromium/WebKit 代替 |

GitHub Actions 和 Cloudflare Pages Preview 已在报告 Head `54b85df` 完成验证。`visual-parity` 为仅在带专用 PR label 时才运行的可选 job，本次被条件跳过；手工的同视口截图对照和交互复核另见 [设计探索](design-exploration.md) 与 `evidence/`，不能把该跳过 job 记作通过。
