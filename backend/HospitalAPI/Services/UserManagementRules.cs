namespace HospitalAPI.Services;

public static class UserManagementRules
{
    private static readonly HashSet<string> AllowedRoles =
    [
        "Admin", "Doctor", "Patient"
    ];

    public static string? ValidateCreate(string username, string email, string password, string role)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return "Username is required.";
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return "Email is required.";
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            return "Password is required.";
        }

        if (password.Trim().Length < 6)
        {
            return "Password must be at least 6 characters.";
        }

        var normalizedRole = NormalizeRole(role);
        if (normalizedRole is null)
        {
            return "Invalid role. Allowed roles: Admin, Doctor, Patient.";
        }

        return null;
    }

    public static string? ValidateUpdate(string username, string email, string? password, string role)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return "Username is required.";
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return "Email is required.";
        }

        if (!string.IsNullOrWhiteSpace(password) && password.Trim().Length < 6)
        {
            return "Password must be at least 6 characters when provided.";
        }

        var normalizedRole = NormalizeRole(role);
        if (normalizedRole is null)
        {
            return "Invalid role. Allowed roles: Admin, Doctor, Patient.";
        }

        return null;
    }

    public static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        var normalized = role.Trim();
        if (!AllowedRoles.Contains(normalized))
        {
            normalized = char.ToUpperInvariant(normalized[0]) + normalized[1..].ToLowerInvariant();
        }

        return AllowedRoles.Contains(normalized) ? normalized : null;
    }
}
