using System.Security.Cryptography;
using Duplo.Ai.DataManagement.Services.Workers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace Duplo.Extension.PasswordGenerator;

/// <summary>
/// Background worker that "provisions" a <see cref="PasswordGenerator"/> by generating a cryptographically
/// random password in process. The base <see cref="ResourceWorkerBase{TResource,TSpec,TResult}"/> drives the
/// tick loop, status transitions and retries; this class supplies the generation. Because nothing is created
/// outside this resource's own Mongo document:
///   * <see cref="ApplyAsync"/> mutates <c>entity.Result</c> and calls <see cref="SaveProgressAsync"/> to
///     persist it (the base also re-persists Result on terminal success and flips Status to Complete);
///   * the delete/drift seams are no-ops and <see cref="WaitForDeletionAsync"/> returns true immediately.
/// </summary>
public class PasswordGeneratorWorker : ResourceWorkerBase<PasswordGenerator, PasswordGeneratorSpec, PasswordGeneratorResult>
{
    private const int DefaultLength = 16;
    private const int MinLength = 8;
    private const int MaxLength = 128;

    private const string Lowercase = "abcdefghijklmnopqrstuvwxyz";
    private const string Uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private const string Digits = "0123456789";
    private const string Symbols = "!@#$%^&*()-_=+[]{};:,.?";

    public PasswordGeneratorWorker(IServiceScopeFactory scopeFactory, ILogger<PasswordGeneratorWorker> logger, IConfiguration? config = null)
        : base(scopeFactory, logger, config)
    {
    }

    // Generate in process. Mutate entity.Result, then SaveProgressAsync persists it to the DB.
    protected override async Task ApplyAsync(PasswordGenerator e, IServiceProvider scope, CancellationToken ct)
    {
        var length = Math.Clamp(e.Spec?.Length ?? DefaultLength, MinLength, MaxLength);
        var includeSymbols = e.Spec?.IncludeSymbols ?? true;

        var password = Generate(length, includeSymbols);

        e.Result ??= new PasswordGeneratorResult();
        e.Result.Label = e.Spec?.Label;
        e.Result.Password = password;
        e.Result.PasswordLength = password.Length;
        e.Result.IncludesSymbols = includeSymbols;
        e.Result.Strength = RateStrength(length, includeSymbols);
        e.Result.GeneratedAt = DateTime.UtcNow;

        // Never log or surface the password itself — only its shape.
        await SaveProgressAsync(
            scope,
            e,
            $"Generated a {password.Length}-character {e.Result.Strength} password"
                + (includeSymbols ? " (with symbols)" : " (no symbols)"),
            ct);
    }

    /// <summary>
    /// Builds the password from the enabled character classes, guaranteeing at least one character from
    /// each so the result actually satisfies the requested composition, then shuffles.
    /// </summary>
    private static string Generate(int length, bool includeSymbols)
    {
        var classes = includeSymbols
            ? new[] { Lowercase, Uppercase, Digits, Symbols }
            : new[] { Lowercase, Uppercase, Digits };

        var all = string.Concat(classes);
        var chars = new char[length];

        // One guaranteed character per enabled class (length >= MinLength(8) > 4, so these always fit).
        for (var i = 0; i < classes.Length; i++)
        {
            chars[i] = Pick(classes[i]);
        }

        for (var i = classes.Length; i < length; i++)
        {
            chars[i] = Pick(all);
        }

        Shuffle(chars);
        return new string(chars);
    }

    private static char Pick(string set) => set[RandomNumberGenerator.GetInt32(set.Length)];

    /// <summary>Fisher-Yates using the crypto RNG, so the guaranteed characters aren't pinned to the front.</summary>
    private static void Shuffle(char[] chars)
    {
        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
    }

    /// <summary>
    /// Rates the password by entropy (length × log2(alphabet size)): &lt; 60 bits Weak, &lt; 90 bits Medium,
    /// otherwise Strong. Composition is fixed by the generator, so length and the symbol toggle fully
    /// determine the rating.
    /// </summary>
    private static string RateStrength(int length, bool includeSymbols)
    {
        var alphabet = Lowercase.Length + Uppercase.Length + Digits.Length + (includeSymbols ? Symbols.Length : 0);
        var entropyBits = length * Math.Log2(alphabet);

        return entropyBits switch
        {
            < 60 => "Weak",
            < 90 => "Medium",
            _ => "Strong",
        };
    }

    // Nothing external to drift against.
    protected override Task VerifyDriftAsync(PasswordGenerator e, IServiceProvider scope, CancellationToken ct)
        => Task.CompletedTask;

    // Nothing external to delete — the generated password lives only on this resource's own document,
    // which the platform removes when the row is deleted.
    protected override Task DeleteSubResourcesAsync(PasswordGenerator e, IServiceProvider scope, CancellationToken ct)
        => Task.CompletedTask;

    // Nothing to wait for — deletion is instantaneous.
    protected override Task<bool> WaitForDeletionAsync(PasswordGenerator e, IServiceProvider scope, CancellationToken ct)
        => Task.FromResult(true);
}
