using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.PasswordGenerator;

// WORKER mode, pure-compute flavour — "provisioning" is an in-process generation, not a cloud object.
// With no skill mapping the service returns Worker from NoSkillsFallbackMode; the background
// PasswordGeneratorWorker generates the password and rates its strength into the Result. Nothing durable
// is created outside Mongo, so the worker needs no scope and its delete/drift seams are no-ops.
// See reference/04-hooks.md (worker seams + SaveProgressAsync) and reference/11-deprovisioning.md.

[BsonIgnoreExtraElements]
public class PasswordGeneratorSpec : BaseSpec
{
    /// <summary>Human-readable name for this password entry (e.g. "GitHub Token").</summary>
    public string? Label { get; set; }

    /// <summary>Number of characters to generate. Defaults to 16 when unset.</summary>
    public int? Length { get; set; }

    /// <summary>Include special characters (!@#$%…). Defaults to true when unset.</summary>
    public bool? IncludeSymbols { get; set; }
}

[BsonIgnoreExtraElements]
public class PasswordGeneratorResult : BaseResult
{
    /// <summary>Echo of the label the password was generated for.</summary>
    public string? Label { get; set; }

    /// <summary>The generated password. Masked behind a reveal toggle in the UI.</summary>
    public string? Password { get; set; }

    /// <summary>Character count of the generated password.</summary>
    public int PasswordLength { get; set; }

    /// <summary>Weak / Medium / Strong, rated from the password's entropy.</summary>
    public string? Strength { get; set; }

    /// <summary>Whether special characters were part of the character set.</summary>
    public bool IncludesSymbols { get; set; }

    /// <summary>UTC timestamp of generation.</summary>
    public DateTime? GeneratedAt { get; set; }
}

[BsonCollection("extension_passwordgenerator")]
public class PasswordGenerator : ResourceBase<PasswordGeneratorSpec, PasswordGeneratorResult>
{
    public override string GetTicketOriginType() => "PasswordGenerator";

    public override string GetTicketOriginSubType() => "password-generator";
}

public class PasswordGeneratorHooks : DefaultEntityHooks<PasswordGenerator>
{
}

/// <summary>
/// No skill mapping → returning <see cref="ProvisioningMode.Worker"/> routes create/update through the
/// background <see cref="PasswordGeneratorWorker"/>, which holds the generation logic.
/// </summary>
public class PasswordGeneratorService : ResourceServiceBase<PasswordGenerator, PasswordGeneratorSpec, PasswordGeneratorResult>
{
    public PasswordGeneratorService(
        IRepository<PasswordGenerator> repository,
        ILogger<PasswordGeneratorService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
    }

    protected override ProvisioningMode NoSkillsFallbackMode => ProvisioningMode.Worker;
}
