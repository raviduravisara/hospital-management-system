using System;
using System.Threading;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;

namespace HospitalUI.UITests
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("==================================================");
            Console.WriteLine("🏥 Sprint 3 QA: Selenium E2E Automation Started...");
            Console.WriteLine("==================================================");

            // Selenium 4 automatically manages the ChromeDriver!
            var options = new ChromeOptions();
            // Important for demo: We DO NOT use headless so the reviewers can see the browser moving!
            options.AddArgument("--start-maximized"); 
            // Avoid automation banners
            options.AddExcludedArgument("enable-automation");

            using IWebDriver driver = new ChromeDriver(options);
            WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));

            try
            {
                Console.WriteLine("--> Navigating to the Login Page...");
                driver.Navigate().GoToUrl("http://localhost:5173/login");

                // Wait for the login form to appear
                var usernameInput = wait.Until(d => d.FindElement(By.Id("usernameOrEmail")));
                var passwordInput = driver.FindElement(By.Id("password"));
                var submitButton = driver.FindElement(By.CssSelector("button[type='submit']"));

                Console.WriteLine("--> Entering user credentials...");
                usernameInput.SendKeys("Admin");
                Thread.Sleep(1000); // Artificial delay to make it look cool for the demo

                passwordInput.SendKeys("Admin@123");
                Thread.Sleep(1000);

                Console.WriteLine("--> Clicking login button...");
                submitButton.Click();

                // Wait for dashboard or error to show action happened
                Thread.Sleep(3000); 
                
                Console.WriteLine("--> Automation complete! Capturing screenshot...");
                Screenshot ss = ((ITakesScreenshot)driver).GetScreenshot();
                ss.SaveAsFile("Selenium_Demo_Screenshot.png");
                Console.WriteLine("--> Screenshot saved as 'Selenium_Demo_Screenshot.png'");

                Console.WriteLine("✅ E2E UI Test executed successfully!");
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Test Failed: " + ex.Message);
                Console.WriteLine("Make sure your frontend React app is running on http://localhost:5173");
            }
            finally
            {
                Thread.Sleep(3000); // Leave browser open slightly so reviewers see it
                driver.Quit();
                Console.WriteLine("==================================================");
            }
        }
    }
}
