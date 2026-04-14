Login Security
=====================

Password and login security is a large and reasonable concern. The safety and security of passwords is important, and there is no reason to implicitly "trust" an application. The goal of this document is to earn your trust.

Through the whole of Anesidora, your login credentials are only used in a few locations and are only sent to Pandora directly over a secured (HTTPS) connection. In order to demonstrate that this is the truth, I've linked all locations within Anesidora where either your username or password are used.
Special care has been used so that these functions are as readable as possible.

## [anesidora.js:userLogin](https://github.com/pvrs12/Anesidora/blob/master/common/js/anesidora.js#L302)
This function performs the actual login to Pandora. This verifies that the username and password have been set before proceeding. Then it places the credentials within an object before passing it on to `sendRequest`. `sendRequest` transmits the credentials over a secured (HTTPS) connection to Pandora.

## [anesidora.js:userLogout](https://github.com/pvrs12/Anesidora/blob/master/common/js/anesidora.js#L409)
This function resets the player and removes the username and password from browser storage. It's called when you hit "logout".

## [anesidora.js:tryExistingLogin](https://github.com/pvrs12/Anesidora/blob/master/common/js/anesidora.js#L789)
This runs on browser start. It checks to see if there is any login in browser storage, and if so, logs in automatically. Otherwise it does nothing.

## [newpopup.js](https://github.com/pvrs12/Anesidora/blob/master/common/js/newpopup.js#748)
This is called when the "Login" button is clicked. It retrieves the values from the username and password inputs. Then it passes it to the above "userLogin" function. There's some extra code to update the login screen to reflect a login success or failure.

## [newpopup.js](https://github.com/pvrs12/Anesidora/blob/master/common/js/newpopup.js#714)
This reads the current email from storage. It then presents that email in the "account" view.


There is mention of "email" in `mp3tag.js`. This is in reference to the [id3v2.4.0 "4.17 Popularimeter" tag](https://id3.org/id3v2.4.0-frames#:~:text=xx%20(xx%20...)-,4.17.%20%20%20Popularimeter,-The%20purpose%20of). While the Popularimeter tag is supported by our chosen mp3 library, we do not write the Popularimeter tag to downloaded mp3s.

If there are any locations within the code which are not listed above, this is an oversight on my part. If you [Open an Issue](https://github.com/pvrs12/Anesidora/issues/new) I'll work to add it to this list.