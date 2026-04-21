using FluentAssertions;
using HospitalAPI.Models;

namespace HospitalAPI.Tests;

/// <summary>
/// Tests for request/response model record types used in auth flows.
/// </summary>
public sealed class AuthModelsTests
{
    [Fact]
    public void RegisterRequest_StoresAllProperties()
    {
        var req = new RegisterRequest("john_doe", "john@hospital.com", "P@ssw0rd!", "Patient");

        req.Username.Should().Be("john_doe");
        req.Email.Should().Be("john@hospital.com");
        req.Password.Should().Be("P@ssw0rd!");
        req.Role.Should().Be("Patient");
    }

    [Fact]
    public void RegisterRequest_NullRoleIsAllowed()
    {
        var req = new RegisterRequest("john_doe", "john@hospital.com", "P@ssw0rd!", null);

        req.Role.Should().BeNull();
    }

    [Fact]
    public void LoginRequest_StoresCredentials()
    {
        var req = new LoginRequest("admin@hospital.local", "Admin@123");

        req.UsernameOrEmail.Should().Be("admin@hospital.local");
        req.Password.Should().Be("Admin@123");
    }

    [Fact]
    public void RegisterResult_SuccessCase()
    {
        var result = new RegisterResult(true, "Registration successful.", 42);

        result.Success.Should().BeTrue();
        result.Message.Should().Be("Registration successful.");
        result.UserId.Should().Be(42);
    }

    [Fact]
    public void RegisterResult_FailureCase_HasNoUserId()
    {
        var result = new RegisterResult(false, "Username already exists.", null);

        result.Success.Should().BeFalse();
        result.UserId.Should().BeNull();
    }

    [Fact]
    public void AuthResult_SuccessCase_HasTokens()
    {
        var expiry = DateTime.UtcNow.AddHours(1);
        var result = new AuthResult(
            Success: true,
            Message: "Login successful.",
            AccessToken: "eyJhbGci...",
            RefreshToken: "refresh-token-value",
            AccessTokenExpiresAtUtc: expiry,
            UserId: 1,
            Username: "admin1",
            Role: "Admin");

        result.Success.Should().BeTrue();
        result.AccessToken.Should().NotBeNullOrWhiteSpace();
        result.RefreshToken.Should().NotBeNullOrWhiteSpace();
        result.Role.Should().Be("Admin");
        result.UserId.Should().Be(1);
    }

    [Fact]
    public void AuthResult_FailureCase_HasNoTokens()
    {
        var result = new AuthResult(false, "Invalid credentials.", null, null, null, null, null, null);

        result.Success.Should().BeFalse();
        result.AccessToken.Should().BeNull();
        result.RefreshToken.Should().BeNull();
    }

    [Fact]
    public void UserProfileResponse_StoresAllFields()
    {
        var profile = new UserProfileResponse(7, "drsmith", "dr.smith@hospital.com", "Doctor", true);

        profile.UserId.Should().Be(7);
        profile.Username.Should().Be("drsmith");
        profile.Email.Should().Be("dr.smith@hospital.com");
        profile.Role.Should().Be("Doctor");
        profile.IsActive.Should().BeTrue();
    }

    [Fact]
    public void JwtSettings_HasCorrectDefaults()
    {
        var settings = new JwtSettings();

        settings.Issuer.Should().Be("HospitalAPI");
        settings.Audience.Should().Be("HospitalAPI.Client");
        settings.AccessTokenMinutes.Should().Be(60);
        settings.RefreshTokenDays.Should().Be(7);
    }
}
