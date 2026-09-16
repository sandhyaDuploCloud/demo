using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Duplo.Extensions.S3Bucket;

public class S3BucketSpec : BaseSpec
{
    public string? BucketName { get; set; }
    public string? Region { get; set; }
    public bool PublicAccess { get; set; } = false;
}

public class S3BucketResult : BaseResult
{
    public string? BucketName { get; set; }
    public string? BucketArn { get; set; }
    public string? Region { get; set; }
    public string? PublicAccess { get; set; }
    public string? DateCreated { get; set; }
}

[BsonCollection("extension_s3bucket")]
public class S3Bucket : ResourceBase<S3BucketSpec, S3BucketResult>
{
    public override string GetTicketOriginType() => "S3Bucket";
    public override string GetTicketOriginSubType() => "s3-bucket";
}

public class S3BucketHooks : DefaultEntityHooks<S3Bucket>
{
}

public class S3BucketService : ResourceServiceBase<S3Bucket, S3BucketSpec, S3BucketResult>
{
    public S3BucketService(
        IRepository<S3Bucket> repository,
        ILogger<S3BucketService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
    }
}
