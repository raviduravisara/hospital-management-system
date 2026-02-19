namespace HospitalAPI.Models;

public sealed class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string Issuer { get; init; } = "HospitalAPI";
    public string Audience { get; init; } = "HospitalAPI.Client";
    public string SecretKey { get; init; } = "super-dev-secret-key-change-this-before-production-2026";
    public int AccessTokenMinutes { get; init; } = 60;
    public int RefreshTokenDays { get; init; } = 7;
}

public sealed record RegisterRequest(string Username, string Email, string Password, string? Role);

public sealed record LoginRequest(string UsernameOrEmail, string Password);

public sealed record RefreshRequest(string RefreshToken);

public sealed record LogoutRequest(string? RefreshToken);

public sealed record RegisterResult(bool Success, string Message, int? UserId);

public sealed record AuthResult(
    bool Success,
    string Message,
    string? AccessToken,
    string? RefreshToken,
    DateTime? AccessTokenExpiresAtUtc,
    int? UserId,
    string? Username,
    string? Role);

public sealed record UserProfileResponse(int UserId, string Username, string Email, string Role, bool IsActive);

public sealed record AuthenticatedUser(int UserId, string Username, string Email, string Role, bool IsActive, string PasswordHash);
