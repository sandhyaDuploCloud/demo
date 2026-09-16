using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.PlanDemo;

/// <summary>Workspace-scoped REST controller for the no-provision / on-demand Plan demo.</summary>
[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/plandemos")]
public class PlanDemosController : ResourcesController<PlanDemo, PlanSpec, PlanResult>
{
    public PlanDemosController(IEntityService<PlanDemo> service, ILogger<PlanDemosController> logger)
        : base(service, logger)
    {
    }
}
