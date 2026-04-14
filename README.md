Anesidora
=========

Anesidora - unofficial Pandora extension for Firefox and Chrome.

<h3><a href="https://addons.mozilla.org/firefox/addon/anesidora/">Download/Install Firefox</a></h3>

Chrome Installation:
-----
Pandora removed us from the Chrome Web Store, so currently the only option to install on Chrome is with the **Nightly build**:
1. Download the [**Chrome Nightly build**](https://nightly.link/pvrs12/Anesidora/workflows/package.yaml/master/anesidora-chrome.zip) and extract the ZIP file.
2. Enable Manifest v2 extensions by following [these instructions](https://superuser.com/questions/1917854/is-there-any-way-to-still-use-manifest-v2-extensions-in-google-chrome-139#:~:text=You%20can%20create,features%3DExtensionManifestV2Unsupported%2CExtensionManifestV2Disabled)
3. Go to `chrome://extensions/` and toggle `Developer mode` in the top right.
4. Click `Load unpacked` in the top left and select the directory in which you extracted the ZIP file.

Firefox Installation:
------
We're still on Firefox's addons store, so you can just [**install it from AMO**](https://addons.mozilla.org/firefox/addon/anesidora/).
Alternatively, you can install the **Nightly build**:
1. Download the [Nightly zip from here](https://nightly.link/pvrs12/Anesidora/workflows/package.yaml/master/anesidora-firefox.zip)
2. Go to `about:debugging#/runtime/this-firefox`
3. Click `Load Temporary Add-on...`
4. Select the downloaded `.zip` file from step 1.

Developing:
------------
In order to develop this for Firefox and Chrome, the majority of the code which you will modify is located in `common/`. Within the `firefox/` and `chrome/` directories are the browser specific functions. I've attempted to keep the majority of the code as browser agnostic as possible. To test changes that you've made locally, you'll want to run `package.bash debug` to generate the "debug" versions of the extension for Firefox and Chrome (different colored icon). For Chrome, you'll then need to extract the zip file before you can load/test it within Chrome. Firefox will work with just the XPI file.

Additionally, you'll find numerous code stylings within the source files. This is because this project has seen many hands over the years. I'm gradually working to consolidate, however that isn't a top priority. 

Finally, [this unofficial documentation](https://6xq.net/pandora-apidoc/) is an amazing reference for all API calls which need to be made.

History:
-----------
The original developers (of anesidora.tk) abandoned the project.

This repository was originally imported from here:
https://code.google.com/p/pandora-extension/

It was then exported to Github from code.google.com (without the GPLv2 license).
@pvrs12 forked the repo to generate a Firefox version, included the original GPLv2 license, and maintained the project until 2026.
@hucario has maintained the project since the v3 release.
