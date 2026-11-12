import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zmind.ui.onboarded', '1')
    localStorage.setItem('zmind.ui.locale', 'zh')
    localStorage.setItem('zmind.ui.inspector', '0')
    localStorage.setItem('zmind.ui.outline', '0')
  })
  await page.goto('/')
})

test('creates and edits a topic on the canvas', async ({ page }) => {
  const canvas = page.locator('[data-mindmap-canvas]')
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveAttribute('data-total-nodes', '13')

  await page.locator('[data-node-id][data-depth="0"]').click()
  await page.keyboard.press('Tab')

  const editor = page.locator('[data-node-editor]')
  await expect(editor).toBeVisible()
  await editor.fill('E2E Topic')
  await editor.press('Enter')

  await expect(canvas).toHaveAttribute('data-total-nodes', '14')
  await expect(canvas.getByText('E2E Topic')).toBeVisible()
})

test('edits a topic from the outline and syncs the canvas', async ({ page }) => {
  await page.locator('[data-toggle-outline]').click()
  const panel = page.locator('[data-outline-panel]')
  await expect(panel).toBeVisible()

  await panel.locator('[data-outline-node]').nth(1).dblclick()
  const editor = panel.locator('[data-outline-editor]')
  await expect(editor).toBeVisible()

  await editor.fill('Outline Topic')
  await editor.press('Enter')

  await expect(panel.locator('[data-outline-editor]')).toHaveCount(0)
  await expect(page.locator('[data-outline-node]').nth(1)).toContainText('Outline Topic')
  await expect(page.locator('[data-mindmap-canvas]').getByText('Outline Topic')).toBeVisible()
})

test('shows the empty state for a new document', async ({ page }) => {
  await page.locator('[data-file-new]').click()
  await expect(page.locator('[data-empty-state]')).toBeVisible()

  await page.locator('[data-empty-add]').click()
  await expect(page.locator('[data-empty-state]')).toHaveCount(0)
  await expect(page.locator('[data-node-editor]')).toBeVisible()
})

test('opens the guide and export menu', async ({ page }) => {
  await page.locator('[data-open-onboarding]').click()
  await expect(page.locator('[data-onboarding]')).toBeVisible()
  await page.locator('[data-onboarding-start]').click()
  await expect(page.locator('[data-onboarding]')).toHaveCount(0)

  await page.locator('[data-export-toggle]').click()
  await expect(page.locator('[data-export-menu]')).toBeVisible()
  await expect(page.locator('[data-export-png="1"]')).toBeVisible()
  await expect(page.locator('[data-export-pdf]')).toBeVisible()
})

test('shows the guide on first launch', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://localhost:4173/')
  await expect(page.locator('[data-onboarding]')).toBeVisible()
  await context.close()
})

test('culls offscreen nodes when zoomed in', async ({ page }) => {
  const canvas = page.locator('[data-mindmap-canvas]')
  await expect(canvas).toHaveAttribute('data-total-nodes', '13')
  await expect(canvas).toHaveAttribute('data-rendered-nodes', '13')

  const zoomIn = page.getByRole('button', { name: '放大' })
  for (let index = 0; index < 8; index += 1) {
    await zoomIn.click()
  }

  await expect
    .poll(async () => Number(await canvas.getAttribute('data-rendered-nodes')))
    .toBeLessThan(13)
})

test('switches themes without stale node styles', async ({ page }) => {
  await page.locator('[data-toggle-inspector]').click()
  await page.locator('[data-inspector-tab="theme"]').click()

  const root = page.locator('[data-node-id][data-depth="0"]')
  const before = await root.evaluate((element) => getComputedStyle(element).backgroundColor)
  await page.locator('[data-theme-id="fresh"]').click()

  await expect
    .poll(async () => root.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(before)
})

test('adds a child from the node context menu', async ({ page }) => {
  const canvas = page.locator('[data-mindmap-canvas]')
  await expect(canvas).toHaveAttribute('data-total-nodes', '13')

  await page.locator('[data-node-id][data-depth="0"]').click({ button: 'right' })
  const menu = page.locator('[data-context-menu]')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('data-context-menu-kind', 'node')
  await expect(page.locator('[data-context-item="edit"]')).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-context-item="add-child"]')).toBeFocused()

  await page.locator('[data-context-item="add-child"]').click()

  await expect(canvas).toHaveAttribute('data-total-nodes', '14')
  await expect(page.locator('[data-node-editor]')).toBeVisible()
})

test('opens and closes the canvas context menu', async ({ page }) => {
  const canvas = page.locator('[data-mindmap-canvas]')
  await canvas.click({ button: 'right', position: { x: 24, y: 24 } })

  const menu = page.locator('[data-context-menu]')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('data-context-menu-kind', 'canvas')
  await expect(page.locator('[data-context-item="fit"]')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})

test('captures unexpected errors in the error overlay', async ({ page }) => {
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('e2e boom')
    }, 0)
  })

  await expect(page.locator('[data-app-error]')).toBeVisible()
  await expect(page.locator('[data-app-error]')).toContainText('e2e boom')
  await page.locator('[data-dismiss-app-error]').last().click()
  await expect(page.locator('[data-app-error]')).toHaveCount(0)
})
