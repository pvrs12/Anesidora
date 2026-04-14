param(
    [Switch]$DebugBuild,
    [Switch]$KeepFiles
)

function Make-Extension {
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
    $AddonName="..\anesidora_${platform}.${extension}"
    if (!($DebugBuild)) {
        (Get-Content "manifest.json").replace("-debug-", "-") | Set-Content "manifest.json"
        $AddonName="..\anesidora_debug_${platform}.${extension}"
    }

    Remove-Item -Path "${AddonName}" 2>$null
    Compress-Archive -Path "*" -DestinationPath "${AddonName}" -Force 2>$null
    Set-Location -Path "..\"

    if (!($KeepFiles)) {
        Remove-Item -Recurse -Force -Path "${platform}_build"
    }

}

Make-Extension -platform "firefox" -extension "xpi" -DebugBuild $DebugBuild -KeepFiles $KeepFiles
Make-Extension -platform "chrome" -extension "zip" -DebugBuild $DebugBuild -KeepFiles $KeepFiles
