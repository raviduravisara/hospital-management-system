FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/HospitalAPI/HospitalAPI.csproj backend/HospitalAPI/
RUN dotnet restore backend/HospitalAPI/HospitalAPI.csproj

COPY . .
RUN dotnet publish backend/HospitalAPI/HospitalAPI.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "HospitalAPI.dll"]
