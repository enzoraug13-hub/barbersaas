using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using System.Net;
using System.Text.Json;

namespace BarberSaaS.API.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next; _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (Exception ex) { await HandleExceptionAsync(context, ex); }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        // Apenas exceções de domínio/validação têm a mensagem exposta ao cliente
        // (são mensagens escritas para o usuário). Qualquer outra exceção — incluindo
        // InvalidOperationException vinda de bibliotecas/infra — cai no genérico 500
        // e é logada, para não vazar detalhes internos.
        var (statusCode, errors) = exception switch
        {
            ValidationException ve          => (HttpStatusCode.BadRequest, ve.Errors.Select(e => e.ErrorMessage)),
            ClientBlockedException cbe      => (HttpStatusCode.Forbidden, new[] { cbe.Message }.AsEnumerable()),
            ClientProfileIncompleteException pie => (HttpStatusCode.Forbidden, new[] { pie.Message }.AsEnumerable()),
            DomainException de              => (HttpStatusCode.BadRequest, new[] { de.Message }.AsEnumerable()),
            UnauthorizedAccessException ue  => (HttpStatusCode.Unauthorized, new[] { ue.Message }.AsEnumerable()),
            _                               => (HttpStatusCode.InternalServerError, new[] { "Erro interno do servidor." }.AsEnumerable())
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        context.Response.StatusCode = (int)statusCode;

        var response = ApiResponse<object>.Fail(errors);
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
