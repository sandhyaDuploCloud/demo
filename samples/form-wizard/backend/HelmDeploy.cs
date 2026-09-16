using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.HelmDeploy;

// MULTI-STEP WIZARD form sample. The interesting part is the FRONTEND (a 4-step wizard with a
// Next/Previous footer, matching the design mock) — the backend is a plain No-provision resource whose
// Spec just persists what the wizard collects. Fields are grouped here by the wizard step that fills them.

[BsonIgnoreExtraElements]
public class HelmDeploySpec : BaseSpec
{
    // Step 1 — Products
    public List<string> Products { get; set; } = new();

    // Step 2 — Deployment
    public string? DeploymentName { get; set; }
    public string? Namespace { get; set; }
    public string? ReleaseName { get; set; }
    public string? Timeout { get; set; }          // e.g. "15 minutes"
    public bool AutoRollback { get; set; }         // --atomic

    // Step 3 — Chart Registry
    public string? ChartRegistryUrl { get; set; }
    public string? ChartName { get; set; }
    public string? ChartVersion { get; set; }

    // Step 4 — Services & Values
    public string? ServiceType { get; set; }       // ClusterIP / NodePort / LoadBalancer
    public string? Values { get; set; }            // free-form values.yaml overrides
}

[BsonIgnoreExtraElements]
public class HelmDeployResult : BaseResult
{
}

[BsonCollection("extension_helmdeployments")]
public class HelmDeploy : ResourceBase<HelmDeploySpec, HelmDeployResult>
{
    public override string GetTicketOriginType() => "HelmDeployment";
    public override string GetTicketOriginSubType() => "helm-deployment";
}

public class HelmDeployHooks : DefaultEntityHooks<HelmDeploy>
{
}

public class HelmDeployService : ResourceServiceBase<HelmDeploy, HelmDeploySpec, HelmDeployResult>
{
    public HelmDeployService(
        IRepository<HelmDeploy> repository,
        ILogger<HelmDeployService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
    }

    // No-provision: create completes immediately with no ticket. This sample is about the wizard UI, not
    // provisioning — the collected Spec is simply persisted.
    protected override bool IsProvisioningNeeded(HelmDeploy entity) => false;
}
