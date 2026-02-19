using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HospitalAPI.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HospitalAPI.Security;

public sealed class JwtTokenService(IOptions<JwtSettings> jwtOptions)
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public (string Token, DateTime ExpiresAtUtc) CreateAccessToken(int userId, string username, string email, string role)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenMinutes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }
}
