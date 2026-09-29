using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.PasswordGenerator;

/// <summary>Workspace-scoped REST controller for the worker-backed PasswordGenerator.</summary>
[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/password-generators")]
public class PasswordGeneratorController : ResourcesController<PasswordGenerator, PasswordGeneratorSpec, PasswordGeneratorResult>
{
    public PasswordGeneratorController(IEntityService<PasswordGenerator> service, ILogger<PasswordGeneratorController> logger)
        : base(service, logger)
    {
    }
}
