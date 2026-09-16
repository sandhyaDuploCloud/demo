using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.HelmDeploy;

/// <summary>Workspace-scoped REST controller for the multi-step-wizard HelmDeployment sample.</summary>
[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/helmdeployments")]
public class HelmDeploysController : ResourcesController<HelmDeploy, HelmDeploySpec, HelmDeployResult>
{
    public HelmDeploysController(IEntityService<HelmDeploy> service, ILogger<HelmDeploysController> logger)
        : base(service, logger)
    {
    }
}
