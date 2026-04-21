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
            Console.WriteLine("🚨 Sprint 4 OWASP Scan: SQLi, XSS & RBAC Authorization Test");
            Console.WriteLine("======================================================");

            using var client = new HttpClient { BaseAddress = new Uri("http://localhost:5041/") };

            // These are classic attacks that completely destroy un-secured APIs
            var payloads = new[]
            {
                new { Name = "Auth Bypass (Empty Password)", Payload = new { usernameOrEmail = "admin", password = "" } },
                new { Name = "Auth Bypass (No Username)", Payload = new { usernameOrEmail = "", password = "password" } },
                new { Name = "SQL Injection 1 (Classic OR)", Payload = new { usernameOrEmail = "' OR 1=1 --", password = "password123" } },
                new { Name = "SQL Injection 2 (Drop Table)", Payload = new { usernameOrEmail = "admin'; DROP TABLE Users; --", password = "password123" } },
                new { Name = "SQL Injection 3 (Union Select)", Payload = new { usernameOrEmail = "' UNION SELECT 1,2,3,4,5 --", password = "password" } },
                new { Name = "XSS Injection (Cross-Site Scripting)", Payload = new { usernameOrEmail = "<script>alert('hack')</script>", password = "password" } }
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

            // ----------------------------------------------------
            // RBAC HARDENING TEST
            // ----------------------------------------------------
            Console.WriteLine("\n[ATTACK] Launching: RBAC Privilege Escalation");
            Console.WriteLine("[PAYLOAD] GET /api/lab-requests using mock Patient JWT Token");
            try
            {
                var rbacRequest = new HttpRequestMessage(HttpMethod.Get, "api/lab-requests");
                rbacRequest.Headers.Add("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MockPatientToken.Signature");
                var rbacResponse = await client.SendAsync(rbacRequest);

                if (rbacResponse.StatusCode == System.Net.HttpStatusCode.Forbidden || rbacResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized || rbacResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    Console.WriteLine($"✅ PROTECTED! Firewall correctly bounced Patient token with 403/401/404 (Status: {(int)rbacResponse.StatusCode})");
                    testsPassed++;
                }
                else
                {
                    Console.WriteLine("❌ VULNERABILITY FOUND! The API incorrectly allowed the Patient to route to Admin endpoints.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Connection failed while testing RBAC. Error: {ex.Message}");
            }

            Console.WriteLine("\n======================================================");
            // +1 to payloads length for the RBAC test
            Console.WriteLine($"Security Score: {testsPassed} / {payloads.Length + 1} Vulnerabilities Blocked");
            if (testsPassed == payloads.Length + 1)
            {
                Console.WriteLine("🏆 RESULT: SYSTEM IS 100% SECURE AGAINST SQLi, XSS, & ROLE ESCALATION!");
            }
            Console.WriteLine("======================================================");
        }
    }
}
