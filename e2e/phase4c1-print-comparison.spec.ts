import { execFile } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { migrateWorkspace, type WorkspaceData } from '@entities/workspace';
import { expect, test } from '@playwright/test';

import { exportWorkspaceFromUI, uploadJsonThroughUI } from './workspace';

const execFileAsync = promisify(execFile);
const baselineUrl = 'http://127.0.0.1:43174';
const makeLongPrintFixture = (source: WorkspaceData): WorkspaceData => {
  const resume = {
    ...source.resume,
    personal: {
      ...source.resume.personal,
      fullName: '中文打印回归夹具 Inkless Cat',
      title: '资深产品工程师 / Senior Product Engineer',
      email: 'print-fixture@example.test',
      phone: '+86 138 0000 0000',
      location: '上海 / Shanghai',
      summary: '该夹具用于验证正式工作台外壳迁移前后的 A4 打印、中文换行和多页分页。'.repeat(4),
      extras: [],
      photo: '',
    },
    socials: [],
    experience: Array.from({ length: 8 }, (_, index) => ({
      id: `phase4c1-print-experience-${index + 1}`,
      company: `第 ${index + 1} 家产品团队 Product Team`,
      role: '资深前端工程师 / Senior Frontend Engineer',
      location: '上海 / Remote',
      startDate: `20${15 + index}-01`,
      endDate: `20${16 + index}-12`,
      highlights: Array.from(
        { length: 3 },
        (_, highlightIndex) =>
          `第 ${index + 1}.${highlightIndex + 1} 项交付：与产品、设计和工程伙伴协作，` +
          '改善复杂工作流，记录可验证的业务结果，并确保面向不同用户的功能具备清晰层级、可访问的交互和稳定的生产质量。',
      ),
    })),
    projects: [],
    education: [],
    skills: [],
    languages: [],
    interests: [],
    awards: [],
    customSections: [],
    settings: {
      ...source.resume.settings,
      personal: { ...source.resume.settings?.personal, showPhoto: false },
    },
  };

  const migrated = migrateWorkspace({
    ...source,
    resume,
    activeSections: ['experience'],
    customTemplates: [],
  });
  if (!migrated.ok) throw new Error(migrated.error.message);
  return migrated.value;
};

const readPageCount = async (pdfPath: string) => {
  const { stdout } = await execFileAsync('pdfinfo', ['-box', pdfPath]);
  const pages = stdout.match(/^Pages:\s+(\d+)$/mu)?.[1];
  const pageSize = stdout.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts \(A4\)$/mu);
  if (!pages || !pageSize) throw new Error(`Unexpected A4 PDF metadata:\n${stdout}`);
  return {
    count: Number(pages),
    width: Number(pageSize[1]),
    height: Number(pageSize[2]),
  };
};

const readPdfWordGeometry = async (pdfPath: string) => {
  const { stdout } = await execFileAsync('pdftotext', ['-bbox-layout', pdfPath, '-']);
  const pages = [...stdout.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/gu)];
  return pages.map((pageMatch) => {
    const pageMarkup = pageMatch[1] ?? '';
    return [
      ...pageMarkup.matchAll(
        /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"[^>]*>/gu,
      ),
    ].map(([, xMin, yMin, xMax, yMax]) => ({
      xMin: Number(xMin),
      yMin: Number(yMin),
      xMax: Number(xMax),
      yMax: Number(yMax),
    }));
  });
};

const renderPdfPages = async (pdfPath: string, prefix: string) => {
  await execFileAsync('pdftoppm', ['-png', '-r', '96', pdfPath, prefix]);
  const outputFolder = path.dirname(prefix);
  const prefixName = path.basename(prefix);
  const outputFiles = await readdir(outputFolder);
  return outputFiles
    .filter((filename) => filename.startsWith(`${prefixName}-`) && filename.endsWith('.png'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((filename) => path.join(outputFolder, filename));
};

const measureProductionPath = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => document.fonts.ready);
  const initial = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter((entry) => new URL(entry.name).origin === location.origin)
      .map((entry) => ({
        name: new URL(entry.name).pathname.split('/').at(-1) ?? '',
        transferBytes: entry.transferSize,
        decodedBytes: entry.decodedBodySize,
        durationMs: Number(entry.duration.toFixed(2)),
      }));
    const totalBytes = (pattern: RegExp) => {
      const total = { count: 0, transferBytes: 0, decodedBytes: 0 };
      for (const resource of resources) {
        if (!pattern.test(resource.name)) continue;
        total.count += 1;
        total.transferBytes += resource.transferBytes;
        total.decodedBytes += resource.decodedBytes;
      }
      return total;
    };
    return {
      navigation: {
        domContentLoadedMs: Number(navigation?.domContentLoadedEventEnd.toFixed(2) ?? 0),
        loadMs: Number(navigation?.loadEventEnd.toFixed(2) ?? 0),
      },
      assets: {
        javascript: totalBytes(/\.m?js$/iu),
        stylesheets: totalBytes(/\.css$/iu),
        fonts: totalBytes(/\.(?:woff2?|ttf|otf)$/iu),
        images: totalBytes(/\.(?:png|jpe?g|webp|svg)$/iu),
      },
      assetNames: resources.map((resource) => resource.name),
      requestsPhase4bDemo: resources.some((resource) => /phase4b|Phase4B/u.test(resource.name)),
    };
  });

  const measure = async (name: string, operation: () => Promise<void>) => {
    await page.evaluate((label) => performance.mark(`${label}-start`), name);
    await operation();
    return page.evaluate((label) => {
      performance.mark(`${label}-end`);
      return Number(
        performance.measure(label, `${label}-start`, `${label}-end`).duration.toFixed(2),
      );
    }, name);
  };

  const inputToPreviewMs = await measure('phase4c1-input-to-preview', async () => {
    const name = `Phase 4C performance ${new URL(page.url()).port}`;
    const nameField = page.getByRole('textbox', { name: /姓名|name/iu });
    await nameField.fill(name, { timeout: 5000 });
    await expect(page.locator('.resume-preview')).toContainText(name);
  });
  const templatePanelOpenMs = await measure('phase4c1-template-panel-open', async () => {
    await page.getByRole('button', { name: /展开模板|Expand Templates/u }).click();
    await expect(
      page
        .getByRole('group', { name: /选择一个简历模板|Choose one resume template/u })
        .getByRole('radio'),
    ).toHaveCount(4);
  });
  const moduleReorderMs = await measure('phase4c1-module-reorder', async () => {
    await page.getByRole('button', { name: /展开模块管理|Expand Module Manager/u }).click();
    await page
      .getByRole('button', { name: /下移|Move .* down/u })
      .first()
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: /已将.*移动到第|Moved .* to position/u }),
    ).not.toBeEmpty();
  });

  const mobileLayoutMs = await measure('phase4c1-mobile-layout', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /编辑器|Editor/u })).toBeVisible();
  });
  const mobilePreviewSwitchMs = await measure('phase4c1-mobile-preview-switch', async () => {
    await page.getByRole('button', { name: /预览|Preview/u }).click();
    await expect(
      page.locator('.resume-preview:visible').filter({ hasText: /Phase 4C performance/u }),
    ).toBeVisible();
  });
  const mobileHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  await page.setViewportSize({ width: 1440, height: 900 });

  return {
    ...initial,
    interactionsMs: {
      inputToPreview: inputToPreviewMs,
      templatePanelOpen: templatePanelOpenMs,
      moduleReorder: moduleReorderMs,
      mobileLayout: mobileLayoutMs,
      mobilePreviewSwitch: mobilePreviewSwitchMs,
    },
    mobileHorizontalOverflow,
  };
};

test('same Chinese multi-page fixture preserves A4 pages, text and word geometry', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const outputDirectory = path.dirname(testInfo.outputPath('phase4c1-print-head.pdf'));
  await mkdir(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const baselinePage = await page.context().newPage();
  try {
    await baselinePage.setViewportSize({ width: 1440, height: 900 });
    await baselinePage.goto(baselineUrl);
    const source = await exportWorkspaceFromUI(page);
    const headPerformance = await measureProductionPath(page);
    const baselinePerformance = await measureProductionPath(baselinePage);
    const performanceComparison = {
      note: 'Same Chromium runtime and runner; timings are single-run diagnostics, not a fixed latency budget.',
      baseline: baselinePerformance,
      head: headPerformance,
    };
    const performancePath = testInfo.outputPath('phase4c1-performance-comparison.json');
    await writeFile(performancePath, JSON.stringify(performanceComparison, null, 2));
    await testInfo.attach('phase4c1-performance-comparison.json', {
      path: performancePath,
      contentType: 'application/json',
    });
    expect(headPerformance.requestsPhase4bDemo).toBe(false);
    expect(baselinePerformance.requestsPhase4bDemo).toBe(false);
    expect(headPerformance.mobileHorizontalOverflow).toBe(false);
    expect(baselinePerformance.mobileHorizontalOverflow).toBe(false);

    const fixture = makeLongPrintFixture(source);
    const fixtureJson = JSON.stringify(fixture);

    await Promise.all([
      uploadJsonThroughUI(page, 'phase4c1-print-fixture.json', fixtureJson),
      uploadJsonThroughUI(baselinePage, 'phase4c1-print-fixture.json', fixtureJson),
    ]);
    await Promise.all([
      expect(
        page.locator('.resume-preview').filter({ hasText: '中文打印回归夹具 Inkless Cat' }),
      ).toContainText('中文打印回归夹具 Inkless Cat'),
      expect(
        baselinePage.locator('.resume-preview').filter({ hasText: '中文打印回归夹具 Inkless Cat' }),
      ).toContainText('中文打印回归夹具 Inkless Cat'),
    ]);

    await Promise.all([
      page.emulateMedia({ media: 'print' }),
      baselinePage.emulateMedia({ media: 'print' }),
    ]);
    for (const appPage of [page, baselinePage]) {
      await expect(
        appPage.locator('.resume-preview').filter({ hasText: '中文打印回归夹具 Inkless Cat' }),
      ).toBeVisible();
      if (await appPage.locator('.production-studio-root').count()) {
        await expect(appPage.locator('.production-topbar')).toBeHidden();
        await expect(appPage.locator('.production-editor-pane')).toBeHidden();
        await expect(appPage.locator('.production-studio-sidebar')).toBeHidden();
      } else {
        await expect(appPage.locator('header.sticky')).toBeHidden();
        await expect(appPage.locator('main > section').first()).toBeHidden();
      }
    }

    const headPdf = path.join(outputDirectory, 'phase4c1-print-head.pdf');
    const baselinePdf = path.join(outputDirectory, 'phase4c1-print-main.pdf');
    await Promise.all([
      page.pdf({ path: headPdf, format: 'A4', printBackground: true, preferCSSPageSize: true }),
      baselinePage.pdf({
        path: baselinePdf,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      }),
    ]);
    const headMetadata = await readPageCount(headPdf);
    const baselineMetadata = await readPageCount(baselinePdf);
    expect(headMetadata.count).toBeGreaterThan(1);
    expect(headMetadata).toEqual(baselineMetadata);
    expect(headMetadata.width).toBeGreaterThan(590);
    expect(headMetadata.width).toBeLessThan(600);
    expect(headMetadata.height).toBeGreaterThan(835);
    expect(headMetadata.height).toBeLessThan(850);

    const headText = await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', headPdf, '-']);
    const baselineText = await execFileAsync('pdftotext', [
      '-layout',
      '-enc',
      'UTF-8',
      baselinePdf,
      '-',
    ]);
    expect(headText.stdout.replaceAll('\r\n', '\n')).toBe(
      baselineText.stdout.replaceAll('\r\n', '\n'),
    );

    const [headGeometry, baselineGeometry] = await Promise.all([
      readPdfWordGeometry(headPdf),
      readPdfWordGeometry(baselinePdf),
    ]);
    expect(headGeometry).toHaveLength(baselineGeometry.length);
    let maxHorizontalDeltaPoints = 0;
    let maxVerticalDeltaPoints = 0;
    for (const [pageIndex, headWords] of headGeometry.entries()) {
      const baselineWords = baselineGeometry[pageIndex];
      expect(headWords).toHaveLength(baselineWords?.length ?? -1);
      for (const [wordIndex, headWord] of headWords.entries()) {
        const baselineWord = baselineWords?.[wordIndex];
        expect(baselineWord).toBeTruthy();
        maxHorizontalDeltaPoints = Math.max(
          maxHorizontalDeltaPoints,
          Math.abs(headWord.xMin - baselineWord!.xMin),
          Math.abs(headWord.xMax - baselineWord!.xMax),
        );
        maxVerticalDeltaPoints = Math.max(
          maxVerticalDeltaPoints,
          Math.abs(headWord.yMin - baselineWord!.yMin),
          Math.abs(headWord.yMax - baselineWord!.yMax),
        );
      }
    }
    expect(maxHorizontalDeltaPoints).toBe(0);
    expect(maxVerticalDeltaPoints).toBeLessThanOrEqual(1.51);

    const printGeometry = {
      method:
        'Poppler pdftotext -bbox-layout word coordinates; page size, page count, and extracted text are compared separately.',
      maximumAllowedVerticalDeltaPoints: 1.51,
      maxHorizontalDeltaPoints,
      maxVerticalDeltaPoints,
      pages: headGeometry.map((words, index) => ({
        page: index + 1,
        wordCount: words.length,
        maxVerticalDeltaPoints: Math.max(
          0,
          ...words.flatMap((word, wordIndex) => {
            const baselineWord = baselineGeometry[index]?.[wordIndex];
            if (!baselineWord) return [];
            return [
              Math.abs(word.yMin - baselineWord.yMin),
              Math.abs(word.yMax - baselineWord.yMax),
            ];
          }),
        ),
      })),
    };
    const geometryPath = testInfo.outputPath('phase4c1-print-geometry.json');
    await writeFile(geometryPath, JSON.stringify(printGeometry, null, 2));
    await testInfo.attach('phase4c1-print-geometry.json', {
      path: geometryPath,
      contentType: 'application/json',
    });

    const [headPages, baselinePages] = await Promise.all([
      renderPdfPages(headPdf, path.join(outputDirectory, 'phase4c1-print-head-page')),
      renderPdfPages(baselinePdf, path.join(outputDirectory, 'phase4c1-print-main-page')),
    ]);
    expect(headPages).toHaveLength(headMetadata.count);
    expect(baselinePages).toHaveLength(baselineMetadata.count);

    await testInfo.attach('phase4c1-print-main.pdf', {
      path: baselinePdf,
      contentType: 'application/pdf',
    });
    await testInfo.attach('phase4c1-print-head.pdf', {
      path: headPdf,
      contentType: 'application/pdf',
    });
    for (const [index, headPagePath] of headPages.entries()) {
      const baselinePagePath = baselinePages[index];
      expect(baselinePagePath, `baseline page ${index + 1} exists`).toBeTruthy();
      await testInfo.attach(`phase4c1-print-main-page-${index + 1}.png`, {
        path: baselinePagePath!,
        contentType: 'image/png',
      });
      await testInfo.attach(`phase4c1-print-head-page-${index + 1}.png`, {
        path: headPagePath,
        contentType: 'image/png',
      });
    }
  } finally {
    await baselinePage.close();
  }
});
