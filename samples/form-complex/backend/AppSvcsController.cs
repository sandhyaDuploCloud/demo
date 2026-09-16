using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.AppSvc;

/// <summary>Workspace-scoped REST controller for the complex-form AppServiceLite sample.</summary>
[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/appservicelites")]
public class AppSvcsController : ResourcesController<AppSvcLite, AppSvcSpec, AppSvcResult>
{
    public AppSvcsController(IEntityService<AppSvcLite> service, ILogger<AppSvcsController> logger)
        : base(service, logger)
    {
    }
}
