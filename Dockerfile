# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# Build stage — SDK completo só para restaurar e publicar.
# ----------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 1) Copia APENAS os .csproj (+ a solution) e restaura primeiro.
#    Enquanto as dependências não mudam, esta camada fica em cache e o restore
#    (lento) não roda de novo a cada alteração de código.
COPY BarberSaaS.sln ./
COPY src/BarberSaaS.Domain/BarberSaaS.Domain.csproj                 src/BarberSaaS.Domain/
COPY src/BarberSaaS.Application/BarberSaaS.Application.csproj        src/BarberSaaS.Application/
COPY src/BarberSaaS.Infrastructure/BarberSaaS.Infrastructure.csproj src/BarberSaaS.Infrastructure/
COPY src/BarberSaaS.API/BarberSaaS.API.csproj                       src/BarberSaaS.API/
RUN dotnet restore src/BarberSaaS.API/BarberSaaS.API.csproj

# 2) Copia o resto do código e publica em Release.
#    UseAppHost=false: não gera o executável nativo (rodamos via `dotnet App.dll`),
#    deixando a imagem menor.
COPY . .
RUN dotnet publish src/BarberSaaS.API/BarberSaaS.API.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

# ----------------------------------------------------------------------------
# Runtime stage — só o runtime ASP.NET, sem SDK. Imagem final enxuta.
# ----------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Bind em todas as interfaces numa porta NÃO privilegiada (obrigatório p/ rodar
# como não-root). Hosts como Azure App Service / Container Apps mapeiam pra cá.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

# Diretório de uploads gravável pelo usuário não-root. Uploads em disco são
# EFÊMEROS e não compartilhados entre instâncias (ver B4 no ROADMAP-PRODUCAO.md:
# migrar para blob storage). Isto só garante que o upload funcione numa instância
# (ex.: smoke test do logo) sem dar erro de permissão.
RUN mkdir -p /app/wwwroot/uploads && chown -R app /app/wwwroot

# Usuário não-root 'app' (uid 1654) já vem nas imagens .NET 8+. Nunca rodar como root.
USER app

ENTRYPOINT ["dotnet", "BarberSaaS.API.dll"]
