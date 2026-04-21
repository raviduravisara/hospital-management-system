using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;

namespace HospitalAPI.Services;

public sealed class UserManagementService(MySqlConnectionFactory connectionFactory) : IUserManagementService
{
    public async Task<AdminUserOperationResult> CreateAsync(AdminUserCreateRequest request, CancellationToken cancellationToken)
    {
        var validationError = UserManagementRules.ValidateCreate(request.Username, request.Email, request.Password, request.Role);
        if (validationError is not null)
        {
            return new AdminUserOperationResult(false, validationError, null);
        }

        var role = UserManagementRules.NormalizeRole(request.Role)!;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var duplicateCheck = connection.CreateCommand())
        {
            duplicateCheck.CommandText = """
                SELECT user_id
                FROM Users
                WHERE username = @username OR email = @email
                LIMIT 1;
                """;
            duplicateCheck.Parameters.AddWithValue("@username", request.Username.Trim());
            duplicateCheck.Parameters.AddWithValue("@email", request.Email.Trim());
            var duplicate = await duplicateCheck.ExecuteScalarAsync(cancellationToken);
            if (duplicate is not null)
            {
                return new AdminUserOperationResult(false, "Username or email already exists.", null);
            }
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password.Trim());

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Users (username, email, password_hash, role, is_active)
            VALUES (@username, @email, @passwordHash, @role, @isActive);
            SELECT LAST_INSERT_ID();
            """;
        insertCommand.Parameters.AddWithValue("@username", request.Username.Trim());
        insertCommand.Parameters.AddWithValue("@email", request.Email.Trim());
        insertCommand.Parameters.AddWithValue("@passwordHash", passwordHash);
        insertCommand.Parameters.AddWithValue("@role", role);
        insertCommand.Parameters.AddWithValue("@isActive", request.IsActive);

        var createdIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var createdId = Convert.ToInt32(createdIdObj);
        var user = await GetByIdAsync(createdId, cancellationToken);

        return new AdminUserOperationResult(true, "User created successfully.", user);
    }

    public async Task<IReadOnlyList<AdminUserResponse>> GetAllAsync(string? role, bool? isActive, string? search, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var normalizedRole = UserManagementRules.NormalizeRole(role);
        var hasSearch = !string.IsNullOrWhiteSpace(search);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT user_id, username, email, role, is_active, created_at, updated_at
            FROM Users
            WHERE (@role IS NULL OR role = @role)
              AND (@isActive IS NULL OR is_active = @isActive)
              AND (@search IS NULL OR username LIKE @searchLike OR email LIKE @searchLike)
            ORDER BY user_id DESC;
            """;

        command.Parameters.AddWithValue("@role", normalizedRole);
        command.Parameters.AddWithValue("@isActive", isActive);
        command.Parameters.AddWithValue("@search", hasSearch ? search!.Trim() : null);
        command.Parameters.AddWithValue("@searchLike", hasSearch ? $"%{search!.Trim()}%" : null);

        var users = new List<AdminUserResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            users.Add(MapUser(reader));
        }

        return users;
    }

    public async Task<AdminUserResponse?> GetByIdAsync(int userId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT user_id, username, email, role, is_active, created_at, updated_at
            FROM Users
            WHERE user_id = @userId;
            """;
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapUser(reader);
    }

    public async Task<AdminUserOperationResult> UpdateAsync(int userId, AdminUserUpdateRequest request, CancellationToken cancellationToken)
    {
        var validationError = UserManagementRules.ValidateUpdate(request.Username, request.Email, request.Password, request.Role);
        if (validationError is not null)
        {
            return new AdminUserOperationResult(false, validationError, null);
        }

        var role = UserManagementRules.NormalizeRole(request.Role)!;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var duplicateCheck = connection.CreateCommand())
        {
            duplicateCheck.CommandText = """
                SELECT user_id
                FROM Users
                WHERE (username = @username OR email = @email)
                  AND user_id <> @userId
                LIMIT 1;
                """;
            duplicateCheck.Parameters.AddWithValue("@username", request.Username.Trim());
            duplicateCheck.Parameters.AddWithValue("@email", request.Email.Trim());
            duplicateCheck.Parameters.AddWithValue("@userId", userId);
            var duplicate = await duplicateCheck.ExecuteScalarAsync(cancellationToken);
            if (duplicate is not null)
            {
                return new AdminUserOperationResult(false, "Username or email already exists.", null);
            }
        }

        var updatePassword = !string.IsNullOrWhiteSpace(request.Password);

        await using var updateCommand = connection.CreateCommand();
        updateCommand.CommandText = updatePassword
            ? """
                UPDATE Users
                SET username = @username,
                    email = @email,
                    password_hash = @passwordHash,
                    role = @role,
                    is_active = @isActive
                WHERE user_id = @userId;
                """
            : """
                UPDATE Users
                SET username = @username,
                    email = @email,
                    role = @role,
                    is_active = @isActive
                WHERE user_id = @userId;
                """;

        updateCommand.Parameters.AddWithValue("@userId", userId);
        updateCommand.Parameters.AddWithValue("@username", request.Username.Trim());
        updateCommand.Parameters.AddWithValue("@email", request.Email.Trim());
        updateCommand.Parameters.AddWithValue("@role", role);
        updateCommand.Parameters.AddWithValue("@isActive", request.IsActive);

        if (updatePassword)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password!.Trim());
            updateCommand.Parameters.AddWithValue("@passwordHash", passwordHash);
        }

        var affected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new AdminUserOperationResult(false, "User not found.", null);
        }

        var user = await GetByIdAsync(userId, cancellationToken);
        return new AdminUserOperationResult(true, "User updated successfully.", user);
    }

    public async Task<AdminUserOperationResult> UpdateStatusAsync(int userId, bool isActive, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Users
            SET is_active = @isActive
            WHERE user_id = @userId;
            """;
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@isActive", isActive);

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new AdminUserOperationResult(false, "User not found.", null);
        }

        var user = await GetByIdAsync(userId, cancellationToken);
        return new AdminUserOperationResult(true, "User status updated successfully.", user);
    }

    public async Task<bool> DeleteAsync(int userId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        // Prevent orphaned profile data
        await using (var checkCmd = connection.CreateCommand())
        {
            checkCmd.CommandText = """
                SELECT 
                  (SELECT COUNT(*) FROM Patients WHERE user_id = @userId) +
                  (SELECT COUNT(*) FROM Doctors WHERE user_id = @userId) AS total_links;
            """;
            checkCmd.Parameters.AddWithValue("@userId", userId);
            var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync(cancellationToken));
            if (count > 0)
            {
                throw new InvalidOperationException("Cannot delete User. This user account is currently linked to an active Patient or Doctor profile.");
            }
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Users WHERE user_id = @userId;";
        command.Parameters.AddWithValue("@userId", userId);

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0;
    }

    private static AdminUserResponse MapUser(DbDataReader reader)
    {
        return new AdminUserResponse(
            UserId: reader.GetInt32(reader.GetOrdinal("user_id")),
            Username: reader.GetString(reader.GetOrdinal("username")),
            Email: reader.GetString(reader.GetOrdinal("email")),
            Role: reader.GetString(reader.GetOrdinal("role")),
            IsActive: reader.GetBoolean(reader.GetOrdinal("is_active")),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }
}
