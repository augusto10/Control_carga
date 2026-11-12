using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Authentication;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SecuGen.FDxSDKPro.Windows;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, 17876));
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.Configure<BiometricAgentOptions>(
    builder.Configuration.GetSection(BiometricAgentOptions.SectionName));
builder.Services.AddSingleton<FingerprintService>();
builder.Services.AddHttpClient<ControlCargaClient>()
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        // Evita que o Schannel tente selecionar automaticamente um certificado
        // de cliente da conta interativa. Alguns totens não possuem credenciais
        // disponíveis no repositório do Windows e a negociação TLS falha antes
        // mesmo de a requisição chegar ao servidor.
        ClientCertificateOptions = ClientCertificateOption.Manual,
        SslProtocols = SslProtocols.Tls12,
    });

var app = builder.Build();
var options = app.Services.GetRequiredService<IOptions<BiometricAgentOptions>>().Value;
var allowedOrigins = new HashSet<string>(options.AllowedOrigins, StringComparer.OrdinalIgnoreCase);

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers.Origin.ToString();
    var healthCheckWithoutBrowser = string.IsNullOrEmpty(origin) &&
        HttpMethods.IsGet(context.Request.Method) &&
        context.Request.Path == "/health";
    if (!healthCheckWithoutBrowser &&
        (string.IsNullOrEmpty(origin) || !allowedOrigins.Contains(origin)))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { message = "Origem não autorizada pelo agente biométrico." });
        return;
    }

    if (!string.IsNullOrEmpty(origin))
    {
        context.Response.Headers.AccessControlAllowOrigin = origin;
        context.Response.Headers.AccessControlAllowMethods = "GET, POST, OPTIONS";
        context.Response.Headers.AccessControlAllowHeaders = "Content-Type";
        context.Response.Headers.AccessControlMaxAge = "600";
        context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";
    }

    if (HttpMethods.IsOptions(context.Request.Method))
    {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
});

app.MapGet("/health", () => Results.Ok(new { status = "ready", device = "SecuGen FDx SDK Pro" }));

app.MapPost("/capture", async (FingerprintService fingerprint, CancellationToken cancellationToken) =>
{
    try
    {
        var template = await fingerprint.CaptureTemplateAsync(cancellationToken);
        return Results.Ok(new { template = Convert.ToBase64String(template) });
    }
    catch (FingerprintException error)
    {
        return Results.Problem(error.Message, statusCode: StatusCodes.Status422UnprocessableEntity);
    }
});

app.MapPost("/identify", async (
    FingerprintService fingerprint,
    ControlCargaClient controlCarga,
    CancellationToken cancellationToken) =>
{
    try
    {
        var candidates = await controlCarga.GetCandidatesAsync(cancellationToken);
        if (candidates.Count == 0)
        {
            return Results.Problem(
                "Nenhum separador ativo possui digital cadastrada e credenciais ADM.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var match = await fingerprint.IdentifyAsync(candidates, cancellationToken);
        if (match is null)
        {
            return Results.Problem(
                "Digital não reconhecida. Tente novamente, apoiando o dedo no centro do leitor.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        using var association = await controlCarga.AssociateAsync(match.Id, cancellationToken);
        var result = association.RootElement;
        return Results.Ok(new
        {
            success = true,
            separador = new { id = match.Id, nome = match.Nome },
            job = result.GetProperty("job").Clone(),
            pedido = result.GetProperty("pedido").Clone(),
        });
    }
    catch (FingerprintException error)
    {
        return Results.Problem(error.Message, statusCode: StatusCodes.Status422UnprocessableEntity);
    }
    catch (ControlCargaException error)
    {
        return Results.Problem(error.Message, statusCode: error.StatusCode);
    }
    catch (HttpRequestException error)
    {
        return Results.Problem(
            $"Não foi possível conectar ao servidor do Controle de Carga: {error.Message}",
            statusCode: StatusCodes.Status502BadGateway);
    }
});

app.Run();

sealed class BiometricAgentOptions
{
    public const string SectionName = "BiometriaAgent";
    public string ServerBaseUrl { get; set; } = "";
    public string AgentToken { get; set; } = "";
    public string[] AllowedOrigins { get; set; } = [];
}

sealed record BiometricCandidate(string Id, string Nome, string Template);
sealed record CandidateResponse(List<BiometricCandidate> Candidatos);

sealed class ControlCargaClient
{
    private readonly HttpClient _http;
    private readonly BiometricAgentOptions _options;

    public ControlCargaClient(HttpClient http, IOptions<BiometricAgentOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (!Uri.TryCreate(_options.ServerBaseUrl, UriKind.Absolute, out var serverUri) ||
            (serverUri.Scheme != Uri.UriSchemeHttps && serverUri.Host is not ("localhost" or "127.0.0.1")))
        {
            throw new InvalidOperationException("ServerBaseUrl deve usar HTTPS (exceto localhost para desenvolvimento).");
        }
        if (string.IsNullOrWhiteSpace(_options.AgentToken) ||
            _options.AgentToken.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Configure o AgentToken no appsettings.json do agente.");
        }
        _http.BaseAddress = serverUri;
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<List<BiometricCandidate>> GetCandidatesAsync(CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/separacao/biometria/candidatos");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AgentToken);
        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var message = await ReadMessageAsync(response, cancellationToken);
            throw new ControlCargaException(message, (int)response.StatusCode);
        }

        var result = await response.Content.ReadFromJsonAsync<CandidateResponse>(cancellationToken);
        return result?.Candidatos ?? throw new ControlCargaException(
            "Resposta inválida ao carregar digitais cadastradas.", StatusCodes.Status502BadGateway);
    }

    public async Task<JsonDocument> AssociateAsync(string usuarioId, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/separacao/associar")
        {
            Content = JsonContent.Create(new { usuarioId }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AgentToken);
        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var message = await ReadMessageAsync(response, cancellationToken);
            throw new ControlCargaException(message, (int)response.StatusCode);
        }

        return await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);
    }

    private static async Task<string> ReadMessageAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            var result = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            if (result.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
            {
                return message.GetString() ?? "Falha na comunicação com o ControlCarga.";
            }
        }
        catch (JsonException)
        {
            // Response body may not be JSON; return a generic, non-sensitive message.
        }
        return "Falha na comunicação com o ControlCarga.";
    }
}

sealed class FingerprintService
{
    private const int TemplateLength = 400;
    private const int CaptureTimeoutMs = 20_000;
    private const int MatchingSecurityLevel = 3;
    private readonly SemaphoreSlim _deviceLock = new(1, 1);

    public async Task<byte[]> CaptureTemplateAsync(CancellationToken cancellationToken)
    {
        await _deviceLock.WaitAsync(cancellationToken);
        try
        {
            return await Task.Run(CaptureTemplate, cancellationToken);
        }
        finally
        {
            _deviceLock.Release();
        }
    }

    public async Task<BiometricCandidate?> IdentifyAsync(
        IReadOnlyList<BiometricCandidate> candidates,
        CancellationToken cancellationToken)
    {
        await _deviceLock.WaitAsync(cancellationToken);
        try
        {
            return await Task.Run(() => Identify(candidates), cancellationToken);
        }
        finally
        {
            _deviceLock.Release();
        }
    }

    private static byte[] CaptureTemplate()
    {
        using var device = OpenDevice();
        var image = new byte[device.Info.ImageWidth * device.Info.ImageHeight];
        var captureError = device.Manager.GetImageEx(
            image,
            CaptureTimeoutMs,
            0,
            50);
        EnsureSuccess(captureError, "capturar a digital");

        var template = new byte[TemplateLength];
        EnsureSuccess(device.Manager.CreateTemplate(image, template), "gerar o template biométrico");
        return template;
    }

    private static BiometricCandidate? Identify(IReadOnlyList<BiometricCandidate> candidates)
    {
        using var device = OpenDevice();
        var image = new byte[device.Info.ImageWidth * device.Info.ImageHeight];
        EnsureSuccess(
            device.Manager.GetImageEx(image, CaptureTimeoutMs, 0, 50),
            "capturar a digital");

        var probeTemplate = new byte[TemplateLength];
        EnsureSuccess(device.Manager.CreateTemplate(image, probeTemplate), "gerar o template biométrico");

        BiometricCandidate? matched = null;
        foreach (var candidate in candidates)
        {
            byte[] candidateTemplate;
            try
            {
                candidateTemplate = Convert.FromBase64String(candidate.Template);
            }
            catch (FormatException)
            {
                throw new FingerprintException("Há um cadastro biométrico inválido. Solicite a recaptura da digital.");
            }

            if (candidateTemplate.Length != TemplateLength)
            {
                throw new FingerprintException("Há um cadastro biométrico inválido. Solicite a recaptura da digital.");
            }

            var matchedCandidate = false;
            EnsureSuccess(
                device.Manager.MatchTemplate(
                    candidateTemplate,
                    probeTemplate,
                    (SGFPMSecurityLevel)MatchingSecurityLevel,
                    ref matchedCandidate),
                "comparar a digital");

            if (!matchedCandidate) continue;
            if (matched is not null)
            {
                throw new FingerprintException("A digital corresponde a mais de um cadastro. Revise as digitais registradas.");
            }
            matched = candidate;
        }
        return matched;
    }

    private static OpenFingerprintDevice OpenDevice()
    {
        var manager = new SGFingerPrintManager();
        var enumerateError = manager.EnumerateDevice();
        EnsureSuccess(enumerateError, "localizar o leitor");
        if (manager.NumberOfDevice < 1)
        {
            throw new FingerprintException("Leitor SecuGen não encontrado. Verifique a conexão e o driver U20-A.");
        }

        var deviceInfo = new SGFPMDeviceList();
        manager.GetEnumDeviceInfo(0, deviceInfo);
        EnsureSuccess((int)manager.Init(deviceInfo.DevName), "inicializar o leitor");
        var openError = manager.OpenDevice(deviceInfo.DevID);
        if (openError != (int)SGFPMError.ERROR_NONE)
        {
            throw new FingerprintException($"Não foi possível abrir o leitor SecuGen (erro {openError}).");
        }

        var info = new SGFPMDeviceInfoParam();
        var infoError = manager.GetDeviceInfo(info);
        if (infoError != (int)SGFPMError.ERROR_NONE)
        {
            manager.CloseDevice();
            throw new FingerprintException($"Não foi possível consultar o leitor SecuGen (erro {infoError}).");
        }
        return new OpenFingerprintDevice(manager, info);
    }

    private static void EnsureSuccess(int result, string operation)
    {
        if (result != (int)SGFPMError.ERROR_NONE)
        {
            var detail = result == (int)SGFPMError.ERROR_TIME_OUT
                ? " Tempo limite atingido; apoie o dedo no sensor e tente novamente."
                : $" Código {result}.";
            throw new FingerprintException($"Falha ao {operation}.{detail}");
        }
    }

    private sealed class OpenFingerprintDevice : IDisposable
    {
        public OpenFingerprintDevice(SGFingerPrintManager manager, SGFPMDeviceInfoParam info)
        {
            Manager = manager;
            Info = info;
        }

        public SGFingerPrintManager Manager { get; }
        public SGFPMDeviceInfoParam Info { get; }
        public void Dispose() => Manager.CloseDevice();
    }
}

sealed class FingerprintException(string message) : Exception(message);
sealed class ControlCargaException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode is >= 400 and <= 599
        ? statusCode
        : StatusCodes.Status502BadGateway;
}
