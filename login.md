Login Security
=====================

Password and login security is a large and reasonable concern. The safety and security of passwords is important, and there is no reason to implicitly "trust" an application. The goal of this document is to earn your trust.

Through the whole of Anesidora, your login credentials are only used in a few locations and are only sent to Pandora directly over a secured (HTTPS) connection. In order to demonstrate that this is the truth, I've linked all locations within Anesidora where either your username or password are utilized.

## [anesidora.js:userLogin](https://github.com/pvrs12/Anesidora/blob/master/common/js/anesidora.js#L137)
This function performs the actual login to Pandora. This verifies that the username and password have been set before proceeding. Then it places the credentials within an object before passing it on to `sendRequest`. `sendRequest` transmits the credentials over a secured (HTTPS) connection to Pandora.

## [anesidora.js:partnerLogin](https://github.com/pvrs12/Anesidora/blob/master/common/js/anesidora.js#L168)
This function performs a "pre-login" to Pandora. It simply verfies that the username and password have been entered before proceeding.

## [background.js](https://github.com/pvrs12/Anesidora/blob/master/common/js/background.js#119)
This is another check that the username and password have been set within local storage

## [popup.js](https://github.com/pvrs12/Anesidora/blob/master/common/js/popup.js#336)
This is called when the "Login" button is clicked. It retrieves the values from the username and password inputs. It then places them into local storage for retrieval later. Finally, it begins the login process

## [popup.js](https://github.com/pvrs12/Anesidora/blob/master/common/js/popup.js#363)
This is called whenever the popup shows itself (by clicking on the Anesidora icon). This set of checks simply verifies that the username and password were entered in the past and the user is logged into Pandora. 

## [options.js](https://github.com/pvrs12/Anesidora/blob/master/common/js/options.js#92)
This is called whenever the "Logout" button is clicked from the Options page. It clears the username and password from storage. 

If there are any locations within the code which are not listed above, this is an oversight on my part. If you [Open an Issue](https://github.com/pvrs12/Anesidora/issues/new) I'll work to add it to this list.