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

test('reorders outline entries by dragging and syncs the canvas', async ({ page }) => {
  await page.locator('[data-toggle-outline]').click()
  const panel = page.locator('[data-outline-panel]')
  await expect(panel).toBeVisible()

  const rows = panel.locator('[data-outline-node]')
  const sourceId = await rows.nth(1).getAttribute('data-outline-node')
  expect(sourceId).toBeTruthy()

  const canvasNode = page.locator(`[data-node-id="${sourceId}"]`)
  const before = await canvasNode.boundingBox()

  const source = await rows.nth(1).boundingBox()
  const target = await rows.nth(5).boundingBox()
  if (!source || !target) throw new Error('missing outline row bounds')

  await page.mouse.move(source.x + 60, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(source.x + 60, source.y + source.height / 2 + 12, { steps: 3 })
  await page.mouse.move(target.x + 60, target.y + target.height - 2, { steps: 8 })

  const indicator = panel.locator('[data-outline-drop]')
  await expect(indicator).toHaveAttribute('data-outline-drop', 'after')
  await page.mouse.up()

  await expect(rows.nth(5)).toHaveAttribute('data-outline-node', sourceId)

  const after = await canvasNode.boundingBox()
  expect(after).not.toBeNull()
  expect(after?.y).not.toBe(before?.y)
})

test('moves outline topics from the context menu and syncs the canvas', async ({ page }) => {
  await page.locator('[data-toggle-outline]').click()
  const panel = page.locator('[data-outline-panel]')
  const rows = panel.locator('[data-outline-node]')
  const menu = panel.locator('[data-outline-context-menu]')

  const movedId = await rows.nth(1).getAttribute('data-outline-node')
  expect(movedId).toBeTruthy()

  const canvasNode = page.locator(`[data-node-id="${movedId}"]`)
  const before = await canvasNode.boundingBox()

  await rows.nth(1).click({ button: 'right' })
  await expect(menu).toBeVisible()
  await expect(page.locator('[data-outline-context-item="edit"]')).toBeFocused()
  await expect(page.locator('[data-outline-context-item="move-up"]')).toBeDisabled()

  await page.locator('[data-outline-context-item="move-down"]').click()

  await expect(menu).toHaveCount(0)
  await expect(rows.nth(5)).toHaveAttribute('data-outline-node', movedId)

  const after = await canvasNode.boundingBox()
  expect(after).not.toBeNull()
  expect(after?.y).not.toBe(before?.y)
})

test('promotes and demotes outline topics from the context menu', async ({ page }) => {
  await page.locator('[data-toggle-outline]').click()
  const panel = page.locator('[data-outline-panel]')
  const rows = panel.locator('[data-outline-node]')
  const menu = panel.locator('[data-outline-context-menu]')

  const promotedId = await rows.nth(3).getAttribute('data-outline-node')
  expect(promotedId).toBeTruthy()

  await rows.nth(3).click({ button: 'right' })
  await page.locator('[data-outline-context-item="promote"]').click()
  await expect(rows.nth(4)).toHaveAttribute('data-outline-node', promotedId)
  await expect(rows.nth(4)).toHaveCSS('padding-left', '20px')

  await rows.nth(4).click({ button: 'right' })
  await page.locator('[data-outline-context-item="demote"]').click()
  await expect(rows.nth(4)).toHaveAttribute('data-outline-node', promotedId)
  await expect(rows.nth(4)).toHaveCSS('padding-left', '34px')

  await rows.nth(0).click({ button: 'right' })
  await expect(page.locator('[data-outline-context-item="move-up"]')).toBeDisabled()
  await expect(page.locator('[data-outline-context-item="delete"]')).toBeDisabled()

  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})

test('creates a sheet and keeps content isolated', async ({ page }) => {
  const tabs = page.locator('[data-sheet-tab]')
  await expect(tabs).toHaveCount(1)

  await page.locator('[data-sheet-add]').click()
  await expect(tabs).toHaveCount(2)
  await expect(tabs.nth(1)).toHaveAttribute('data-sheet-active', 'true')
  await expect(page.locator('[data-empty-state]')).toBeVisible()

  await page.locator('[data-empty-add]').click()
  const editor = page.locator('[data-node-editor]')
  await editor.fill('Second sheet topic')
  await editor.press('Enter')
  await expect(page.locator('[data-mindmap-canvas]').getByText('Second sheet topic')).toBeVisible()

  await tabs.nth(0).click()
  await expect(tabs.nth(0)).toHaveAttribute('data-sheet-active', 'true')
  await expect(page.locator('[data-mindmap-canvas]')).toHaveAttribute('data-total-nodes', '13')
  await expect(page.locator('[data-mindmap-canvas]').getByText('Zmind')).toBeVisible()
  await expect(page.locator('[data-mindmap-canvas]').getByText('Second sheet topic')).toHaveCount(0)

  await tabs.nth(1).click()
  await expect(page.locator('[data-mindmap-canvas]').getByText('Second sheet topic')).toBeVisible()
})

test('renames, reorders and deletes sheets', async ({ page }) => {
  const tabs = page.locator('[data-sheet-tab]')
  await page.locator('[data-sheet-add]').click()
  await expect(tabs).toHaveCount(2)

  await tabs.nth(1).dblclick()
  const input = page.locator('[data-sheet-rename]')
  await expect(input).toBeVisible()
  await input.fill('计划')
  await input.press('Enter')
  await expect(tabs.nth(1)).toHaveText('计划')

  await tabs.nth(1).click({ button: 'right' })
  await page.locator('[data-sheet-context-item="move-left"]').click()
  await expect(tabs.nth(0)).toHaveText('计划')
  await expect(tabs.nth(0)).toHaveAttribute('data-sheet-active', 'true')

  await tabs.nth(0).click({ button: 'right' })
  await page.locator('[data-sheet-context-item="delete"]').click()
  await expect(page.locator('[data-sheet-delete-dialog]')).toBeVisible()
  await page.locator('[data-sheet-delete-confirm]').click()

  await expect(tabs).toHaveCount(1)
  await expect(page.locator('[data-sheet-delete-dialog]')).toHaveCount(0)
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

test('reorders sheets by dragging', async ({ page }) => {
  await page.locator('[data-sheet-add]').click()
  await page.locator('[data-sheet-add]').click()

  const tabs = page.locator('[data-sheet-tab]')
  await expect(tabs).toHaveCount(3)
  const thirdId = await tabs.nth(2).getAttribute('data-sheet-tab')

  const third = await tabs.nth(2).boundingBox()
  const first = await tabs.nth(0).boundingBox()
  if (!third || !first) throw new Error('missing sheet tab bounds')

  await page.mouse.move(third.x + third.width / 2, third.y + third.height / 2)
  await page.mouse.down()
  await page.mouse.move(third.x - 20, third.y + third.height / 2, { steps: 4 })
  await page.mouse.move(first.x + 4, first.y + first.height / 2, { steps: 6 })

  await expect(page.locator('[data-sheet-drop]')).toBeVisible()
  await page.mouse.up()

  await expect(tabs.nth(0)).toHaveAttribute('data-sheet-tab', thirdId)
})

test('adds markers in front of the topic text from vertical sections', async ({ page }) => {
  await page.locator('[data-toggle-inspector]').click()
  await page.locator('[data-inspector-tab="markers"]').click()

  const panel = page.locator('[data-marker-panel]')
  await expect(panel.locator('[data-marker-section]')).toHaveCount(7)
  await expect(panel.locator('[data-marker-section="star"] [data-marker-option]')).toHaveCount(7)
  await expect(panel.locator('[role="tab"]')).toHaveCount(0)

  const node = page.locator('[data-node-id][data-depth="2"]').first()
  await node.click()
  const before = await node.boundingBox()

  await panel.locator('[data-marker-option="star|red|"]').click()

  const markers = node.locator('[data-node-markers]')
  await expect(markers.locator('[data-marker-icon]')).toHaveCount(1)

  const after = await node.boundingBox()
  expect(after?.width).toBeGreaterThan(before?.width ?? 0)
  expect(after?.height).toBe(before?.height)

  const markerBox = await markers.boundingBox()
  const textBox = await node.locator('span').first().boundingBox()
  expect(markerBox?.x).toBeLessThan(textBox?.x ?? 0)
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
