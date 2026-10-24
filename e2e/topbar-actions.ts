import type { Locator, Page } from '@playwright/test';

const moreActionsButton = (page: Page) =>
  page.getByRole('button', { name: /更多操作|More actions/u });

export const clickSecondaryTopbarAction = async (page: Page, label: string | RegExp) => {
  const moreActions = moreActionsButton(page);
  if (await moreActions.isVisible()) {
    await moreActions.click();
    await page.getByRole('menuitem', { name: label }).click();
    return;
  }

  await page.getByRole('button', { name: label }).click();
};

export const secondaryTopbarActionReturnTarget = async (
  page: Page,
  actionLabel: string | RegExp,
): Promise<Locator> => {
  const moreActions = moreActionsButton(page);
  return (await moreActions.isVisible())
    ? moreActions
    : page.getByRole('button', { name: actionLabel });
};
