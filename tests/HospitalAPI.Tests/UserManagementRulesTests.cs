using HospitalAPI.Services;

namespace HospitalAPI.Tests;

public sealed class UserManagementRulesTests
{
    [Fact]
    public void ValidateCreate_ReturnsError_WhenUsernameMissing()
    {
        var message = UserManagementRules.ValidateCreate("", "admin@example.com", "secret123", "Admin");
        message.Should().Be("Username is required.");
    }

    [Fact]
    public void ValidateCreate_ReturnsError_WhenRoleInvalid()
    {
        var message = UserManagementRules.ValidateCreate("admin", "admin@example.com", "secret123", "SuperUser");
        message.Should().Be("Invalid role. Allowed roles: Admin, Doctor, Patient.");
    }

    [Fact]
    public void ValidateUpdate_AllowsEmptyPassword()
    {
        var message = UserManagementRules.ValidateUpdate("admin", "admin@example.com", null, "Admin");
        message.Should().BeNull();
    }

    [Theory]
    [InlineData("admin", "Admin")]
    [InlineData("doctor", "Doctor")]
    [InlineData("patient", "Patient")]
    public void NormalizeRole_NormalizesExpectedRole(string input, string expected)
    {
        var result = UserManagementRules.NormalizeRole(input);
        result.Should().Be(expected);
    }
}
