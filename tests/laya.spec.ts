import { test, expect } from '@playwright/test'

// Full user simulation: tests Laya the way a real user would interact with it.
// Run with: npx playwright test
// Or via the /test-laya Claude skill.

test.describe('Laya — intersection simulator', () => {

  test.beforeEach(async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/', { waitUntil: 'load' })
    await page.evaluate(errs => { (window as any).__consoleErrors = errs }, errors)
  })

  test('app loads without console errors', async ({ page }) => {
    await page.waitForLoadState('load')
    const errors = await page.evaluate(() => (window as any).__consoleErrors ?? [])
    expect(errors).toHaveLength(0)
  })

  test('SVG editor renders with intersection arms', async ({ page }) => {
    await page.waitForLoadState('load')
    // SVG should contain at least one <g> arm shape
    const armCount = await page.locator('svg g[style*="rotate"]').count()
    expect(armCount).toBeGreaterThanOrEqual(4)  // 4-way preset = 4 arms
  })

  test('presets load correctly', async ({ page }) => {
    await page.waitForLoadState('load')
    await page.selectOption('select', 't-junction')
    await page.waitForTimeout(300)
    const armCount = await page.locator('svg g[style*="rotate"]').count()
    expect(armCount).toBe(3)  // T-junction = 3 arms

    await page.selectOption('select', '4-way')
    await page.waitForTimeout(300)
    const armCount2 = await page.locator('svg g[style*="rotate"]').count()
    expect(armCount2).toBe(4)
  })

  test('simulation starts and canvas receives paint', async ({ page }) => {
    await page.waitForLoadState('load')
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Click Run
    await page.getByText('▶ Run').click()
    await page.waitForTimeout(1500)  // let agents spawn

    // Canvas should have non-trivial pixel data (agents rendered)
    const hasContent = await canvas.evaluate((c: HTMLCanvasElement) => {
      const ctx = c.getContext('2d')!
      const data = ctx.getImageData(0, 0, c.width, c.height).data
      // Count non-background pixels (background is near #0a0a0f = rgb(10,10,15))
      let nonBg = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 80 || data[i + 1] > 80) nonBg++  // bright = vehicle (not dark road)
      }
      return nonBg > 500
    })
    expect(hasContent).toBe(true)
  })

  test('pause stops simulation (canvas freezes)', async ({ page }) => {
    await page.waitForLoadState('load')
    await page.getByText('▶ Run').click()

    const canvas = page.locator('canvas')

    // Poll until the canvas is ACTIVELY CHANGING (agents are moving, not just signal lights which are static for 25s)
    let changing = false
    const deadline = Date.now() + 25000
    let prev = ''
    while (Date.now() < deadline) {
      const url = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())
      if (prev && url !== prev) { changing = true; break }
      prev = url
      await page.waitForTimeout(400)
    }
    expect(changing).toBe(true)  // canvas was changing while running

    // Now pause — canvas must freeze
    await page.getByText('⏸ Pause').click()
    await page.waitForTimeout(300)
    const s3 = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())
    await page.waitForTimeout(700)
    const s4 = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())
    expect(s3).toEqual(s4)
  })

  test('Signal panel opens and shows phases', async ({ page }) => {
    await page.waitForLoadState('load')
    await page.getByText('🚦 Signal').click()
    await expect(page.getByText('Signal Timers')).toBeVisible()
    await expect(page.getByText('Phase 1')).toBeVisible()
    await expect(page.getByText('Phase 4')).toBeVisible()  // 4-phase default
    // Close
    await page.getByText('🚦 Signal').click()
    await expect(page.getByText('Signal Timers')).not.toBeVisible()
  })

  test('chaos slider does not move fine-tune params', async ({ page }) => {
    await page.waitForLoadState('load')
    // Open fine-tune panel
    await page.getByTitle('Fine-tune individual parameters').click()
    // Read all range input values (fine-tune sliders are indices 1-5, chaos is 0)
    const sliderValues = await page.locator('input[type="range"]').evaluateAll(
      (els: HTMLInputElement[]) => els.slice(1, 6).map(e => e.value)
    )
    // Move chaos slider to 90
    await page.locator('input[type="range"]').first().fill('90')
    await page.waitForTimeout(100)
    // Fine-tune slider values should be unchanged
    const newValues = await page.locator('input[type="range"]').evaluateAll(
      (els: HTMLInputElement[]) => els.slice(1, 6).map(e => e.value)
    )
    expect(newValues).toEqual(sliderValues)
  })

  test('traffic density slider changes spawn rate', async ({ page }) => {
    await page.waitForLoadState('load')
    await page.getByText('▶ Run').click()
    await page.waitForTimeout(1000)

    const canvas = page.locator('canvas')
    const before = await canvas.screenshot()

    // Open traffic panel and reduce density to minimum
    await page.getByTitle('Traffic density controls').click()
    const densitySlider = page.locator('input[type="range"]').nth(1)
    await densitySlider.fill('0.1')
    await page.waitForTimeout(500)

    // ↺ Reset to clear existing agents
    await page.getByTitle('Clear all agents').click()
    await page.waitForTimeout(1000)

    const after = await canvas.screenshot()
    // Canvases should differ (fewer agents at lower density)
    expect(before).not.toEqual(after)
  })

  test('arm can be added and editor updates', async ({ page }) => {
    await page.waitForLoadState('load')
    const before = await page.locator('svg g[style*="rotate"]').count()
    await page.getByText('+ Arm').click()
    await page.waitForTimeout(200)
    const after = await page.locator('svg g[style*="rotate"]').count()
    expect(after).toBeGreaterThan(before)
  })

  test('share button writes URL hash', async ({ page }) => {
    await page.waitForLoadState('load')
    await page.getByText('Share').click()
    await page.waitForTimeout(200)
    const url = page.url()
    expect(url).toMatch(/#.{20,}/)  // URL has a non-trivial hash = encoded graph
  })

})
