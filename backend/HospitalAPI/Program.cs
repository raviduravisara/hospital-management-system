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
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:5041",
                "https://localhost:7041")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddSingleton<MySqlConnectionFactory>();
builder.Services.AddSingleton<IRefreshTokenStore, InMemoryRefreshTokenStore>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

var app = builder.Build();

await EnsureFixedAdminAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

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

app.Run();

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
