using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.AppSvc;

// COMPLEX (AppServices-style) form sample. Mirrors the shape of the portal's heavyweight AppService form —
// many fields, dropdowns, and conditional sections — split into a Basic / Advanced 2-step wizard on the
// frontend. No-provision: the Spec just persists what the form collects.

public class EnvVar
{
    public string? Name { get; set; }
    public string? Value { get; set; }
}

[BsonIgnoreExtraElements]
public class AppSvcSpec : BaseSpec
{
    // Basic
    public string? Image { get; set; }
    public string Platform { get; set; } = "EKS";      // ECS | EKS
    public int Replicas { get; set; } = 1;
    public int Port { get; set; } = 80;

    // Advanced — scaling
    public string ReplicationStrategy { get; set; } = "static";  // static | hpa | daemonset
    public int? HpaMinReplicas { get; set; }
    public int? HpaMaxReplicas { get; set; }
    public int? HpaTargetCpu { get; set; }

    // Advanced — env + container
    public List<EnvVar> Env { get; set; } = new();
    public string? Command { get; set; }
    public string? VolumeMounts { get; set; }

    // Advanced — load balancer (conditional)
    public bool EnableLb { get; set; }
    public string? LbType { get; set; }                 // ClassicElb | ApplicationElb
    public int? LbListenerPort { get; set; }
    public string? HealthCheckPath { get; set; }
}

[BsonIgnoreExtraElements]
public class AppSvcResult : BaseResult
{
}

[BsonCollection("extension_appservicelites")]
public class AppSvcLite : ResourceBase<AppSvcSpec, AppSvcResult>
{
    public override string GetTicketOriginType() => "AppServiceLite";
    public override string GetTicketOriginSubType() => "app-service-lite";
}

public class AppSvcHooks : DefaultEntityHooks<AppSvcLite>
{
}

public class AppSvcService : ResourceServiceBase<AppSvcLite, AppSvcSpec, AppSvcResult>
{
    public AppSvcService(
        IRepository<AppSvcLite> repository,
        ILogger<AppSvcService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
    }

    // No-provision: this sample showcases the complex FE form, not provisioning.
    protected override bool IsProvisioningNeeded(AppSvcLite entity) => false;
}
