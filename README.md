jQuery OAuth
============
A $.ajax wrapper for OAuth 2 access and refresh token management for use in a SPA.

# What
This is a library for storing access token client side and use it for $.ajax requests. Secondly, it is a library for
requesting new access tokens upon expiration.

# Dependencies
* [jQuery](https://github.com/jquery/jquery) 1.5+
* [store.js](https://github.com/marcuswestin/store.js) 1.3.17

# Features
* Stores access token client side using store.js for persistence between refreshes
* Adds authorization header to ajax requests
* Adds CSRF token to header requests if provided to protect access token
* When access token expires all 401 requests are buffered and fired after a new access token is generated by using
refresh token server side
* Works with AMD modules

# Installation
Can be installed via bower package
```
bower install --save jquery-oauth
```

... or by cloning the repository
```
git clone git@github.com:esbenp/jquery-oauth.git
```
... or by grabbing a zip of the latest release

# Usage
OAuth has to be implemented server side. If using Laravel, I recommend the great library
[oauth-server-laravel](https://github.com/lucadegasperi/oauth2-server-laravel) by
[Luca Degasperi](https://github.com/lucadegasperi) ([@lucadegasperi](https://twitter.com/lucadegasperi)).

Have an endpoint that issues access tokens. Remember do NOT send ```client_id``` and ```client_secret``` with the request.
Send the request to a proxy endpoint that sends the request to the OAuth endpoint. Remember do NOT save the refresh
token client side. Save this as an encrypted httponly cookie and use a proxy to send this to the OAuth endpoint when
refreshing access tokens.

## Example of resource owner implementation in a SPA
#### Somewhere where things are initialised
```javascript
define([/*other dependencies,*/ "jquery-oauth", function(auth){
	/* other initialisation */

	var csrfToken = $("input[name='_token']").val();	

	auth.initialize({
        csrfToken: csrfToken,
        events: {
            login: function() {
                // User is hereby logged in and the 
                // access token will be added to subsequent
                // $.ajax calls, until a new token cannot 
                // be acquired or auth.logout() is called.
            },
            logout: function() {
                // auth.logout() has been called and the 
                // authorization headers are removed from 
                // $.ajaxSettings. Tokens are removed from
                // localStorage.
            },
            tokenExpiration: function() {
	            // this event is fired when 401 calls are 
	            // received from the server. Has to return 
	            // an ajax promise. 
	            // New tokens are set with auth.setAccessToken()
	            
                return $.post("/refresh-token-proxy-endpoint").success(function(response){
                    auth.setAccessToken(response.accessToken, response.accessTokenExpiration);
                });
            }
        }
    });
});
```

#### Login form (when form is submitted)
```javascript
$.ajax({
   url: "/access-token-proxy-endpoint",
   method: "POST",
   data: {
       username: "username-from-a-form",
       password: "password-from-a-form"
   },
   statusCode: {
       200: function(response) {
           auth.login(response.accessToken, response.accessTokenExpiration);
       },
       401: function() {
           alert("The username or password were not correct. Try again.");
       }
   }
});
```

#### Logout
```javascript
auth.logout();
```

# API
These calls are available through auth

```javascript
define(['jquery-oauth'], function(auth){
    // The access token and expiration in seconds
    // Sets authorization headers and stores tokens
    auth.login(accessToken, accessTokenExpiration);

   // Removes headers from $.ajax and tokens from localStorage
   auth.logout();

   // Initialize library
   auth.initialize({
       csrfToken: "token" //CSRF token,
       events: {
           logout: function(){},
           login:  function(){},
           tokenExpiration: function(){}
       }	
   });

   // Sets new tokens - should be used with tokenExpiration event
   auth.setAccessToken(accessToken, accessTokenExpiration);

   // Checks for tokens
   auth.hasAccessToken();
   auth.hasAccessTokenExpiration();
});
```

# Thank you
The library addresses OAuth problems in general. Many of these are outlined in this great article:
[OAuth2 with Angular the right way](http://jeremymarc.github.io/2014/08/14/oauth2-with-angular-the-right-way/)

Also, the refresh token functionality takes great inspiration in this great AngularJS library:
[angular-http-auth](https://github.com/witoldsz/angular-http-auth)

So thank you [Jeremy Marc](https://github.com/jeremymarc) ([@jeremymarc](https://twitter.com/jeremymarc)) and
[Witold Szczerba](https://github.com/witoldsz) ([@witoldsz](https://twitter.com/witoldsz))

# License
Copyright © 2015 [Esben Petersen](http://github.com/esbenp) & Contributors

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
language governing permissions and limitations under the License.
