using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Duplo.Ai.Studio.Extensibility.Infra;
using k8s;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.Minio;

// MinIO — AGENT-PROVISIONED resource with C# ENRICHMENT (the two patterns combined).
//   * Provisioning is agent-based: a skill (provision-minio) is mapped, so the service runs in
//     HelpdeskAgent mode. The skill kubectl-applies a Deployment + ClusterIP Service (no ingress)
//     into the selected kubernetes scope's namespace and writes the result back.
//   * Enrichment is C#: on every GET, EnrichResultAsync reads the live pods through the SDK's
//     IScopeClientFactory and injects them into Result.Pods — live state never persisted.
// See reference/12-enrichment-and-live-state.md (enrichment + Result contract) and 07-scope-credentials.md
// (how the agent's provision skill gets a kubeconfig for the k8s scope).

/// <summary>What to deploy + which kubernetes scope to deploy into (scope id lives on BaseSpec.ScopeIds).</summary>
[BsonIgnoreExtraElements]
public class MinioSpec : BaseSpec
{
    /// <summary>Namespace to deploy MinIO into.</summary>
    public string? Namespace { get; set; }

    /// <summary>Container image. Defaults to the April 2025 full-console release.</summary>
    public string? Image { get; set; }

    /// <summary>MinIO root user (env MINIO_ROOT_USER).</summary>
    public string? RootUser { get; set; }

    /// <summary>MinIO root password (env MINIO_ROOT_PASSWORD).</summary>
    public string? RootPassword { get; set; }

    /// <summary>Deployment replica count.</summary>
    public int Replicas { get; set; } = 1;
}

/// <summary>
/// Provisioning outputs (deployment/service names + in-cluster endpoints) written by the skill, plus the
/// live pod list injected on GET by enrichment. Stored as BSON — Pods stays a BSON array (reference/12).
/// </summary>
[BsonIgnoreExtraElements]
public class MinioResult : BaseResult
{
    public string? DeploymentName { get; set; }
    public string? ServiceName { get; set; }

    /// <summary>In-cluster S3 API endpoint, e.g. minio.dev01-gk.svc.cluster.local:9000.</summary>
    public string? ApiEndpoint { get; set; }

    /// <summary>In-cluster web console endpoint, e.g. minio.dev01-gk.svc.cluster.local:9001.</summary>
    public string? ConsoleEndpoint { get; set; }

    /// <summary>Live pods backing this MinIO, refreshed on every GET by EnrichResultAsync (not persisted).</summary>
    public List<PodInfo> Pods { get; set; } = new();
}

/// <summary>One pod's live status + its container images.</summary>
public class PodInfo
{
    public string? Name { get; set; }
    public string? Phase { get; set; }
    public bool Ready { get; set; }
    public List<string> Images { get; set; } = new();
}

/// <summary>The entity (own Mongo collection + REST route).</summary>
[BsonCollection("extension_minios")]
public class Minio : ResourceBase<MinioSpec, MinioResult>
{
    public override string GetTicketOriginType() => "MinIO";
    public override string GetTicketOriginSubType() => "minio";
}

/// <summary>No-op hooks.</summary>
public class MinioHooks : DefaultEntityHooks<Minio>
{
}

/// <summary>
/// Service: agent-provisioned (a skill is mapped, so the base runs HelpdeskAgent mode — no provisioning
/// override needed) and enriched in C#. The host's per-extension DI container satisfies the base deps plus
/// the SDK's <see cref="IScopeClientFactory"/>.
/// </summary>
public class MinioService : ResourceServiceBase<Minio, MinioSpec, MinioResult>
{
    private readonly IScopeClientFactory _clients;

    // Deprovision is agent-driven: on delete the platform reuses this resource's ticket and sends the generic
    // teardown message, which provision-minio's deprovision.sh handles (kubectl delete + POST status DeProvisioned).
    // We do NOT override AutoDeleteOnDeProvision — agent mode defaults it to `true`, so once the skill posts
    // DeProvisioned the platform hard-deletes this row automatically. To keep the row for audit instead, add:
    //     protected override bool AutoDeleteOnDeProvision(Minio? e = null) => false;


    public MinioService(
        IRepository<Minio> repository,
        ILogger<MinioService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor,
        IScopeClientFactory clients)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
        _clients = clients;
    }

    // Runs inside GetByIdAsync before the entity is returned; failures here are caught so a GET never 500s.
    // Enrichment is independent of provisioning mode — it augments whatever the skill already persisted.
    protected override async Task EnrichResultAsync(Minio entity, CancellationToken ct)
    {
        var k8s = await _clients.GetKubernetesClientAsync(entity.Spec?.ScopeIds ?? new List<string>(), ct);
        if (k8s is null) return; // no kubernetes scope attached → leave Result as-is

        var pods = await k8s.Value.Client.CoreV1.ListNamespacedPodAsync(
            entity.Spec?.Namespace ?? "default", labelSelector: "app=minio", cancellationToken: ct);

        entity.Result ??= new MinioResult();
        entity.Result.Pods = pods.Items.Select(p => new PodInfo
        {
            Name = p.Metadata?.Name,
            Phase = p.Status?.Phase,
            Ready = p.Status?.ContainerStatuses?.All(c => c.Ready) ?? false,
            Images = p.Spec?.Containers?.Select(c => c.Image).Where(i => i != null).Select(i => i!).ToList()
                     ?? new List<string>(),
        }).ToList();
    }
}
