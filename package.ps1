#download latest jquery
param(
    [Switch]$DebugBuild,
    [Switch]$KeepFiles
)

function New-Extension {
    param (
        [Parameter(Mandatory=$true)][String]$platform,
        [Parameter(Mandatory=$true)][String]$extension,
        [Parameter(Mandatory=$true)][Boolean]$DebugBuild,
        [Parameter(Mandatory=$true)][Boolean]$KeepFiles
    )

    #make ${platform}
    New-Item -ItemType "directory" -Path "${platform}_build" 2>$null >$null
    Copy-Item -Path "common\*" -Destination "${platform}_build" -Recurse -Force
    Copy-Item -Path "${platform}\*" -Destination "${platform}_build" -Recurse -Force

    Set-Location -Path "${platform}_build"
    $AddonNameZip="..\anesidora_${platform}.zip"
    $AddonName="..\anesidora_${platform}.${extension}"
    if (!($DebugBuild)) {
        (Get-Content "manifest.json").replace("-debug-", "-") | Set-Content "manifest.json"
        $AddonNameZip="..\anesidora_debug_${platform}.zip"
        $AddonName="..\anesidora_debug_${platform}.${extension}"
    }

    Remove-Item -Path "${AddonName}" 2>$null
    Compress-Archive -Path "*" -DestinationPath "${AddonNameZip}" -Force 2>$null >$null
    Move-Item -Path "${AddonNameZip}" -Destination "${AddonName}"
    Set-Location -Path "..\"

    if (!($KeepFiles)) {
        Remove-Item -Recurse -Force -Path "${platform}_build"
    }

}

New-Item -ItemType "directory" -Path common\js\jquery 2>$null

Invoke-WebRequest -Uri http://code.jquery.com/jquery-3.3.1.min.js -OutFile common\js\jquery\jquery-3.3.1.min.js
Invoke-WebRequest -Uri http://code.jquery.com/ui/1.12.1/jquery-ui.min.js -OutFile common\js\jquery\jquery-ui.min.js

New-Extension -platform "firefox" -extension "xpi" -DebugBuild $DebugBuild -KeepFiles $KeepFiles
New-Extension -platform "chrome" -extension "zip" -DebugBuild $DebugBuild -KeepFiles $KeepFiles
