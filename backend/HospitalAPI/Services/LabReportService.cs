using System.Net.Http.Headers;
using System.Text.Json;
using HospitalAPI.Data;
using HospitalAPI.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public interface ILabReportService
{
    Task<LabReportOperationResult> CreateAsync(
        int patientId,
        int? doctorId,
        string testName,
        DateOnly testDate,
        string? resultSummary,
        IFormFile? reportFile,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PatientLabReportListResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken);

    Task<PatientLabReportDetailResponse?> GetByIdAsync(int reportId, int patientId, CancellationToken cancellationToken);

    Task<(string FileName, string ContentType, string FullPath)?> GetFileDownloadInfoAsync(int reportId, int patientId, CancellationToken cancellationToken);

    Task<LabReportOperationResult> UpdateAsync(
        int reportId,
        int patientId,
        string testName,
        DateOnly testDate,
        string? resultSummary,
        IFormFile? reportFile,
        bool removeExistingFile,
        CancellationToken cancellationToken);

    Task<LabReportDeleteResult> DeleteAsync(int reportId, int patientId, CancellationToken cancellationToken);
}

public sealed class LabReportService : ILabReportService
{
    private readonly MySqlConnectionFactory connectionFactory;
    private readonly IConfiguration configuration;

    public LabReportService(MySqlConnectionFactory connectionFactory, IConfiguration configuration)
    {
        this.connectionFactory = connectionFactory;
        this.configuration = configuration;
    }

    public async Task<LabReportOperationResult> CreateAsync(
        int patientId,
        int? doctorId,
        string testName,
        DateOnly testDate,
        string? resultSummary,
        IFormFile? reportFile,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(testName))
        {
            return new LabReportOperationResult(false, "Test name is required.", null);
        }

        if (testName.Length > 150)
        {
            return new LabReportOperationResult(false, "Test name cannot exceed 150 characters.", null);
        }

        var storedFileName = await SaveReportFileAsync(reportFile, cancellationToken);

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Lab_Reports (
                patient_id,
                doctor_id,
                test_name,
                test_date,
                file_path,
                result_summary)
            VALUES (
                @patientId,
                @doctorId,
                @testName,
                @testDate,
                @filePath,
                @resultSummary);
            SELECT LAST_INSERT_ID();
            """;
        insertCommand.Parameters.AddWithValue("@patientId", patientId);
        insertCommand.Parameters.AddWithValue("@doctorId", doctorId.HasValue ? doctorId.Value : DBNull.Value);
        insertCommand.Parameters.AddWithValue("@testName", testName.Trim());
        insertCommand.Parameters.AddWithValue("@testDate", testDate.ToDateTime(TimeOnly.MinValue));
        insertCommand.Parameters.AddWithValue("@filePath", string.IsNullOrWhiteSpace(storedFileName) ? DBNull.Value : storedFileName);
        insertCommand.Parameters.AddWithValue("@resultSummary", string.IsNullOrWhiteSpace(resultSummary) ? DBNull.Value : resultSummary.Trim());

        var createdIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var createdId = Convert.ToInt32(createdIdObj);
        var report = await GetByIdAsync(createdId, patientId, cancellationToken);

        return new LabReportOperationResult(true, "Lab report uploaded successfully.", report);
    }

    public async Task<IReadOnlyList<PatientLabReportListResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                lr.report_id,
                lr.test_name,
                lr.test_date,
                lr.result_summary,
                lr.file_path,
                lr.doctor_id,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name,
                lr.created_at
            FROM Lab_Reports lr
            LEFT JOIN Doctors d ON d.doctor_id = lr.doctor_id
            WHERE lr.patient_id = @patientId
            ORDER BY lr.test_date DESC, lr.report_id DESC;
            """;
        command.Parameters.AddWithValue("@patientId", patientId);

        var items = new List<PatientLabReportListResponse>();
        await using var reader = (MySqlDataReader)await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var filePath = GetNullableString(reader, "file_path");
            var doctorIdOrd = reader.GetOrdinal("doctor_id");
            var doctorId = reader.IsDBNull(doctorIdOrd) ? (int?)null : reader.GetInt32(doctorIdOrd);
            items.Add(new PatientLabReportListResponse(
                ReportId: reader.GetInt32(reader.GetOrdinal("report_id")),
                PatientId: patientId,
                PatientFormattedId: $"PAT-{patientId:D4}",
                TestName: reader.GetString(reader.GetOrdinal("test_name")),
                TestDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("test_date"))),
                ResultSummary: GetNullableString(reader, "result_summary"),
                HasFile: !string.IsNullOrWhiteSpace(filePath),
                FileName: string.IsNullOrWhiteSpace(filePath) ? null : Path.GetFileName(new Uri(filePath).AbsolutePath),
                FileUrl: filePath,
                DoctorName: NormalizeNullable(GetNullableString(reader, "doctor_name")),
                DoctorFormattedId: doctorId.HasValue ? $"DOC-{doctorId.Value:D4}" : null,
                CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at"))));
        }

        return items;
    }

    public async Task<PatientLabReportDetailResponse?> GetByIdAsync(int reportId, int patientId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                lr.report_id,
                lr.patient_id,
                lr.doctor_id,
                lr.test_name,
                lr.test_date,
                lr.result_summary,
                lr.file_path,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name,
                lr.created_at,
                lr.updated_at
            FROM Lab_Reports lr
            LEFT JOIN Doctors d ON d.doctor_id = lr.doctor_id
            WHERE lr.report_id = @reportId
              AND lr.patient_id = @patientId;
            """;
        command.Parameters.AddWithValue("@reportId", reportId);
        command.Parameters.AddWithValue("@patientId", patientId);

        await using var reader = (MySqlDataReader)await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var filePath = GetNullableString(reader, "file_path");
        var pId = reader.GetInt32(reader.GetOrdinal("patient_id"));
        var dId = reader.IsDBNull(reader.GetOrdinal("doctor_id")) ? (int?)null : reader.GetInt32(reader.GetOrdinal("doctor_id"));
        return new PatientLabReportDetailResponse(
            ReportId: reader.GetInt32(reader.GetOrdinal("report_id")),
            PatientId: pId,
            PatientFormattedId: $"PAT-{pId:D4}",
            DoctorId: dId,
            TestName: reader.GetString(reader.GetOrdinal("test_name")),
            TestDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("test_date"))),
            ResultSummary: GetNullableString(reader, "result_summary"),
            HasFile: !string.IsNullOrWhiteSpace(filePath),
            FileName: string.IsNullOrWhiteSpace(filePath) ? null : Path.GetFileName(new Uri(filePath).AbsolutePath),
            FileUrl: filePath,
            DoctorName: NormalizeNullable(GetNullableString(reader, "doctor_name")),
            DoctorFormattedId: dId.HasValue ? $"DOC-{dId.Value:D4}" : null,
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    public async Task<(string FileName, string ContentType, string FullPath)?> GetFileDownloadInfoAsync(int reportId, int patientId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT file_path
            FROM Lab_Reports
            WHERE report_id = @reportId
              AND patient_id = @patientId;
            """;
        command.Parameters.AddWithValue("@reportId", reportId);
        command.Parameters.AddWithValue("@patientId", patientId);

        var filePathObj = await command.ExecuteScalarAsync(cancellationToken);
        var filePath = filePathObj is string s ? s : null;
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return null;
        }

        return ("cloud_file", "application/octet-stream", filePath);
    }

    public async Task<LabReportOperationResult> UpdateAsync(
        int reportId,
        int patientId,
        string testName,
        DateOnly testDate,
        string? resultSummary,
        IFormFile? reportFile,
        bool removeExistingFile,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(testName))
        {
            return new LabReportOperationResult(false, "Test name is required.", null);
        }

        if (testName.Length > 150)
        {
            return new LabReportOperationResult(false, "Test name cannot exceed 150 characters.", null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var (exists, existingFilePath) = await GetReportFileInfoAsync(connection, reportId, patientId, cancellationToken);
        if (!exists)
        {
            return new LabReportOperationResult(false, "Lab report not found.", null);
        }

        string? newStoredFileName = null;
        var normalizedSummary = string.IsNullOrWhiteSpace(resultSummary) ? null : resultSummary.Trim();

        try
        {
            newStoredFileName = await SaveReportFileAsync(reportFile, cancellationToken);

            var nextStoredFilePath = existingFilePath;
            if (!string.IsNullOrWhiteSpace(newStoredFileName))
            {
                nextStoredFilePath = newStoredFileName;
            }
            else if (removeExistingFile)
            {
                nextStoredFilePath = null;
            }

            await using var updateCommand = connection.CreateCommand();
            updateCommand.CommandText = """
                UPDATE Lab_Reports
                SET test_name = @testName,
                    test_date = @testDate,
                    result_summary = @resultSummary,
                    file_path = @filePath,
                    updated_at = CURRENT_TIMESTAMP
                WHERE report_id = @reportId
                  AND patient_id = @patientId;
                """;
            updateCommand.Parameters.AddWithValue("@testName", testName.Trim());
            updateCommand.Parameters.AddWithValue("@testDate", testDate.ToDateTime(TimeOnly.MinValue));
            updateCommand.Parameters.AddWithValue("@resultSummary", normalizedSummary ?? (object)DBNull.Value);
            updateCommand.Parameters.AddWithValue("@filePath", string.IsNullOrWhiteSpace(nextStoredFilePath) ? DBNull.Value : nextStoredFilePath);
            updateCommand.Parameters.AddWithValue("@reportId", reportId);
            updateCommand.Parameters.AddWithValue("@patientId", patientId);

            var rows = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
            if (rows == 0)
            {
                if (!string.IsNullOrWhiteSpace(newStoredFileName))
                {
                    DeletePhysicalFile(newStoredFileName);
                }

                return new LabReportOperationResult(false, "Lab report not found.", null);
            }

            if (!string.IsNullOrWhiteSpace(existingFilePath) &&
                !string.Equals(existingFilePath, nextStoredFilePath, StringComparison.OrdinalIgnoreCase))
            {
                DeletePhysicalFile(existingFilePath);
            }

            var updated = await GetByIdAsync(reportId, patientId, cancellationToken);
            return new LabReportOperationResult(true, "Lab report updated successfully.", updated);
        }
        catch
        {
            if (!string.IsNullOrWhiteSpace(newStoredFileName))
            {
                DeletePhysicalFile(newStoredFileName);
            }

            throw;
        }
    }

    public async Task<LabReportDeleteResult> DeleteAsync(int reportId, int patientId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var (exists, existingFilePath) = await GetReportFileInfoAsync(connection, reportId, patientId, cancellationToken);
        if (!exists)
        {
            return new LabReportDeleteResult(false, "Lab report not found.", true);
        }

        await using var deleteCommand = connection.CreateCommand();
        deleteCommand.CommandText = """
            DELETE FROM Lab_Reports
            WHERE report_id = @reportId
              AND patient_id = @patientId;
            """;
        deleteCommand.Parameters.AddWithValue("@reportId", reportId);
        deleteCommand.Parameters.AddWithValue("@patientId", patientId);

        var rows = await deleteCommand.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
        {
            return new LabReportDeleteResult(false, "Lab report not found.", true);
        }

        if (!string.IsNullOrWhiteSpace(existingFilePath))
        {
            DeletePhysicalFile(existingFilePath);
        }

        return new LabReportDeleteResult(true, "Lab report deleted successfully.");
    }

    private async Task<string?> SaveReportFileAsync(IFormFile? reportFile, CancellationToken cancellationToken)
    {
        if (reportFile is null || reportFile.Length == 0)
        {
            return null;
        }

        var ext = Path.GetExtension(reportFile.FileName);
        var publicId = $"hospital/lab_reports/{Guid.NewGuid():N}{ext}";
        var cloudName = configuration["Cloudinary:CloudName"]!;
        var uploadPreset = configuration["Cloudinary:UploadPreset"]!;

        await using var stream = reportFile.OpenReadStream();
        using var httpClient = new HttpClient();
        using var multipart = new MultipartFormDataContent();
        var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(reportFile.ContentType);
        multipart.Add(fileContent, "file", reportFile.FileName);
        multipart.Add(new StringContent(uploadPreset), "upload_preset");
        multipart.Add(new StringContent(publicId), "public_id");

        var response = await httpClient.PostAsync(
            $"https://api.cloudinary.com/v1_1/{cloudName}/raw/upload", multipart, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Cloudinary upload failed: {error}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
        return json.GetProperty("secure_url").GetString();
    }

    private async Task<(bool Exists, string? FilePath)> GetReportFileInfoAsync(MySqlConnection connection, int reportId, int patientId, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT report_id, file_path
            FROM Lab_Reports
            WHERE report_id = @reportId
              AND patient_id = @patientId;
            """;
        command.Parameters.AddWithValue("@reportId", reportId);
        command.Parameters.AddWithValue("@patientId", patientId);

        await using var reader = (MySqlDataReader)await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return (false, null);
        }

        var filePathOrdinal = reader.GetOrdinal("file_path");
        var filePath = reader.IsDBNull(filePathOrdinal) ? null : reader.GetString(filePathOrdinal);
        return (true, filePath);
    }

    private void DeletePhysicalFile(string filePath)
    {
        // Optional: Implement Cloudinary deletion if necessary.
    }

    private static string? GetNullableString(MySqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
