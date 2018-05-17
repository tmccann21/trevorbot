# trevorbot

# credentials.json
Required to login to facebook service and various API's

Example file: 

{
    "login":
    {
        "email":"--",
        "password":"--"
    },
    "bitly":
    {
        "token":"--"
    },
    "aeris":
    {
        "id":"--",
        "secret":"--"
    }
}

# appstate.json

will be created if it doesn't exist. App uses this to cache login information and avoid facebook rate limiting

# setup
Use NPM to install dependencies in order to run correctly.
