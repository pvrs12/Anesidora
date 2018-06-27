Certificate Errors
====================

It appears that the HTTPS certificate for `tuner.pandora.com` has been [distrusted by Google and Mozilla](https://blog.qualys.com/ssllabs/2017/09/26/google-and-mozilla-deprecating-existing-symantec-certificates). As a result, it is not possible to immediately connect to `tuner.pandora.com`.

## How to fix

* Navigate to https://tuner.pandora.com
* Notice that you are prevented from proceeding and the red warning in the address bar
* Click `Advanced`
    * If using Firefox, Click `Add Exception...` then click `Confirm Security Exception`
    * If using Chrome, Click `Proceed to tuner.pandora.com (unsafe)`
* You should see a page which says `Forbidden`. This is fine
* Anesidora should now work