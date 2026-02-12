param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"
$Issues = @()

function Add-Issue {
    param(
        [string]$File,
        [int]$Line,
        [string]$Reason,
        [string]$Snippet
    )
    $script:Issues += [PSCustomObject]@{
        File    = $File
        Line    = $Line
        Reason  = $Reason
        Snippet = $Snippet
    }
}

Push-Location $Root
try {
    $diff = git diff --cached -U0 -- *.html *.js *.css 2>$null
    if (-not $diff) {
        Write-Host "Guard OK: no staged changes to validate." -ForegroundColor Green
        exit 0
    }

    $mojibakeRegex = [regex]"[\u00C3\u00C2\u00E2\uFFFD]"
    $oldAddressRegex = [regex]"Rua 6, 3212|Doutor Eloi Chaves|Vila Oper|13504-186|Av\. 40, 935|Santana, Rio Claro/SP"

    $currentFile = ""
    $currentNewLine = 0

    foreach ($rawLine in ($diff -split "`n")) {
        $line = $rawLine.TrimEnd("`r")

        if ($line.StartsWith("+++ b/")) {
            $currentFile = $line.Substring(6)
            continue
        }

        if ($line -match "^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@") {
            $currentNewLine = [int]$Matches[1]
            continue
        }

        if ($line.StartsWith("+") -and -not $line.StartsWith("+++")) {
            $added = $line.Substring(1)

            if ($mojibakeRegex.IsMatch($added)) {
                Add-Issue -File $currentFile -Line $currentNewLine -Reason "Broken text marker introduced" -Snippet $added
            }

            if ($oldAddressRegex.IsMatch($added)) {
                Add-Issue -File $currentFile -Line $currentNewLine -Reason "Old address introduced" -Snippet $added
            }

            $currentNewLine += 1
            continue
        }

        if ($line.StartsWith(" ")) {
            $currentNewLine += 1
        }
    }

    # Ensure key guardrails exist when these files are staged
    $stagedFiles = (git diff --cached --name-only) -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }

    if ($stagedFiles -contains "styles.css") {
        $stylesRaw = Get-Content -Raw -Path "styles.css"
        $hasMobileLock = ($stylesRaw -match "@media\s*\(max-width:\s*820px\)") -and ($stylesRaw -match "overflow-x:\s*hidden\s*!important")
        if (-not $hasMobileLock) {
            Add-Issue -File "styles.css" -Line 0 -Reason "Mobile anti-side-scroll lock missing" -Snippet ""
        }
    }

    if ($stagedFiles -contains "script.js") {
        $jsRaw = Get-Content -Raw -Path "script.js"
        if ($jsRaw -notmatch "Av M15 N784, Rio Claro, Sao Paulo 13505320") {
            Add-Issue -File "script.js" -Line 0 -Reason "Canonical address missing in script.js" -Snippet ""
        }
    }

    if ($Issues.Count -gt 0) {
        Write-Host ""
        Write-Host "GUARD FAILED - PUBLISH BLOCKED" -ForegroundColor Red
        Write-Host ""

        foreach ($issue in $Issues) {
            if ($issue.Line -gt 0) {
                Write-Host ("- {0}:{1} -> {2}" -f $issue.File, $issue.Line, $issue.Reason) -ForegroundColor Yellow
            } else {
                Write-Host ("- {0} -> {1}" -f $issue.File, $issue.Reason) -ForegroundColor Yellow
            }
            if ($issue.Snippet) {
                Write-Host ("  + {0}" -f $issue.Snippet) -ForegroundColor DarkYellow
            }
        }

        exit 1
    }

    Write-Host "Guard OK: no new broken text/address regressions detected." -ForegroundColor Green
    exit 0
}
finally {
    Pop-Location
}
