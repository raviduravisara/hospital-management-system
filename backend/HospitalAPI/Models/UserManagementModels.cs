namespace HospitalAPI.Models;

public sealed record AdminUserCreateRequest(
    string Username,
    string Email,
    string Password,
    string Role,
    bool IsActive);

public sealed record AdminUserUpdateRequest(
    string Username,
    string Email,
    string? Password,
    string Role,
    bool IsActive);

public sealed record AdminUserStatusUpdateRequest(bool IsActive);

public sealed record AdminUserResponse(
    int UserId,
    string Username,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record AdminUserOperationResult(bool Success, string Message, AdminUserResponse? User);
