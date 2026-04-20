using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;
using System.Data.Common;

namespace HospitalAPI.Services;

public sealed class DoctorService(MySqlConnectionFactory connectionFactory) : IDoctorService
{
    public async Task<DoctorOperationResult> CreateAsync(DoctorUpsertRequest request, int userId, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new DoctorOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var userProfileCheck = connection.CreateCommand())
        {
            userProfileCheck.CommandText = "SELECT doctor_id FROM Doctors WHERE user_id = @userId LIMIT 1;";
            userProfileCheck.Parameters.AddWithValue("@userId", userId);
            var existingProfile = await userProfileCheck.ExecuteScalarAsync(cancellationToken);
            if (existingProfile is not null)
            {
                return new DoctorOperationResult(false, "Doctor profile already exists for this user.", null);
            }
        }

        await using (var licenseCheck = connection.CreateCommand())
        {
            licenseCheck.CommandText = "SELECT doctor_id FROM Doctors WHERE license_number = @licenseNumber LIMIT 1;";
            licenseCheck.Parameters.AddWithValue("@licenseNumber", request.LicenseNumber.Trim());
            var existingLicense = await licenseCheck.ExecuteScalarAsync(cancellationToken);
            if (existingLicense is not null)
            {
                return new DoctorOperationResult(false, "License number is already in use.", null);
            }
        }

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Doctors (
                user_id,
                first_name,
                last_name,
                specialization,
                license_number,
                phone,
                consultation_fee)
            VALUES (
                @userId,
                @firstName,
                @lastName,
                @specialization,
                @licenseNumber,
                @phone,
                @consultationFee);
            SELECT LAST_INSERT_ID();
            """;
        insertCommand.Parameters.AddWithValue("@userId", userId);
        insertCommand.Parameters.AddWithValue("@firstName", request.FirstName.Trim());
        insertCommand.Parameters.AddWithValue("@lastName", request.LastName.Trim());
        insertCommand.Parameters.AddWithValue("@specialization", NormalizeNullable(request.Specialization));
        insertCommand.Parameters.AddWithValue("@licenseNumber", request.LicenseNumber.Trim());
        insertCommand.Parameters.AddWithValue("@phone", NormalizeNullable(request.Phone));
        insertCommand.Parameters.AddWithValue("@consultationFee", request.ConsultationFee);

        var createdIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var createdId = Convert.ToInt32(createdIdObj);
        var doctor = await GetByIdAsync(createdId, cancellationToken);

        return new DoctorOperationResult(true, "Doctor profile created successfully.", doctor);
    }

    public async Task<DoctorProfileResponse?> GetByIdAsync(int doctorId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                doctor_id,
                user_id,
                first_name,
                last_name,
                specialization,
                license_number,
                phone,
                consultation_fee,
                created_at,
                updated_at
            FROM Doctors
            WHERE doctor_id = @doctorId;
            """;
        command.Parameters.AddWithValue("@doctorId", doctorId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapDoctor(reader);
    }

    public async Task<DoctorProfileResponse?> GetByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                doctor_id,
                user_id,
                first_name,
                last_name,
                specialization,
                license_number,
                phone,
                consultation_fee,
                created_at,
                updated_at
            FROM Doctors
            WHERE user_id = @userId;
            """;
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapDoctor(reader);
    }

    public async Task<IReadOnlyList<DoctorProfileResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                d.doctor_id,
                d.user_id,
                d.first_name,
                d.last_name,
                d.specialization,
                d.license_number,
                d.phone,
                d.consultation_fee,
                d.created_at,
                d.updated_at
            FROM Doctors d
            INNER JOIN Users u ON d.user_id = u.user_id
            WHERE u.is_active = 1
            ORDER BY d.doctor_id DESC;
            """;

        var doctors = new List<DoctorProfileResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            doctors.Add(MapDoctor(reader));
        }

        return doctors;
    }

    public async Task<DoctorOperationResult> UpdateByIdAsync(int doctorId, DoctorUpsertRequest request, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new DoctorOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var licenseCheck = connection.CreateCommand())
        {
            licenseCheck.CommandText = """
                SELECT doctor_id
                FROM Doctors
                WHERE license_number = @licenseNumber
                  AND doctor_id <> @doctorId
                LIMIT 1;
                """;
            licenseCheck.Parameters.AddWithValue("@licenseNumber", request.LicenseNumber.Trim());
            licenseCheck.Parameters.AddWithValue("@doctorId", doctorId);
            var existingLicense = await licenseCheck.ExecuteScalarAsync(cancellationToken);
            if (existingLicense is not null)
            {
                return new DoctorOperationResult(false, "License number is already in use.", null);
            }
        }

        await using var updateCommand = connection.CreateCommand();
        updateCommand.CommandText = """
            UPDATE Doctors
            SET first_name = @firstName,
                last_name = @lastName,
                specialization = @specialization,
                license_number = @licenseNumber,
                phone = @phone,
                consultation_fee = @consultationFee
            WHERE doctor_id = @doctorId;
            """;
        updateCommand.Parameters.AddWithValue("@doctorId", doctorId);
        updateCommand.Parameters.AddWithValue("@firstName", request.FirstName.Trim());
        updateCommand.Parameters.AddWithValue("@lastName", request.LastName.Trim());
        updateCommand.Parameters.AddWithValue("@specialization", NormalizeNullable(request.Specialization));
        updateCommand.Parameters.AddWithValue("@licenseNumber", request.LicenseNumber.Trim());
        updateCommand.Parameters.AddWithValue("@phone", NormalizeNullable(request.Phone));
        updateCommand.Parameters.AddWithValue("@consultationFee", request.ConsultationFee);

        var affected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new DoctorOperationResult(false, "Doctor profile not found.", null);
        }

        var doctor = await GetByIdAsync(doctorId, cancellationToken);
        return new DoctorOperationResult(true, "Doctor profile updated successfully.", doctor);
    }

    public async Task<DoctorOperationResult> UpdateByUserIdAsync(int userId, DoctorUpsertRequest request, CancellationToken cancellationToken)
    {
        var profile = await GetByUserIdAsync(userId, cancellationToken);
        if (profile is null)
        {
            return new DoctorOperationResult(false, "Doctor profile not found.", null);
        }

        return await UpdateByIdAsync(profile.DoctorId, request, cancellationToken);
    }

    public async Task<DoctorDeleteResult> DeleteAsync(int doctorId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var appointmentCheck = connection.CreateCommand())
        {
            appointmentCheck.CommandText = """
                SELECT COUNT(*)
                FROM Appointments
                WHERE doctor_id = @doctorId;
                """;
            appointmentCheck.Parameters.AddWithValue("@doctorId", doctorId);

            var appointmentCount = Convert.ToInt32(await appointmentCheck.ExecuteScalarAsync(cancellationToken));
            if (appointmentCount > 0)
            {
                return new DoctorDeleteResult(
                    false,
                    "Cannot delete this doctor because existing appointments are linked to the profile.");
            }
        }

        await using (var prescriptionCheck = connection.CreateCommand())
        {
            prescriptionCheck.CommandText = """
                SELECT COUNT(*)
                FROM Prescriptions
                WHERE doctor_id = @doctorId;
                """;
            prescriptionCheck.Parameters.AddWithValue("@doctorId", doctorId);

            var prescriptionCount = Convert.ToInt32(await prescriptionCheck.ExecuteScalarAsync(cancellationToken));
            if (prescriptionCount > 0)
            {
                return new DoctorDeleteResult(
                    false,
                    "Cannot delete this doctor because existing prescriptions are linked to the profile.");
            }
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Doctors WHERE doctor_id = @doctorId;";
        command.Parameters.AddWithValue("@doctorId", doctorId);

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0
            ? new DoctorDeleteResult(true, "Doctor deleted successfully.")
            : new DoctorDeleteResult(false, "Doctor profile not found.", NotFound: true);
    }

    private static DoctorProfileResponse MapDoctor(DbDataReader reader)
    {
        var userIdOrdinal = reader.GetOrdinal("user_id");

        var doctorId = reader.GetInt32(reader.GetOrdinal("doctor_id"));
        return new DoctorProfileResponse(
            DoctorId: doctorId,
            FormattedId: $"DOC-{doctorId:D4}",
            UserId: reader.IsDBNull(userIdOrdinal) ? null : reader.GetInt32(userIdOrdinal),
            FirstName: reader.GetString(reader.GetOrdinal("first_name")),
            LastName: reader.GetString(reader.GetOrdinal("last_name")),
            Specialization: GetNullableString(reader, "specialization"),
            LicenseNumber: reader.GetString(reader.GetOrdinal("license_number")),
            Phone: GetNullableString(reader, "phone"),
            ConsultationFee: reader.GetDecimal(reader.GetOrdinal("consultation_fee")),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    private static string? ValidateUpsertRequest(DoctorUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
        {
            return "First name and last name are required.";
        }

        if (string.IsNullOrWhiteSpace(request.LicenseNumber))
        {
            return "License number is required.";
        }

        if (request.ConsultationFee < 0)
        {
            return "Consultation fee cannot be negative.";
        }

        return null;
    }

    private static string? GetNullableString(DbDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static string? NormalizeNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
