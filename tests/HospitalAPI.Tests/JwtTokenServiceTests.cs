using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using HospitalAPI.Models;
using HospitalAPI.Security;
using Microsoft.Extensions.Options;

namespace HospitalAPI.Tests;

public sealed class JwtTokenServiceTests
{
    private static JwtTokenService CreateService(int expiryMinutes = 60)
    {
        var settings = new JwtSettings
        {
            Issuer = "HospitalAPI",
            Audience = "HospitalAPI.Client",
            SecretKey = "test-secret-key-long-enough-for-hmac-sha256-32chars",
            AccessTokenMinutes = expiryMinutes,
            RefreshTokenDays = 7
        };
        return new JwtTokenService(Options.Create(settings));
    }

    [Fact]
    public void CreateAccessToken_ReturnsNonEmptyToken()
    {
        var service = CreateService();

        var (token, _) = service.CreateAccessToken(1, "testuser", "test@hospital.com", "Doctor");

        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void CreateAccessToken_TokenIsValidJwt()
    {
        var service = CreateService();

        var (token, _) = service.CreateAccessToken(1, "testuser", "test@hospital.com", "Doctor");

        var handler = new JwtSecurityTokenHandler();
        handler.CanReadToken(token).Should().BeTrue();
    }

    [Fact]
    public void CreateAccessToken_ContainsCorrectUserId()
    {
        var service = CreateService();

        var (token, _) = service.CreateAccessToken(42, "testuser", "test@hospital.com", "Patient");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var sub = jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value;
        sub.Should().Be("42");
    }

    [Fact]
    public void CreateAccessToken_ContainsCorrectRole()
    {
        var service = CreateService();

        var (token, _) = service.CreateAccessToken(1, "drsmith", "dr.smith@hospital.com", "Doctor");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var role = jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value;
        role.Should().Be("Doctor");
    }

    [Fact]
    public void CreateAccessToken_ContainsCorrectEmail()
    {
        var service = CreateService();
        const string email = "admin@hospital.local";

        var (token, _) = service.CreateAccessToken(1, "admin1", email, "Admin");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var emailClaim = jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value;
        emailClaim.Should().Be(email);
    }

    [Fact]
    public void CreateAccessToken_ExpiresAtIsInFuture()
    {
        var service = CreateService(expiryMinutes: 60);

        var (_, expiresAt) = service.CreateAccessToken(1, "testuser", "test@hospital.com", "Patient");

        expiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public void CreateAccessToken_ExpiresAtMatchesConfiguredMinutes()
    {
        var service = CreateService(expiryMinutes: 30);

        var before = DateTime.UtcNow;
        var (_, expiresAt) = service.CreateAccessToken(1, "testuser", "test@hospital.com", "Patient");

        expiresAt.Should().BeCloseTo(before.AddMinutes(30), precision: TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void CreateAccessToken_HasCorrectIssuerAndAudience()
    {
        var service = CreateService();

        var (token, _) = service.CreateAccessToken(1, "testuser", "test@hospital.com", "Doctor");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Issuer.Should().Be("HospitalAPI");
        jwt.Audiences.Should().Contain("HospitalAPI.Client");
    }

    [Fact]
    public void CreateAccessToken_DifferentUsersProduceDifferentTokens()
    {
        var service = CreateService();

        var (token1, _) = service.CreateAccessToken(1, "user1", "user1@hospital.com", "Patient");
        var (token2, _) = service.CreateAccessToken(2, "user2", "user2@hospital.com", "Doctor");

        token1.Should().NotBe(token2);
    }
}
