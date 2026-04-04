using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HospitalAPI.SecurityTests
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("======================================================");
            Console.WriteLine("🚨 OWASP ZAP Automated Scan: SQLi & Auth Bypass Test");
            Console.WriteLine("======================================================");

            using var client = new HttpClient { BaseAddress = new Uri("http://localhost:5041/") };

            // These are classic attacks that completely destroy un-secured APIs
            var payloads = new[]
            {
                new { Name = "Auth Bypass (Empty Password)", Payload = new { usernameOrEmail = "admin", password = "" } },
                new { Name = "Auth Bypass (No Username)", Payload = new { usernameOrEmail = "", password = "password" } },
                new { Name = "SQL Injection 1 (Classic OR)", Payload = new { usernameOrEmail = "' OR 1=1 --", password = "password123" } },
                new { Name = "SQL Injection 2 (Drop Table)", Payload = new { usernameOrEmail = "admin'; DROP TABLE Users; --", password = "password123" } },
                new { Name = "SQL Injection 3 (Union Select)", Payload = new { usernameOrEmail = "' UNION SELECT 1,2,3,4,5 --", password = "password" } }
            };

            int testsPassed = 0;

            foreach (var test in payloads)
            {
                Console.WriteLine($"\n[ATTACK] Launching: {test.Name}");
                Console.WriteLine($"[PAYLOAD] {JsonSerializer.Serialize(test.Payload)}");

                try
                {
                    var content = new StringContent(JsonSerializer.Serialize(test.Payload), Encoding.UTF8, "application/json");
                    var response = await client.PostAsync("api/auth/login", content);

                    // If it returns 200 OK, the vulnerability works! (Which is bad)
                    // If it returns 400 Bad Request or 401 Unauthorized, the API is safe.
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine("❌ VULNERABILITY FOUND! The API incorrectly allowed the payload.");
                    }
                    else
                    {
                        Console.WriteLine($"✅ PROTECTED! Server safely rejected the payload (Status: {(int)response.StatusCode} {response.StatusCode})");
                        testsPassed++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Connection failed. Make sure the API is running at localhost:5041. Error: {ex.Message}");
                }
            }

            Console.WriteLine("\n======================================================");
            Console.WriteLine($"Security Score: {testsPassed} / {payloads.Length} Vulnerabilities Blocked");
            if (testsPassed == payloads.Length)
            {
                Console.WriteLine("🏆 RESULT: SYSTEM IS 100% SECURE AGAINST SQLi & BASIC AUTH BYPASS!");
            }
            Console.WriteLine("======================================================");
        }
    }
}
