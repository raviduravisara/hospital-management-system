const { test, expect } = require('@playwright/test');

// Sprint 4: End-to-End Browser Automation
// Enables Video Recording & DOM Tracing automatically via Playwright config 
test.use({ video: 'on', trace: 'on' });

test.describe('Hospital Management System - E2E Flows', () => {

  test('E2E Clinical Booking Flow Validation', async ({ page }) => {
    // 1. Patient Login
    await page.goto('http://localhost:5173/login');
    await page.fill('#usernameOrEmail', 'patient_user99');
    await page.fill('#password', 'Password!123');
    await page.click('button[type="submit"]');

    // Ensure we reached the Dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Navigate to Booking Page
    await page.click('text="Appointments"');
    
    // 3. Find Doctor & Select Time
    await page.waitForSelector('select[name="doctorId"]', { state: 'visible' });
    await page.selectOption('select[name="doctorId"]', { index: 1 });
    await page.fill('input[type="date"]', '2026-05-15');
    
    // Select first available time slot
    await page.selectOption('select[name="appointmentTime"]', { index: 1 });
    await page.fill('textarea[name="reason"]', 'Routine checkup via Automated Script');

    // 4. Submit Booking
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/appointments') && res.status() === 201),
      page.click('button:has-text("Book Appointment")')
    ]);

    // 5. Verify Pending Status appears in UI
    await expect(page.locator('table')).toContainText('Pending');

    console.log("✅ Playwright E2E Flow Successful. Video captured.");
  });

});
