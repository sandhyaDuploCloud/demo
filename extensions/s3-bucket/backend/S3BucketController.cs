using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extensions.S3Bucket;

[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/s3-buckets")]
public class S3BucketsController : ResourcesController<S3Bucket, S3BucketSpec, S3BucketResult>
{
    public S3BucketsController(IEntityService<S3Bucket> service, ILogger<S3BucketsController> logger)
        : base(service, logger)
    {
    }
}
