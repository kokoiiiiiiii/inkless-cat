import { execFileSync, spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineRoot = process.env.MODERNIZATION_BASELINE_DIR;
const outputRoot = path.resolve(
  process.env.MODERNIZATION_VISUAL_RESULTS ?? path.join(repoRoot, '.visual-regression-results'),
);

const readCheckoutSha = (directory) =>
  execFileSync(
    'git',
    ['-c', `safe.directory=${directory}`, '-C', directory, 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim();

if (!baselineRoot) {
  throw new Error('MODERNIZATION_BASELINE_DIR is required; visual comparison cannot be skipped.');
}

const baseDirectory = path.resolve(baselineRoot);
const expectedBaselineSha = process.env.MODERNIZATION_BASELINE_SHA;
const expectedHeadSha = process.env.MODERNIZATION_HEAD_SHA;
const baselineSha = readCheckoutSha(baseDirectory);
const checkoutSha = readCheckoutSha(repoRoot);
if (expectedBaselineSha && baselineSha !== expectedBaselineSha) {
  throw new Error(
    `Expected base ${expectedBaselineSha}, but visual baseline checkout is ${baselineSha}.`,
  );
}
if (expectedHeadSha && checkoutSha !== expectedHeadSha) {
  throw new Error(`Expected PR head ${expectedHeadSha}, but visual checkout is ${checkoutSha}.`);
}
const baselineVite = path.join(baseDirectory, 'node_modules/vite/bin/vite.js');
const headVite = path.join(repoRoot, 'node_modules/vite/bin/vite.js');
const serverDefinitions = [
  { label: 'main', directory: baseDirectory, vite: baselineVite, port: 4178 },
  { label: 'head', directory: repoRoot, vite: headVite, port: 4179 },
];
const serverProcesses = [];
const maxChangedGt2Pct = 0.5;
const maxChangedGt16Pct = 0.35;
const maxChangedGt64Pct = 0.05;
const maxMeanChannelDelta = 0.5;
const serverReadyTimeoutMs = 60_000;
const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const logFor = (child) => {
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output = (output + chunk).slice(-8000);
  });
  child.stderr.on('data', (chunk) => {
    output = (output + chunk).slice(-8000);
  });
  return () => output;
};

const startServer = ({ directory, vite, port }) => {
  const child = spawn(
    process.execPath,
    [vite, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: directory, env: { ...process.env, CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const getOutput = logFor(child);
  serverProcesses.push(child);
  return { child, getOutput, url: `http://127.0.0.1:${port}/` };
};

const waitForServer = async ({ child, getOutput, url }) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < serverReadyTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready at ${url}:\n${getOutput()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Vite did not become ready at ${url}:\n${getOutput()}`);
};

const setTheme = async (page, theme) => {
  const current = await page.locator('html').getAttribute('data-theme');
  if (current !== theme) {
    await page.getByRole('button', { name: current === 'dark' ? '日间模式' : '夜间模式' }).click();
  }
  if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
    throw new Error(
      `Expected ${theme} theme, got ${await page.locator('html').getAttribute('data-theme')}`,
    );
  }
};

const scenarios = [
  {
    name: 'desktop-editor-light',
    viewport: viewports.desktop,
    prepare: async (page) => {
      await page.getByRole('heading', { name: '编辑器' }).waitFor({ state: 'visible' });
      await page.getByRole('textbox', { name: '姓名' }).waitFor({ state: 'visible' });
    },
  },
  {
    name: 'desktop-editor-dark',
    viewport: viewports.desktop,
    prepare: (page) => setTheme(page, 'dark'),
  },
  {
    name: 'mobile-editor-preview',
    viewport: viewports.mobile,
    prepare: async (page) => {
      await page.getByRole('textbox', { name: '姓名' }).waitFor({ state: 'visible' });
      await page.getByRole('checkbox', { name: '实时预览' }).check();
      await page.getByRole('heading', { name: '实时预览' }).waitFor({ state: 'visible' });
    },
  },
  {
    name: 'template-selector',
    viewport: viewports.desktop,
    prepare: async (page) => {
      await page.getByRole('button', { name: /展开模板|Expand Templates/u }).click();
      await page
        .getByRole('group', { name: /选择一个简历模板|Choose one resume template/u })
        .waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ai-settings',
    viewport: viewports.desktop,
    prepare: async (page) => {
      await page.getByRole('button', { name: 'AI 设置' }).click();
      await page.getByRole('dialog', { name: 'AI 服务设置' }).waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ai-interview-no-provider',
    viewport: viewports.desktop,
    prepare: async (page) => {
      await page.getByRole('button', { name: 'AI 创建简历' }).click();
      const dialog = page.getByRole('dialog', { name: 'AI 智能简历访谈' });
      await dialog.getByRole('button', { name: '使用基础问题开始' }).click();
      await dialog.getByRole('textbox', { name: '你的回答' }).waitFor({ state: 'visible' });
    },
  },
  {
    name: 'a4-print-preview',
    viewport: viewports.desktop,
    prepare: async (page) => {
      await page.emulateMedia({ media: 'print' });
      await page.locator('.resume-preview').first().waitFor({ state: 'visible' });
    },
    fullPage: true,
  },
];

const capture = async (browser, url, scenario, label) => {
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const nameInput = page.getByRole('textbox', { name: '姓名' });
    await nameInput.waitFor({ state: 'visible' });
    const name = await nameInput.inputValue();
    if (name !== '陈情') throw new Error(`Expected the fixed sample resume name, got ${name}.`);
    await scenario.prepare(page);
    const screenshot = await page.screenshot({
      animations: 'disabled',
      fullPage: scenario.fullPage ?? false,
    });
    const file = path.join(outputRoot, scenario.name, `${label}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, screenshot);
    return {
      screenshot,
      fontFamily: await page.evaluate(() => getComputedStyle(document.body).fontFamily),
    };
  } finally {
    await context.close();
  }
};

const compare = async (browser, baseline, head, scenario) => {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ({ before, after }) => {
        const decode = (base64) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = `data:image/png;base64,${base64}`;
          });
        const [beforeImage, afterImage] = await Promise.all([decode(before), decode(after)]);
        if (
          beforeImage.naturalWidth !== afterImage.naturalWidth ||
          beforeImage.naturalHeight !== afterImage.naturalHeight
        ) {
          return {
            dimensions: `${beforeImage.naturalWidth}x${beforeImage.naturalHeight} vs ${afterImage.naturalWidth}x${afterImage.naturalHeight}`,
            dimensionMismatch: true,
          };
        }

        const canvas = document.createElement('canvas');
        canvas.width = beforeImage.naturalWidth;
        canvas.height = beforeImage.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas 2D context is unavailable for PNG comparison.');
        context.drawImage(beforeImage, 0, 0);
        const beforePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(afterImage, 0, 0);
        const afterPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const diff = context.createImageData(canvas.width, canvas.height);
        let changedGt2 = 0;
        let changedGt16 = 0;
        let changedGt64 = 0;
        let channelDeltaTotal = 0;
        const pixelCount = canvas.width * canvas.height;

        for (let offset = 0; offset < beforePixels.length; offset += 4) {
          const delta = Math.max(
            Math.abs(beforePixels[offset] - afterPixels[offset]),
            Math.abs(beforePixels[offset + 1] - afterPixels[offset + 1]),
            Math.abs(beforePixels[offset + 2] - afterPixels[offset + 2]),
            Math.abs(beforePixels[offset + 3] - afterPixels[offset + 3]),
          );
          channelDeltaTotal +=
            Math.abs(beforePixels[offset] - afterPixels[offset]) +
            Math.abs(beforePixels[offset + 1] - afterPixels[offset + 1]) +
            Math.abs(beforePixels[offset + 2] - afterPixels[offset + 2]);
          if (delta > 2) {
            changedGt2 += 1;
            diff.data[offset] = 255;
            diff.data[offset + 1] = 32;
            diff.data[offset + 2] = 32;
            diff.data[offset + 3] = 255;
          } else {
            diff.data[offset] = afterPixels[offset];
            diff.data[offset + 1] = afterPixels[offset + 1];
            diff.data[offset + 2] = afterPixels[offset + 2];
            diff.data[offset + 3] = afterPixels[offset + 3];
          }
          if (delta > 16) changedGt16 += 1;
          if (delta > 64) changedGt64 += 1;
        }

        context.putImageData(diff, 0, 0);
        return {
          width: canvas.width,
          height: canvas.height,
          changedGt2Pct: (changedGt2 / pixelCount) * 100,
          changedGt16Pct: (changedGt16 / pixelCount) * 100,
          changedGt64Pct: (changedGt64 / pixelCount) * 100,
          meanChannelDelta: channelDeltaTotal / (pixelCount * 3),
          diffImage: canvas.toDataURL('image/png'),
        };
      },
      { before: baseline.toString('base64'), after: head.toString('base64') },
    );
  } finally {
    await page.close();
  }
};

const stopServers = async () => {
  await Promise.all(
    serverProcesses.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) return resolve();
          child.once('exit', resolve);
          child.kill('SIGTERM');
          setTimeout(() => {
            if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
          }, 5000).unref();
        }),
    ),
  );
};

await mkdir(outputRoot, { recursive: true });
await Promise.all([
  access(path.join(baseDirectory, 'dist/index.html')),
  access(path.join(repoRoot, 'dist/index.html')),
]);
const servers = serverDefinitions.map((definition) => startServer(definition));
let browser;
try {
  await Promise.all(servers.map((server) => waitForServer(server)));
  browser = await chromium.launch({ headless: true, chromiumSandbox: true });
  const browserVersion = browser.version();
  console.log(
    `Production-build comparison Chromium: ${browserVersion}; base ${baselineSha}; PR head ${expectedHeadSha ?? checkoutSha}; DPR 1; reduced motion; fresh browser contexts.`,
  );

  const results = [];
  const fontFamilies = new Set();
  for (const scenario of scenarios) {
    const baselineCapture = await capture(browser, servers[0].url, scenario, 'main');
    const headCapture = await capture(browser, servers[1].url, scenario, 'head');
    const baseline = baselineCapture.screenshot;
    const head = headCapture.screenshot;
    fontFamilies.add(baselineCapture.fontFamily);
    fontFamilies.add(headCapture.fontFamily);
    console.log(
      `CAPTURE PASS ${scenario.name}: main ${baseline.length} bytes, head ${head.length} bytes; screenshots saved.`,
    );

    const result = await compare(browser, baseline, head, scenario);
    result.fontMismatch = baselineCapture.fontFamily !== headCapture.fontFamily;
    result.fontFamily = {
      main: baselineCapture.fontFamily,
      head: headCapture.fontFamily,
    };
    if (result.diffImage) {
      const diffPath = path.join(outputRoot, scenario.name, 'diff.png');
      await writeFile(diffPath, Buffer.from(result.diffImage.split(',')[1], 'base64'));
    }
    results.push({ name: scenario.name, ...result });
  }

  const failures = results.filter(
    (result) =>
      result.dimensionMismatch ||
      result.fontMismatch ||
      result.changedGt2Pct > maxChangedGt2Pct ||
      result.changedGt16Pct > maxChangedGt16Pct ||
      result.changedGt64Pct > maxChangedGt64Pct ||
      result.meanChannelDelta > maxMeanChannelDelta,
  );
  console.table(
    results.map(
      ({
        name,
        width,
        height,
        fontMismatch,
        changedGt2Pct,
        changedGt16Pct,
        changedGt64Pct,
        meanChannelDelta,
      }) => ({
        name,
        size: width && height ? `${width}x${height}` : 'dimension mismatch',
        fontMatch: fontMismatch === false,
        '>2 px %': changedGt2Pct?.toFixed(4) ?? '—',
        '>16 px %': changedGt16Pct?.toFixed(4) ?? '—',
        '>64 px %': changedGt64Pct?.toFixed(4) ?? '—',
        'mean channel delta': meanChannelDelta?.toFixed(4) ?? '—',
      }),
    ),
  );
  const report = {
    baselineSha,
    prHeadSha: expectedHeadSha ?? checkoutSha,
    checkedOutSha: checkoutSha,
    runtime: {
      node: process.version,
      chromium: browserVersion,
      buildType: 'production builds served by Vite preview',
      viewport: '1440x900 desktop; 390x844 mobile',
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      fontFamilies: [...fontFamilies],
      data: 'fresh browser contexts; sample resume name 陈情; no configured AI provider',
    },
    thresholds: {
      changedPixelsAbove2Percent: maxChangedGt2Pct,
      changedPixelsAbove16Percent: maxChangedGt16Pct,
      changedPixelsAbove64Percent: maxChangedGt64Pct,
      meanRgbChannelDelta: maxMeanChannelDelta,
      imageDimensionsMustMatch: true,
      computedFontFamilyMustMatch: true,
    },
    results: results.map(({ name, diffImage, ...result }) => ({ name, ...result })),
    passed: failures.length === 0,
  };
  await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (failures.length > 0) {
    throw new Error(
      `DIFF FAIL: ${failures.map((result) => result.name).join(', ')} exceeded strict thresholds or mismatched image dimensions/fonts (changed pixels >2 <= ${maxChangedGt2Pct}%, >16 <= ${maxChangedGt16Pct}%, >64 <= ${maxChangedGt64Pct}%, mean channel delta <= ${maxMeanChannelDelta}). Screenshots and diffs are in ${outputRoot}.`,
    );
  }
  console.log(
    `DIFF PASS: ${results.length} old-main vs head screenshot pairs stayed within strict thresholds; diff images are in ${outputRoot}.`,
  );
} finally {
  if (browser) await browser.close();
  await stopServers();
}
