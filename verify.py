
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:4173/dispatch/")

        # Click the "Play" button
        await page.click(".start-screen__button-play")

        # Wait for the start screen to be hidden
        await expect(page.locator(".start-screen")).to_be_hidden()

        print("Test passed: Start screen is hidden after clicking 'Play'.")

        await browser.close()

asyncio.run(main())
