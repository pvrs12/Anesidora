Remove-Item -Force -Recurse firefox_build 2>$null
Remove-Item -Force -Recurse chrome_build 2>$null

Remove-Item -Force anesidora_firefox.xpi 2>$null
Remove-Item -Force anesidora_chrome.zip 2>$null

Remove-Item -Force anesidora_debug_firefox.xpi 2>$null
Remove-Item -Force anesidora_debug_chrome.zip 2>$null