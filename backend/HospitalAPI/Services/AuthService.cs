using HospitalAPI.Data;
using HospitalAPI.Models;
using HospitalAPI.Security;
using Microsoft.Extensions.Options;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class AuthService(
    MySqlConnectionFactory connectionFactory,
    JwtTokenService jwtTokenService,
    IRefreshTokenStore refreshTokenStore,
    IOptions<JwtSettings> jwtOptions) : IAuthService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public async Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return new RegisterResult(false, "Username, email and password are required.", null);
        }

        var role = NormalizeRole(request.Role);
        if (role is null)
        {
            return new RegisterResult(false, "Invalid role. Allowed roles: Patient, Doctor, Admin.", null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var checkCommand = connection.CreateCommand())
        {
            checkCommand.CommandText = """
                SELECT COUNT(*) 
                FROM Users 
                WHERE username = @username OR email = @email;
                """;
            checkCommand.Parameters.AddWithValue("@username", request.Username.Trim());
            checkCommand.Parameters.AddWithValue("@email", request.Email.Trim());

            var exists = Convert.ToInt32(await checkCommand.ExecuteScalarAsync(cancellationToken));
            if (exists > 0)
            {
                return new RegisterResult(false, "A user with the same username or email already exists.", null);
            }
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password.Trim());

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Users (username, email, password_hash, role, is_active)
            VALUES (@username, @email, @passwordHash, @role, 1);
            SELECT LAST_INSERT_ID();
            """;
        insertCommand.Parameters.AddWithValue("@username", request.Username.Trim());
        insertCommand.Parameters.AddWithValue("@email", request.Email.Trim());
        insertCommand.Parameters.AddWithValue("@passwordHash", passwordHash);
        insertCommand.Parameters.AddWithValue("@role", role);

        var userIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var userId = Convert.ToInt32(userIdObj);
        return new RegisterResult(true, "Registration successful.", userId);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail) || string.IsNullOrWhiteSpace(request.Password))
        {
            return InvalidCredentials();
        }

        var user = await FindUserByUsernameOrEmailAsync(request.UsernameOrEmail.Trim(), cancellationToken);
        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return InvalidCredentials();
        }

        var (accessToken, expiresAtUtc) = jwtTokenService.CreateAccessToken(
            user.UserId, user.Username, user.Email, user.Role);
        var refreshToken = refreshTokenStore.Issue(
            user.UserId,
            user.Username,
            user.Role,
            DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenDays));

        return new AuthResult(
            true,
            "Login successful.",
            accessToken,
            refreshToken,
            expiresAtUtc,
            user.UserId,
            user.Username,
            user.Role);
    }

    public async Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return new AuthResult(false, "Refresh token is required.", null, null, null, null, null, null);
        }

        if (!refreshTokenStore.TryValidate(request.RefreshToken, out var userId))
        {
            return new AuthResult(false, "Invalid or expired refresh token.", null, null, null, null, null, null);
        }

        var profile = await GetProfileAsync(userId, cancellationToken);
        if (profile is null || !profile.IsActive)
        {
            return new AuthResult(false, "User is not active.", null, null, null, null, null, null);
        }

        refreshTokenStore.Revoke(request.RefreshToken);
        var newRefreshToken = refreshTokenStore.Issue(
            userId,
            profile.Username,
            profile.Role,
            DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenDays));

        var (newAccessToken, expiresAtUtc) = jwtTokenService.CreateAccessToken(
            userId,
            profile.Username,
            profile.Email,
            profile.Role);

        return new AuthResult(
            true,
            "Token refreshed.",
            newAccessToken,
            newRefreshToken,
            expiresAtUtc,
            profile.UserId,
            profile.Username,
            profile.Role);
    }

    public Task LogoutAsync(int userId, LogoutRequest request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            refreshTokenStore.Revoke(request.RefreshToken);
        }
        else
        {
            refreshTokenStore.RevokeAllForUser(userId);
        }

        return Task.CompletedTask;
    }

    public async Task<UserProfileResponse?> GetProfileAsync(int userId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT user_id, username, email, role, is_active
            FROM Users
            WHERE user_id = @userId;
            """;
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var userIdOrdinal = reader.GetOrdinal("user_id");
        var usernameOrdinal = reader.GetOrdinal("username");
        var emailOrdinal = reader.GetOrdinal("email");
        var roleOrdinal = reader.GetOrdinal("role");
        var isActiveOrdinal = reader.GetOrdinal("is_active");

        return new UserProfileResponse(
            reader.GetInt32(userIdOrdinal),
            reader.GetString(usernameOrdinal),
            reader.GetString(emailOrdinal),
            reader.GetString(roleOrdinal),
            reader.GetBoolean(isActiveOrdinal));
    }

    private async Task<AuthenticatedUser?> FindUserByUsernameOrEmailAsync(string usernameOrEmail, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT user_id, username, email, password_hash, role, is_active
            FROM Users
            WHERE username = @usernameOrEmail OR email = @usernameOrEmail
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@usernameOrEmail", usernameOrEmail);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var userIdOrdinal = reader.GetOrdinal("user_id");
        var usernameOrdinal = reader.GetOrdinal("username");
        var emailOrdinal = reader.GetOrdinal("email");
        var roleOrdinal = reader.GetOrdinal("role");
        var isActiveOrdinal = reader.GetOrdinal("is_active");
        var passwordHashOrdinal = reader.GetOrdinal("password_hash");

        return new AuthenticatedUser(
            reader.GetInt32(userIdOrdinal),
            reader.GetString(usernameOrdinal),
            reader.GetString(emailOrdinal),
            reader.GetString(roleOrdinal),
            reader.GetBoolean(isActiveOrdinal),
            reader.GetString(passwordHashOrdinal));
    }

    private static AuthResult InvalidCredentials()
    {
        return new AuthResult(false, "Invalid username/email or password.", null, null, null, null, null, null);
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return "Patient";
        }

        return role.Trim().ToLowerInvariant() switch
        {
            "admin" => "Admin",
            "doctor" => "Doctor",
            "patient" => "Patient",
            _ => null
        };
    }
}
