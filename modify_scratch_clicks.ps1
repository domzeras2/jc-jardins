$ErrorActionPreference = 'Stop'

function ConvertTo-HashtableRecursive {
    param([Parameter(ValueFromPipeline = $true)] $InputObject)

    if ($null -eq $InputObject) {
        return $null
    }

    if ($InputObject -is [System.Collections.IDictionary]) {
        $hash = [ordered]@{}
        foreach ($key in $InputObject.Keys) {
            $hash[$key] = ConvertTo-HashtableRecursive $InputObject[$key]
        }
        return $hash
    }

    if ($InputObject -is [System.Collections.IEnumerable] -and $InputObject -isnot [string]) {
        $items = @()
        foreach ($item in $InputObject) {
            $items += ,(ConvertTo-HashtableRecursive $item)
        }
        return $items
    }

    if ($InputObject -is [pscustomobject]) {
        $hash = [ordered]@{}
        foreach ($prop in $InputObject.PSObject.Properties) {
            $hash[$prop.Name] = ConvertTo-HashtableRecursive $prop.Value
        }
        return $hash
    }

    return $InputObject
}

function New-BlockId {
    return ([guid]::NewGuid().ToString('N').Substring(0, 20))
}

$sourceSb3 = 'C:\Users\gabri\Downloads\Projeto Scratch (1) (1) (1) (1) (1).sb3'
$outputSb3 = 'C:\Users\gabri\Documents\New project\Projeto Scratch alterado clicks colorido.sb3'
$tempRoot = Join-Path $PSScriptRoot 'scratch_build'

if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $tempRoot | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($sourceSb3, $tempRoot)

$projectPath = Join-Path $tempRoot 'project.json'
$projectRaw = Get-Content -LiteralPath $projectPath -Raw
$project = ConvertTo-HashtableRecursive (ConvertFrom-Json $projectRaw)

$stage = $project.targets | Where-Object { $_.isStage }
$sprite1 = $project.targets | Where-Object { $_.name -eq 'Sprite1' }
$button2 = $project.targets | Where-Object { $_.name -eq 'Button2' }
$button3 = $project.targets | Where-Object { $_.name -eq 'Button3' }
$button4 = $project.targets | Where-Object { $_.name -eq 'Button4' }

$broadcastGreenId = 'clicksGreenBroadcast'
$broadcastRedId = 'clicksRedBroadcast'
$stage.broadcasts[$broadcastGreenId] = 'clicks_green'
$stage.broadcasts[$broadcastRedId] = 'clicks_red'

$sprite1ChangeBlockId = 'YP.EVaEaJpfisXqu`%f?'
$sprite1BroadcastBlockId = New-BlockId
$sprite1BroadcastMenuId = New-BlockId
$sprite1.blocks[$sprite1BroadcastBlockId] = [ordered]@{
    opcode = 'event_broadcast'
    next = $null
    parent = 'R@?!fN(w!X[e8E)7CD~I'
    inputs = [ordered]@{
        BROADCAST_INPUT = @(
            1,
            $sprite1BroadcastMenuId
        )
    }
    fields = [ordered]@{}
    shadow = $false
    topLevel = $false
}
$sprite1.blocks[$sprite1BroadcastMenuId] = [ordered]@{
    opcode = 'event_broadcast_menu'
    next = $null
    parent = $sprite1BroadcastBlockId
    inputs = [ordered]@{}
    fields = [ordered]@{
        BROADCAST_OPTION = @('clicks_green', $broadcastGreenId)
    }
    shadow = $true
    topLevel = $false
}
$sprite1.blocks[$sprite1ChangeBlockId].next = $sprite1BroadcastBlockId

foreach ($button in @($button2, $button3, $button4)) {
    $clickBlockId = $null
    foreach ($entry in $button.blocks.GetEnumerator()) {
        if ($entry.Value.opcode -eq 'event_whenthisspriteclicked') {
            $clickBlockId = $entry.Key
            break
        }
    }
    if (-not $clickBlockId) {
        throw "Nao foi possivel localizar o bloco de clique em $($button.name)."
    }
    $firstNext = $button.blocks[$clickBlockId].next
    $broadcastBlockId = New-BlockId
    $broadcastMenuId = New-BlockId
    $button.blocks[$broadcastBlockId] = [ordered]@{
        opcode = 'event_broadcast'
        next = $firstNext
        parent = $clickBlockId
        inputs = [ordered]@{
            BROADCAST_INPUT = @(
                1,
                $broadcastMenuId
            )
        }
        fields = [ordered]@{}
        shadow = $false
        topLevel = $false
    }
    $button.blocks[$broadcastMenuId] = [ordered]@{
        opcode = 'event_broadcast_menu'
        next = $null
        parent = $broadcastBlockId
        inputs = [ordered]@{}
        fields = [ordered]@{
            BROADCAST_OPTION = @('clicks_red', $broadcastRedId)
        }
        shadow = $true
        topLevel = $false
    }
    $button.blocks[$firstNext].parent = $broadcastBlockId
    $button.blocks[$clickBlockId].next = $broadcastBlockId
}

$greenSvgContent = @'
<svg xmlns="http://www.w3.org/2000/svg" width="146" height="34" viewBox="0 0 146 34">
  <rect x="1.5" y="1.5" width="143" height="31" rx="11" fill="#2FAF51" fill-opacity="0.35" stroke="#1F7A36" stroke-width="3"/>
</svg>
'@
$redSvgContent = @'
<svg xmlns="http://www.w3.org/2000/svg" width="146" height="34" viewBox="0 0 146 34">
  <rect x="1.5" y="1.5" width="143" height="31" rx="11" fill="#D84B4B" fill-opacity="0.35" stroke="#A42B2B" stroke-width="3"/>
</svg>
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$md5 = [System.Security.Cryptography.MD5]::Create()
try {
    $greenBytes = $utf8NoBom.GetBytes($greenSvgContent)
    $redBytes = $utf8NoBom.GetBytes($redSvgContent)
    $greenHash = -join ($md5.ComputeHash($greenBytes) | ForEach-Object { $_.ToString('x2') })
    $redHash = -join ($md5.ComputeHash($redBytes) | ForEach-Object { $_.ToString('x2') })
}
finally {
    $md5.Dispose()
}

$greenSvgName = "$greenHash.svg"
$redSvgName = "$redHash.svg"
[System.IO.File]::WriteAllBytes((Join-Path $tempRoot $greenSvgName), $greenBytes)
[System.IO.File]::WriteAllBytes((Join-Path $tempRoot $redSvgName), $redBytes)

$statusSprite = [ordered]@{
    isStage = $false
    name = 'ClicksStatus'
    variables = [ordered]@{}
    lists = [ordered]@{}
    broadcasts = [ordered]@{}
    blocks = [ordered]@{}
    comments = [ordered]@{}
    currentCostume = 0
    costumes = @(
        [ordered]@{
            name = 'green'
            bitmapResolution = 1
            dataFormat = 'svg'
            assetId = $greenHash
            md5ext = $greenSvgName
            rotationCenterX = 73
            rotationCenterY = 17
        },
        [ordered]@{
            name = 'red'
            bitmapResolution = 1
            dataFormat = 'svg'
            assetId = $redHash
            md5ext = $redSvgName
            rotationCenterX = 73
            rotationCenterY = 17
        }
    )
    sounds = @()
    volume = 100
    layerOrder = 8
    visible = $false
    x = -162
    y = 158
    size = 100
    direction = 90
    draggable = $false
    rotationStyle = 'all around'
}

function Add-BackdropHideScript {
    param(
        [hashtable]$Sprite,
        [string]$BackdropName,
        [int]$X,
        [int]$Y
    )

    $eventId = New-BlockId
    $hideId = New-BlockId
    $Sprite.blocks[$eventId] = [ordered]@{
        opcode = 'event_whenbackdropswitchesto'
        next = $hideId
        parent = $null
        inputs = [ordered]@{}
        fields = [ordered]@{
            BACKDROP = @($BackdropName, $null)
        }
        shadow = $false
        topLevel = $true
        x = $X
        y = $Y
    }
    $Sprite.blocks[$hideId] = [ordered]@{
        opcode = 'looks_hide'
        next = $null
        parent = $eventId
        inputs = [ordered]@{}
        fields = [ordered]@{}
        shadow = $false
        topLevel = $false
    }
}

Add-BackdropHideScript -Sprite $statusSprite -BackdropName 'backdrop1' -X 22 -Y 28
Add-BackdropHideScript -Sprite $statusSprite -BackdropName 'backdrop2' -X 22 -Y 118
Add-BackdropHideScript -Sprite $statusSprite -BackdropName 'backdrop3' -X 22 -Y 208
Add-BackdropHideScript -Sprite $statusSprite -BackdropName 'backdrop4' -X 22 -Y 298
Add-BackdropHideScript -Sprite $statusSprite -BackdropName 'Stripes' -X 22 -Y 388

$greenRecvId = New-BlockId
$greenSwitchId = New-BlockId
$greenShowId = New-BlockId
$greenCostumeShadowId = New-BlockId
$statusSprite.blocks[$greenRecvId] = [ordered]@{
    opcode = 'event_whenbroadcastreceived'
    next = $greenSwitchId
    parent = $null
    inputs = [ordered]@{}
    fields = [ordered]@{
        BROADCAST_OPTION = @('clicks_green', $broadcastGreenId)
    }
    shadow = $false
    topLevel = $true
    x = 236
    y = 118
}
$statusSprite.blocks[$greenSwitchId] = [ordered]@{
    opcode = 'looks_switchcostumeto'
    next = $greenShowId
    parent = $greenRecvId
    inputs = [ordered]@{
        COSTUME = @(
            1,
            $greenCostumeShadowId
        )
    }
    fields = [ordered]@{}
    shadow = $false
    topLevel = $false
}
$statusSprite.blocks[$greenCostumeShadowId] = [ordered]@{
    opcode = 'looks_costume'
    next = $null
    parent = $greenSwitchId
    inputs = [ordered]@{}
    fields = [ordered]@{
        COSTUME = @('green', $null)
    }
    shadow = $true
    topLevel = $false
}
$statusSprite.blocks[$greenShowId] = [ordered]@{
    opcode = 'looks_show'
    next = $null
    parent = $greenSwitchId
    inputs = [ordered]@{}
    fields = [ordered]@{}
    shadow = $false
    topLevel = $false
}

$redRecvId = New-BlockId
$redSwitchId = New-BlockId
$redShowId = New-BlockId
$redCostumeShadowId = New-BlockId
$statusSprite.blocks[$redRecvId] = [ordered]@{
    opcode = 'event_whenbroadcastreceived'
    next = $redSwitchId
    parent = $null
    inputs = [ordered]@{}
    fields = [ordered]@{
        BROADCAST_OPTION = @('clicks_red', $broadcastRedId)
    }
    shadow = $false
    topLevel = $true
    x = 236
    y = 238
}
$statusSprite.blocks[$redSwitchId] = [ordered]@{
    opcode = 'looks_switchcostumeto'
    next = $redShowId
    parent = $redRecvId
    inputs = [ordered]@{
        COSTUME = @(
            1,
            $redCostumeShadowId
        )
    }
    fields = [ordered]@{}
    shadow = $false
    topLevel = $false
}
$statusSprite.blocks[$redCostumeShadowId] = [ordered]@{
    opcode = 'looks_costume'
    next = $null
    parent = $redSwitchId
    inputs = [ordered]@{}
    fields = [ordered]@{
        COSTUME = @('red', $null)
    }
    shadow = $true
    topLevel = $false
}
$statusSprite.blocks[$redShowId] = [ordered]@{
    opcode = 'looks_show'
    next = $null
    parent = $redSwitchId
    inputs = [ordered]@{}
    fields = [ordered]@{}
    shadow = $false
    topLevel = $false
}

$project.targets += $statusSprite

$projectJson = $project | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($projectPath, $projectJson, $utf8NoBom)

if (Test-Path -LiteralPath $outputSb3) {
    Remove-Item -LiteralPath $outputSb3 -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $outputSb3)

Write-Output "Arquivo gerado: $outputSb3"
