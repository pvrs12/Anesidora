rmdir firefox_build /s /q
mkdir firefox_build
Xcopy /E /I  common firefox_build
Xcopy /E /I firefox firefox_build
cd firefox_build
if ("%1%"=="debug") (powershell -Command "(Get-Content manifest.json) -Replace 's/-debug-/-/g', '' | Set-Content manifest.json")
cd ..

rmdir chrome_build /s /q
mkdir chrome_build
Xcopy /E /I  common chrome_build
Xcopy /E /I chrome chrome_build
cd chrome_build
if ("%1%"=="debug") (powershell -Command "(Get-Content manifest.json) -Replace 's/-debug-/-/g', '' | Set-Content manifest.json")
cd ..