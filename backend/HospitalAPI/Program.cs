using System.Security.Claims;
using System.Text;
using HospitalAPI.Data;
using HospitalAPI.Models;
using HospitalAPI.Security;
using HospitalAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console();
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Hospital API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token as: Bearer {your token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<AdminAccountSettings>(builder.Configuration.GetSection(AdminAccountSettings.SectionName));

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();
var secretKey = jwtSettings.SecretKey;
if (string.IsNullOrWhiteSpace(secretKey) || secretKey.Length < 32)
{
    secretKey = "super-dev-secret-key-change-this-before-production-2026";
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        var configuredOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();

        var allowedOrigins = configuredOrigins.Length > 0
            ? configuredOrigins
            : new[]
            {
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:5041",
                "https://localhost:7041"
            };

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddSingleton<MySqlConnectionFactory>();
builder.Services.AddSingleton<IRefreshTokenStore, InMemoryRefreshTokenStore>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IDoctorService, DoctorService>();
builder.Services.AddScoped<IDoctorScheduleService, DoctorScheduleService>();
builder.Services.AddScoped<IMedicineService, MedicineService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();

var app = builder.Build();

await EnsureFixedAdminAsync(app.Services);

// Swagger enabled in all environments for demo/evaluation access
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Hospital API v1");
    options.RoutePrefix = "swagger";
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/api/auth/register", async (RegisterRequest request, IAuthService authService, CancellationToken cancellationToken) =>
{
    var result = await authService.RegisterAsync(request, cancellationToken);
    return result.Success
        ? Results.Created($"/api/auth/profile/{result.UserId}", result)
        : Results.BadRequest(result);
});

app.MapPost("/api/auth/login", async (LoginRequest request, IAuthService authService, CancellationToken cancellationToken) =>
{
    var result = await authService.LoginAsync(request, cancellationToken);
    return result.Success ? Results.Ok(result) : Results.Unauthorized();
});

app.MapPost("/api/auth/refresh", async (RefreshRequest request, IAuthService authService, CancellationToken cancellationToken) =>
{
    var result = await authService.RefreshAsync(request, cancellationToken);
    return result.Success ? Results.Ok(result) : Results.Unauthorized();
});

app.MapPost("/api/auth/logout", async (LogoutRequest request, ClaimsPrincipal user, IAuthService authService, CancellationToken cancellationToken) =>
{
    var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
    if (!int.TryParse(userIdClaim, out var userId))
    {
        return Results.Unauthorized();
    }

    await authService.LogoutAsync(userId, request, cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/auth/profile", async (ClaimsPrincipal user, IAuthService authService, CancellationToken cancellationToken) =>
{
    var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
    if (!int.TryParse(userIdClaim, out var userId))
    {
        return Results.Unauthorized();
    }

    var profile = await authService.GetProfileAsync(userId, cancellationToken);
    return profile is null ? Results.NotFound() : Results.Ok(profile);
}).RequireAuthorization();

app.MapGet("/api/admin/ping", () => Results.Ok(new { message = "Admin access granted." }))
    .RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/doctor/ping", () => Results.Ok(new { message = "Doctor access granted." }))
    .RequireAuthorization(policy => policy.RequireRole("Doctor"));

app.MapGet("/api/patient/ping", () => Results.Ok(new { message = "Patient access granted." }))
    .RequireAuthorization(policy => policy.RequireRole("Patient"));

app.MapPost("/api/patients", async (
    PatientUpsertRequest request,
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);

    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var targetUserId = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
        ? request.UserId ?? currentUserId.Value
        : currentUserId.Value;

    var result = await patientService.CreateAsync(request, targetUserId, cancellationToken);
    return result.Success
        ? Results.Created($"/api/patients/{result.Patient!.PatientId}", result.Patient)
        : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Patient", "Admin"));

app.MapGet("/api/patients/{patientId:int}", async (
    int patientId,
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var profile = await patientService.GetByIdAsync(patientId, cancellationToken);
    if (profile is null)
    {
        return Results.NotFound();
    }

    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);

    var isAllowed = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(role, "Doctor", StringComparison.OrdinalIgnoreCase)
                    || (string.Equals(role, "Patient", StringComparison.OrdinalIgnoreCase)
                        && currentUserId == profile.UserId);

    return isAllowed ? Results.Ok(profile) : Results.Forbid();
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor", "Patient"));

app.MapGet("/api/patients/me", async (
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var profile = await patientService.GetByUserIdAsync(currentUserId.Value, cancellationToken);
    return profile is null ? Results.NotFound() : Results.Ok(profile);
}).RequireAuthorization(policy => policy.RequireRole("Patient"));

app.MapPut("/api/patients/{patientId:int}", async (
    int patientId,
    PatientUpsertRequest request,
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var profile = await patientService.GetByIdAsync(patientId, cancellationToken);
    if (profile is null)
    {
        return Results.NotFound();
    }

    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);
    var isAllowed = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(role, "Doctor", StringComparison.OrdinalIgnoreCase)
                    || (string.Equals(role, "Patient", StringComparison.OrdinalIgnoreCase)
                        && currentUserId == profile.UserId);

    if (!isAllowed)
    {
        return Results.Forbid();
    }

    var result = await patientService.UpdateByIdAsync(patientId, request, cancellationToken);
    return result.Success ? Results.Ok(result.Patient) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor", "Patient"));

app.MapPut("/api/patients/me", async (
    PatientUpsertRequest request,
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var result = await patientService.UpdateByUserIdAsync(currentUserId.Value, request, cancellationToken);
    return result.Success ? Results.Ok(result.Patient) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Patient"));

app.MapDelete("/api/patients/{patientId:int}", async (
    int patientId,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var deleted = await patientService.DeleteAsync(patientId, cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/patients/me/summary", async (
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var summary = await patientService.GetDashboardSummaryByUserIdAsync(currentUserId.Value, cancellationToken);
    return summary is null ? Results.NotFound() : Results.Ok(summary);
}).RequireAuthorization(policy => policy.RequireRole("Patient"));

app.MapGet("/api/patients/me/details", async (
    ClaimsPrincipal user,
    IPatientService patientService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var details = await patientService.GetDashboardDetailsByUserIdAsync(currentUserId.Value, cancellationToken);
    return details is null ? Results.NotFound() : Results.Ok(details);
}).RequireAuthorization(policy => policy.RequireRole("Patient"));

app.MapPost("/api/doctors", async (
    DoctorUpsertRequest request,
    ClaimsPrincipal user,
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);

    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var targetUserId = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
        ? request.UserId ?? currentUserId.Value
        : currentUserId.Value;

    var result = await doctorService.CreateAsync(request, targetUserId, cancellationToken);
    return result.Success
        ? Results.Created($"/api/doctors/{result.Doctor!.DoctorId}", result.Doctor)
        : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Doctor", "Admin"));

app.MapGet("/api/doctors", async (
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var doctors = await doctorService.GetAllAsync(cancellationToken);
    return Results.Ok(doctors);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/doctors/{doctorId:int}", async (
    int doctorId,
    ClaimsPrincipal user,
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var profile = await doctorService.GetByIdAsync(doctorId, cancellationToken);
    if (profile is null)
    {
        return Results.NotFound();
    }

    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);
    var isAllowed = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                    || (string.Equals(role, "Doctor", StringComparison.OrdinalIgnoreCase)
                        && currentUserId == profile.UserId);

    return isAllowed ? Results.Ok(profile) : Results.Forbid();
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor"));

app.MapGet("/api/doctors/me", async (
    ClaimsPrincipal user,
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var profile = await doctorService.GetByUserIdAsync(currentUserId.Value, cancellationToken);
    return profile is null ? Results.NotFound() : Results.Ok(profile);
}).RequireAuthorization(policy => policy.RequireRole("Doctor"));

app.MapPut("/api/doctors/{doctorId:int}", async (
    int doctorId,
    DoctorUpsertRequest request,
    ClaimsPrincipal user,
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var profile = await doctorService.GetByIdAsync(doctorId, cancellationToken);
    if (profile is null)
    {
        return Results.NotFound();
    }

    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);
    var isAllowed = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                    || (string.Equals(role, "Doctor", StringComparison.OrdinalIgnoreCase)
                        && currentUserId == profile.UserId);

    if (!isAllowed)
    {
        return Results.Forbid();
    }

    var result = await doctorService.UpdateByIdAsync(doctorId, request, cancellationToken);
    return result.Success ? Results.Ok(result.Doctor) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor"));

app.MapPut("/api/doctors/me", async (
    DoctorUpsertRequest request,
    ClaimsPrincipal user,
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var result = await doctorService.UpdateByUserIdAsync(currentUserId.Value, request, cancellationToken);
    return result.Success ? Results.Ok(result.Doctor) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Doctor"));

app.MapDelete("/api/doctors/{doctorId:int}", async (
    int doctorId,
    IDoctorService doctorService,
    CancellationToken cancellationToken) =>
{
    var deleted = await doctorService.DeleteAsync(doctorId, cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/doctors/me/schedules", async (
    ClaimsPrincipal user,
    IDoctorScheduleService scheduleService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var schedules = await scheduleService.GetByUserIdAsync(currentUserId.Value, cancellationToken);
    return Results.Ok(schedules);
}).RequireAuthorization(policy => policy.RequireRole("Doctor"));

app.MapPut("/api/doctors/me/schedules", async (
    DoctorScheduleBulkUpsertRequest request,
    ClaimsPrincipal user,
    IDoctorScheduleService scheduleService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var schedules = request.Schedules ?? [];
    var result = await scheduleService.ReplaceByUserIdAsync(currentUserId.Value, schedules, cancellationToken);
    return result.Success ? Results.Ok(result.Schedules) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Doctor"));

app.MapGet("/api/doctors/{doctorId:int}/schedules", async (
    int doctorId,
    ClaimsPrincipal user,
    IDoctorService doctorService,
    IDoctorScheduleService scheduleService,
    CancellationToken cancellationToken) =>
{
    var role = GetCurrentRole(user);
    var currentUserId = GetCurrentUserId(user);

    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    if (string.Equals(role, "Doctor", StringComparison.OrdinalIgnoreCase))
    {
        var profile = await doctorService.GetByIdAsync(doctorId, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        if (profile.UserId != currentUserId)
        {
            return Results.Forbid();
        }
    }

    var schedules = await scheduleService.GetByDoctorIdAsync(doctorId, cancellationToken);
    return Results.Ok(schedules);
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor"));

app.MapPost("/api/medicines", async (
    MedicineUpsertRequest request,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var result = await medicineService.CreateAsync(request, cancellationToken);
    return result.Success
        ? Results.Created($"/api/medicines/{result.Medicine!.MedicineId}", result.Medicine)
        : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/medicines", async (
    string? search,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var medicines = await medicineService.GetAllAsync(search, cancellationToken);
    return Results.Ok(medicines);
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor"));

app.MapGet("/api/medicines/{medicineId:int}", async (
    int medicineId,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var medicine = await medicineService.GetByIdAsync(medicineId, cancellationToken);
    return medicine is null ? Results.NotFound() : Results.Ok(medicine);
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor"));

app.MapGet("/api/medicines/inventory/report", async (
    int? threshold,
    string? status,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var report = await medicineService.GetInventoryReportAsync(threshold, status, cancellationToken);
    return Results.Ok(report);
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Doctor"));

app.MapPut("/api/medicines/{medicineId:int}", async (
    int medicineId,
    MedicineUpsertRequest request,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var result = await medicineService.UpdateAsync(medicineId, request, cancellationToken);
    return result.Success ? Results.Ok(result.Medicine) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapPut("/api/medicines/{medicineId:int}/stock", async (
    int medicineId,
    MedicineStockUpdateRequest request,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var result = await medicineService.UpdateStockAsync(medicineId, request.StockQuantity, cancellationToken);
    return result.Success ? Results.Ok(result.Medicine) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapDelete("/api/medicines/{medicineId:int}", async (
    int medicineId,
    IMedicineService medicineService,
    CancellationToken cancellationToken) =>
{
    var deleted = await medicineService.DeleteAsync(medicineId, cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapPost("/api/invoices", async (
    InvoiceUpsertRequest request,
    ClaimsPrincipal user,
    IInvoiceService invoiceService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var result = await invoiceService.CreateAsync(request, currentUserId.Value, cancellationToken);
    return result.Success
        ? Results.Created($"/api/invoices/{result.Invoice!.InvoiceId}", result.Invoice)
        : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/invoices", async (
    string? status,
    IInvoiceService invoiceService,
    CancellationToken cancellationToken) =>
{
    var invoices = await invoiceService.GetAllAsync(status, cancellationToken);
    return Results.Ok(invoices);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapGet("/api/invoices/{invoiceId:int}", async (
    int invoiceId,
    IInvoiceService invoiceService,
    CancellationToken cancellationToken) =>
{
    var invoice = await invoiceService.GetByIdAsync(invoiceId, cancellationToken);
    return invoice is null ? Results.NotFound() : Results.Ok(invoice);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapPut("/api/invoices/{invoiceId:int}", async (
    int invoiceId,
    InvoiceUpsertRequest request,
    ClaimsPrincipal user,
    IInvoiceService invoiceService,
    CancellationToken cancellationToken) =>
{
    var currentUserId = GetCurrentUserId(user);
    if (currentUserId is null)
    {
        return Results.Unauthorized();
    }

    var result = await invoiceService.UpdateAsync(invoiceId, request, currentUserId.Value, cancellationToken);
    return result.Success ? Results.Ok(result.Invoice) : Results.BadRequest(result);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.MapDelete("/api/invoices/{invoiceId:int}", async (
    int invoiceId,
    IInvoiceService invoiceService,
    CancellationToken cancellationToken) =>
{
    var deleted = await invoiceService.DeleteAsync(invoiceId, cancellationToken);
    return deleted ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.Run();

static int? GetCurrentUserId(ClaimsPrincipal user)
{
    var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
    return int.TryParse(userIdClaim, out var userId) ? userId : null;
}

static string? GetCurrentRole(ClaimsPrincipal user)
{
    return user.FindFirstValue(ClaimTypes.Role)
           ?? user.FindFirstValue("role")
           ?? user.Claims.FirstOrDefault(c => c.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase))?.Value;
}

static async Task EnsureFixedAdminAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var adminSettings = scope.ServiceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<AdminAccountSettings>>()
        .Value;

    if (!adminSettings.Enabled ||
        string.IsNullOrWhiteSpace(adminSettings.Username) ||
        string.IsNullOrWhiteSpace(adminSettings.Email) ||
        string.IsNullOrWhiteSpace(adminSettings.Password))
    {
        return;
    }

    var connectionFactory = scope.ServiceProvider.GetRequiredService<MySqlConnectionFactory>();
    await using var connection = connectionFactory.CreateConnection();
    await connection.OpenAsync();

    var fixedUsername = adminSettings.Username.Trim();
    var fixedEmail = adminSettings.Email.Trim();
    int? usernameUserId = null;
    int? emailUserId = null;

    await using (var check = connection.CreateCommand())
    {
        check.CommandText = """
            SELECT user_id, username, email
            FROM Users
            WHERE username = @username OR email = @email
            """;
        check.Parameters.AddWithValue("@username", fixedUsername);
        check.Parameters.AddWithValue("@email", fixedEmail);

        await using var reader = await check.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var userId = reader.GetInt32(reader.GetOrdinal("user_id"));
            var username = reader.GetString(reader.GetOrdinal("username"));
            var email = reader.GetString(reader.GetOrdinal("email"));

            if (string.Equals(username, fixedUsername, StringComparison.OrdinalIgnoreCase))
            {
                usernameUserId = userId;
            }

            if (string.Equals(email, fixedEmail, StringComparison.OrdinalIgnoreCase))
            {
                emailUserId = userId;
            }
        }
    }

    var passwordHash = BCrypt.Net.BCrypt.HashPassword(adminSettings.Password);

    if (usernameUserId is null && emailUserId is null)
    {
        await using var insert = connection.CreateCommand();
        insert.CommandText = """
            INSERT INTO Users (username, email, password_hash, role, is_active)
            VALUES (@username, @email, @passwordHash, 'Admin', 1);
            """;
        insert.Parameters.AddWithValue("@username", fixedUsername);
        insert.Parameters.AddWithValue("@email", fixedEmail);
        insert.Parameters.AddWithValue("@passwordHash", passwordHash);
        await insert.ExecuteNonQueryAsync();
        return;
    }

    var targetUserId = usernameUserId ?? emailUserId!.Value;
    var duplicateUserId = (usernameUserId.HasValue && emailUserId.HasValue && usernameUserId.Value != emailUserId.Value)
        ? emailUserId
        : null;

    await using var transaction = await connection.BeginTransactionAsync();

    if (duplicateUserId.HasValue)
    {
        await using var deactivateDuplicate = connection.CreateCommand();
        deactivateDuplicate.Transaction = (MySql.Data.MySqlClient.MySqlTransaction)transaction;
        deactivateDuplicate.CommandText = """
            UPDATE Users
            SET username = CONCAT('archived_admin_', user_id),
                email = CONCAT('archived_admin_', user_id, '@local.invalid'),
                is_active = 0
            WHERE user_id = @duplicateUserId;
            """;
        deactivateDuplicate.Parameters.AddWithValue("@duplicateUserId", duplicateUserId.Value);
        await deactivateDuplicate.ExecuteNonQueryAsync();
    }

    await using (var update = connection.CreateCommand())
    {
        update.Transaction = (MySql.Data.MySqlClient.MySqlTransaction)transaction;
        update.CommandText = """
            UPDATE Users
            SET username = @username,
                email = @email,
                password_hash = @passwordHash,
                role = 'Admin',
                is_active = 1
            WHERE user_id = @userId;
            """;
        update.Parameters.AddWithValue("@username", fixedUsername);
        update.Parameters.AddWithValue("@email", fixedEmail);
        update.Parameters.AddWithValue("@passwordHash", passwordHash);
        update.Parameters.AddWithValue("@userId", targetUserId);
        await update.ExecuteNonQueryAsync();
    }

    await transaction.CommitAsync();
}
