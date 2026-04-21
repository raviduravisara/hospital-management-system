# C#/.NET Code Review Checklist
**Project:** HEALIX Hospital Management System
**Use for:** Pull Request reviews
**Version:** Sprint 2

> **How to use:** Check each item during PR review. Add a ❌ comment inline in GitHub for any item that fails.

---

## 🔴 P1 — Must Fix Before Merge

### Naming Conventions
- [ ] Classes, records, interfaces → `PascalCase` (e.g. `InvoiceService`, `IInvoiceService`)
- [ ] Methods and properties → `PascalCase` (e.g. `GetByIdAsync`, `TotalAmount`)
- [ ] Private fields → `_camelCase` (e.g. `_connectionFactory`)
- [ ] Local variables and parameters → `camelCase` (e.g. `invoiceId`, `cancellationToken`)
- [ ] Interfaces prefixed with `I` (e.g. `IInvoiceService`, not `InvoiceServiceInterface`)
- [ ] Async methods suffixed with `Async` (e.g. `CreateAsync`, not `Create`)
- [ ] No abbreviations in names — `request` not `req`, `cancellationToken` not `ct`

### Dependency Injection
- [ ] Services depend on **interfaces**, never on concrete implementations
- [ ] All service dependencies injected via **constructor** — no `new ServiceName()` inside classes
- [ ] Correct DI lifetimes registered in `Program.cs`:
  - `AddScoped` for DB-accessing services
  - `AddSingleton` only for truly stateless, thread-safe singletons
  - `AddTransient` for lightweight, stateless utilities
- [ ] No `ServiceLocator` pattern — no `IServiceProvider.GetService()` outside of startup
- [ ] No `static` service state unless explicitly justified and documented

### Exception Handling
- [ ] No bare `catch (Exception ex) { }` swallowing exceptions silently
- [ ] Database exceptions caught at the service layer and mapped to a result type — not propagated raw to the API layer
- [ ] `OperationResult` pattern used for expected business failures (e.g. "duplicate license")
- [ ] Unhandled exceptions **logged** before being re-thrown or returned
- [ ] No `throw ex` (resets stack trace) — use `throw` to rethrow or `throw new WrapperException(ex)`
- [ ] `CancellationToken` passed through to all async database calls

### Security
- [ ] No hardcoded secrets, passwords, or connection strings in source code
- [ ] All sensitive config values read from `appsettings.json` / environment variables
- [ ] Every endpoint has explicit `.RequireAuthorization()` with a role policy — no accidentally public admin endpoints
- [ ] User input never directly concatenated into SQL — parameterized queries only

---

## 🟠 P2 — Should Fix (flag in review)

### Code Quality & Readability
- [ ] Methods are small and do one thing — refactor if a method exceeds ~40 lines
- [ ] Magic numbers/strings extracted to named constants or configuration (e.g. `LowStockDefaultThreshold = 20`)
- [ ] No commented-out code blocks in production code — delete or use a TODO with ticket number
- [ ] `record` types used for immutable DTOs (requests, responses, results)
- [ ] `sealed` applied to classes not intended for inheritance
- [ ] LINQ used instead of manual loops where it improves readability

### Async / Await
- [ ] No `.Result` or `.Wait()` on async methods — always `await`
- [ ] No `async void` methods (except event handlers) — use `async Task`
- [ ] `ConfigureAwait(false)` not required in ASP.NET Core, but no `Task.Run` wrapping I/O calls

### API Design (Minimal API endpoints in `Program.cs`)
- [ ] HTTP status codes are semantically correct:
  - `200 OK` for successful reads/updates
  - `201 Created` for new resource creation
  - `204 No Content` for successful deletes
  - `400 Bad Request` for validation failures
  - `401 Unauthorized` for missing/invalid token
  - `403 Forbidden` for insufficient permissions
  - `404 Not Found` for missing resources
- [ ] Route parameters use type constraints (e.g. `{id:int}`)
- [ ] Endpoint returns `Results.Forbid()` for cross-user access — not 404 (avoids resource enumeration but keeps intent clear)

### Logging
- [ ] `ILogger` (Serilog) used — no `Console.WriteLine` in production code
- [ ] Log levels used correctly: `Debug` for trace, `Information` for business events, `Warning` for recoverable issues, `Error` for exceptions
- [ ] Sensitive data (passwords, tokens) **never** logged

---

## 🟡 P3 — Nice to Have (mention in review)

### Test Coverage
- [ ] Every public service method has at least one unit test
- [ ] Happy path, null/not-found, and exception cases all covered
- [ ] Test class names match `<ClassName>Tests` convention
- [ ] Test method names follow `MethodName_Condition_ExpectedOutcome` pattern
  - ✅ `GetByIdAsync_NonExistentDoctor_ReturnsNull`
  - ❌ `Test1` or `TestGetById`
- [ ] No logic in test arrangement — test data should be obvious and minimal
- [ ] `[Theory]` + `[InlineData]` used for parameterised cases instead of copy-paste tests

### Documentation
- [ ] Public interfaces have XML doc comments (`/// <summary>`)
- [ ] Complex business rules have inline comments explaining *why*, not *what*
- [ ] New endpoint listed in `HospitalAPI.http` file for quick manual testing reference

### Database / SQL
- [ ] Raw SQL queries use `@paramName` placeholders — never string interpolation
- [ ] `await using` used on `MySqlConnection` and `MySqlCommand` (proper disposal)
- [ ] No `SELECT *` — always select named columns
- [ ] Large result sets use streaming reads (`ExecuteReaderAsync`) not in-memory collection loads

---

## PR Checklist for the Author

Before requesting review, confirm:

- [ ] `dotnet build` passes with **zero warnings**
- [ ] `dotnet test` passes with **all tests green**
- [ ] No new TODO/FIXME without a linked Jira ticket
- [ ] PR description explains **what** changed and **why**
- [ ] Self-reviewed the diff — no debug code, no accidental file inclusions
