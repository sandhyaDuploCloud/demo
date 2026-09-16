using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.Minio;

/// <summary>
/// Workspace-scoped REST controller. Inheriting <see cref="ResourcesController{T,TSpec,TResult}"/> gives
/// the full CRUD surface + <c>POST {id}/status</c>/<c>results</c> + <c>GET view-template</c>. A GET returns
/// the resource with live pods injected by <c>MinioService.EnrichResultAsync</c>.
/// </summary>
[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/minios")]
public class MiniosController : ResourcesController<Minio, MinioSpec, MinioResult>
{
    public MiniosController(IEntityService<Minio> service, ILogger<MiniosController> logger)
        : base(service, logger)
    {
    }
}
