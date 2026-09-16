using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.PlanDemo;

// NO-PROVISION / ON-DEMAND sample — the resource persists but does NOT auto-provision on create. Returning
// false from IsProvisioningNeeded makes create complete immediately with no ticket. A provisioning run is
// triggered later, on demand, via POST .../{id}/ticket (exposed by the base controller). See reference/04-hooks.

[BsonIgnoreExtraElements]
public class PlanSpec : BaseSpec
{
    public string? Description { get; set; }
}

[BsonIgnoreExtraElements]
public class PlanResult : BaseResult
{
}

[BsonCollection("extension_plandemos")]
public class PlanDemo : ResourceBase<PlanSpec, PlanResult>
{
    public override string GetTicketOriginType() => "PlanDemo";
    public override string GetTicketOriginSubType() => "plan-demo";
}

public class PlanHooks : DefaultEntityHooks<PlanDemo>
{
}

public class PlanService : ResourceServiceBase<PlanDemo, PlanSpec, PlanResult>
{
    public PlanService(
        IRepository<PlanDemo> repository,
        ILogger<PlanService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
    }

    // Create completes immediately; no provisioning ticket is fired. An on-demand ticket can still be
    // created later via POST .../{id}/ticket (which runs the mapped skill, if any).
    protected override bool IsProvisioningNeeded(PlanDemo entity) => false;
}
