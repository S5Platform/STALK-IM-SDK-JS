# Stalk SDK for JavaScript

### Features
-----------
* Supports S5Platform's parse APIs
* Supports S5Platform's xpush APIs
* Supports socket.io

### Constructors
-----------
##### new Stalk(host, appId)

###### Parameters:
* `host` *string* : stalk-messenger session server's hostname and port

* `appId` *string* : stalk-messenger session server's APP_ID (Default : STALK)

###### Retuns: *Stalk* oject

### Methods
----------
##### signUp(username, password, attrs, callback)
 Signs up a new user with a username (or email) and password

###### Parameters:
* `username` *string* : The username (or email) to sign up with.

* `password` *string* : The password to sign up with.

* `attrs` *object* : Extra fields to set on the new user.

* `callback(err, result)` *function* : callback function which is invoked after signUp
	* err :
	* result :

License
-----------

 S5Platform is an open source software released under MIT license.

 This means you can use and install stalk-messenger in your own personal or commercial projects for free.