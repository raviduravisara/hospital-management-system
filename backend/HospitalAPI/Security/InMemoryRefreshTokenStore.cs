using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace HospitalAPI.Security;

public sealed class InMemoryRefreshTokenStore : IRefreshTokenStore
{
    private readonly ConcurrentDictionary<string, RefreshTokenEntry> _tokens = new();

    public string Issue(int userId, string username, string role, DateTime expiresAtUtc)
    {
        var token = GenerateToken();
        _tokens[token] = new RefreshTokenEntry(userId, username, role, expiresAtUtc, false);
        return token;
    }

    public bool TryValidate(string refreshToken, out int userId)
    {
        userId = 0;
        if (!_tokens.TryGetValue(refreshToken, out var entry))
        {
            return false;
        }

        if (entry.Revoked || entry.ExpiresAtUtc <= DateTime.UtcNow)
        {
            _tokens.TryRemove(refreshToken, out _);
            return false;
        }

        userId = entry.UserId;
        return true;
    }

    public bool Revoke(string refreshToken)
    {
        if (!_tokens.TryGetValue(refreshToken, out var entry))
        {
            return false;
        }

        _tokens[refreshToken] = entry with { Revoked = true };
        return true;
    }

    public void RevokeAllForUser(int userId)
    {
        foreach (var (token, entry) in _tokens)
        {
            if (entry.UserId == userId)
            {
                _tokens[token] = entry with { Revoked = true };
            }
        }
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(48);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private sealed record RefreshTokenEntry(
        int UserId,
        string Username,
        string Role,
        DateTime ExpiresAtUtc,
        bool Revoked);
}
