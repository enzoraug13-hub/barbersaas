FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["BarberSaaS.API/BarberSaaS.API.csproj",            "BarberSaaS.API/"]
COPY ["BarberSaaS.Application/BarberSaaS.Application.csproj", "BarberSaaS.Application/"]
COPY ["BarberSaaS.Domain/BarberSaaS.Domain.csproj",      "BarberSaaS.Domain/"]
COPY ["BarberSaaS.Infrastructure/BarberSaaS.Infrastructure.csproj", "BarberSaaS.Infrastructure/"]
RUN dotnet restore "BarberSaaS.API/BarberSaaS.API.csproj"
COPY . .
WORKDIR "/src/BarberSaaS.API"
RUN dotnet build "BarberSaaS.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BarberSaaS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BarberSaaS.API.dll"]
