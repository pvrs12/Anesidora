Anesidora
=========

Anesidora - unofficial Pandora extension for Firefox and Chrome.

<h3><a href="https://addons.mozilla.org/en-US/firefox/addon/anesidora/">Download/Install Firefox</a></h3>

<br>
<br>

Developing:
------------
In order to develop this for Firefox and Chrome, the majority of the code which you will modify is located in `common/`. Within the `firefox/` and `chrome/` directories are the browser specific functions. I've attempted to keep the majority of the code as browser agnostic as possible. To test changes that you've made locally, you'll want to run `package.bash debug` to generate the "debug" versions of the extension for Firefox and Chrome (different colored icon). For Chrome, you'll then need to extract the zip file before you can load/test it within Chrome. Firefox will work with just the XPI file.

Additionally, you'll find numerous code stylings within the source files. This is because this project has seen many hands over the years. I'm gradually working to consolidate, however that isn't a top priority. 

Finally, this documentation is amazing for all API level calls which need to be made https://6xq.net/pandora-apidoc/

History:
-----------
The original developer has abandoned the project, therefore this GitHub repository is intended to give a second life to Anesidora project by collaborating with other developers.

This repository was originally imported from here:
https://code.google.com/p/pandora-extension/

As mentioned above this project was abandoned by the original authors (of anesidora.tk). It was then exported to Github from code.google.com (without the GPLv2 Lisence) I have forked that repo to generate a Firefox version of the addon. I have also included the orignial GPLv2 License from the project

I've created a Firefox version and continued to update the Chrome version. The UI should be much more responsive now and aims to be flexible to varying sizes (specified on the options page)
