import asyncio
from playwright.async_api import async_playwright, expect

async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print("Waiting for dev server to start...")
            await page.wait_for_timeout(5000)
            print("Navigating to the page...")
            await page.goto("http://localhost:5173/dispatch/", timeout=60000)

            print("Clicking the 'Play' button...")
            await page.locator('button:has-text("Play")').click()

            print("Waiting for game to load...")
            await page.wait_for_timeout(5000)
            await page.screenshot(path="verification/after_play_click.png")

            # --- PHASE 1: Get a consultant injured ---
            print("\n--- Starting Phase 1: Get a consultant injured ---")
            injured_consultant_name = None
            max_retries = 10
            injury_achieved = False

            for i in range(max_retries):
                print(f"Injury Attempt #{i+1}/{max_retries}...")

                marker = page.locator(".marker-wrapper button").first
                await marker.wait_for(state="visible", timeout=30000)
                await marker.click()

                await page.locator("h2").first.wait_for(state="visible", timeout=10000)

                consultant_button = page.locator("button[title*='Miles']")
                await consultant_button.wait_for(state="visible")

                consultant_name = "Miles"
                print(f"Attempting mission with: '{consultant_name}'")
                await consultant_button.click()

                await page.locator("button:has-text('Dispatch')").click()

                # Wait for the result animation to complete by waiting for the 'Continue' button
                await expect(page.locator("button:has-text('Continue')")).to_be_visible(timeout=10000)

                success_locator = page.locator("div", has_text="Mission successful")
                failure_locator = page.locator("div", has_text="Mission failed")

                if await failure_locator.is_visible():
                    print("Mission failed as expected.")
                    await expect(failure_locator).to_contain_text("were injured")
                    injured_consultant_name = consultant_name
                    injury_achieved = True
                    await page.screenshot(path="verification/consultant_injured.png")
                    print("Injury confirmed.")
                    await page.locator("button:has-text('Continue')").click()
                    break
                else:
                    print("Mission succeeded. Retrying to get a failure.")
                    await page.locator("button:has-text('Continue')").click()
                    await page.wait_for_timeout(2000)

            if not injury_achieved:
                raise Exception(f"Could not achieve a mission failure to test injury after {max_retries} attempts.")

            injured_consultant_in_bar = page.locator(".consultant-card.injured", has_text=injured_consultant_name)
            await expect(injured_consultant_in_bar).to_be_visible()
            print(f"'{injured_consultant_name}' is correctly shown as injured in the bar.")

            # --- PHASE 2: Get the same consultant 'out' ---
            print(f"\n--- Starting Phase 2: Get 'Miles' to 'out' status ---")
            out_achieved = False

            for i in range(max_retries):
                print(f"'Out' Attempt #{i+1}/{max_retries}...")

                marker = page.locator(".marker-wrapper button").first
                await marker.wait_for(state="visible", timeout=30000)
                await marker.click()

                await page.locator("h2").first.wait_for(state="visible", timeout=10000)

                injured_consultant_button = page.locator("button[title*='Miles']")
                await injured_consultant_button.click()
                print(f"Attempting mission with injured consultant: 'Miles'")

                await page.locator("button:has-text('Dispatch')").click()

                # Wait for the result animation to complete by waiting for the 'Continue' button
                await expect(page.locator("button:has-text('Continue')")).to_be_visible(timeout=10000)

                success_locator = page.locator("div", has_text="Mission successful")
                failure_locator = page.locator("div", has_text="Mission failed")

                if await failure_locator.is_visible():
                    print("Mission failed as expected.")
                    await expect(failure_locator).to_contain_text("now out for the rest of the game")
                    out_achieved = True
                    await page.screenshot(path="verification/consultant_out.png")
                    print("'Out' status confirmed.")
                    await page.locator("button:has-text('Continue')").click()
                    break
                else:
                    print("Mission succeeded. Retrying to get a failure.")
                    await page.locator("button:has-text('Continue')").click()
                    await page.wait_for_timeout(2000)

            if not out_achieved:
                raise Exception(f"Could not get 'out' status after {max_retries} attempts.")

            out_consultant_in_bar = page.locator(".consultant-card.out", has_text=injured_consultant_name)
            await expect(out_consultant_in_bar).to_be_visible()
            print(f"'{injured_consultant_name}' is correctly shown as 'out' in the bar.")

            # --- PHASE 3: Verify 'out' consultant is not selectable ---
            print("\n--- Starting Phase 3: Verify 'out' consultant is not selectable ---")
            await page.wait_for_timeout(2000)
            final_marker = page.locator(".marker-wrapper button").first
            await final_marker.wait_for(state="visible", timeout=30000)
            await final_marker.click()

            out_consultant_button = page.locator("button[title*='Miles']")
            await expect(out_consultant_button).to_be_disabled()
            print("'Miles' is correctly disabled in the selection modal.")

            print("\nVerification successful!")
            await page.screenshot(path="verification/verification_success.png")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="verification/verification_error.png")
            raise
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run_verification())
