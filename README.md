# STALK-IM SDK for JavaScript

Features
-----------

* Supports STALK-IM's Parse APIs
* Supports STALK-IM's XPush APIs
* Supports socket.io


Stalk Class
-------------
##Constructors

### new Stalk(host, appId)

##### Parameters:
* `host` *string* : STALK-IM의 API서버의 hostname과 port ex) https://im.stalk.io
* `appId` *string* : STALK-IM의 API서버의 APP_ID (Default : STALK)

##### Retuns: *Stalk Class* oject

##User 관련 Methods(member of Stalk)

### signUp(username, password, attrs, callback)
username과 password를 이용하여 신규 사용자를 생성한다.

##### Parameters:
* `username` *string* : 사용자 이름(or email)
* `password` *string* : 비밀번호
* `attrs` *object* : 신규 유저에게 설정할 추가 필드 ( optional )
* `callback(err, result)` *function* : 회원가입 후 호출되는 callback function
  * err *object* : 회원 가입 실패시에 리턴된다.
  * result *object* : 회원 가입 성공시에 리턴된다. *User json*

### logIn(username, password, callback)
username과 password를 이용하여 로그인을 한다. 세션을 생성한다.

##### Parameters:
* `username` *string* : 사용자 이름(or email)
* `password` *string* : 비밀번호
* `callback(err, result)` *function* : 로그인 후 호출되는 callback function
  * err *object* : 로그인 실패시에 리턴된다.
  * result *object* : 로그인 성공시에 리턴된다. *User json*

### updateUser(key, value, callback)
사용자 정보를 수정한다.

##### Parameters:
* `key` *string* : 업데이트할 사용자 필드의 key
* `value` *string or object* : 업데이트할 사용자 필드의 value
* `callback(err, result)` *function* : 사용자 정보 수정 후 호출되는 callback function
  * err *object* : 사용자 정보 실패시에 리턴된다.
  * result *object* : 사용자 정보 수정 성공시에 리턴된다. *User json*

### currentUser()
현재 로그인한 유저의 정보를 가져온다.
##### Retuns: *User json*

### logOut()

현재 세션을 클리어한다.

### searchUsers(keyword, callback)
사용자를 검색한다.

##### Parameters:
* `keyword` *string* : 검색어
* `callback(err, results)` *function* : 사용자 검색 후 호출되는 callback function
  * err *object* : 사용자 검색 실패시에 리턴된다.
  * results *array* : 사용자 검색 성공시에 리턴된다. *User json array*

##Follow 관련 Methods(member of Stalk)

### loadFollows(callback)
현재 접속 중인 사용자의 follow list를 가져온다.

##### Parameters:
* `callback(err, results)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * results *array* : 성공시에 리턴된다. *Follow json array*

### createFollow(id, callback)
현재 접속 중인 사용자의 follow 목록에 선택된 user를 추가한다.

##### Parameters:
* `id` *string* : 선택된 사용자의 id
* `callback(err, result)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * result *object* : 성공시에 리턴된다. *Follow json*

### removeFollow(id, callback)
현재 접속 중인 사용자의 follow 목록에서 선택된 user를 삭제한다.

##### Parameters:
* `id` *string* : 선택된 사용자의 id
* `callback(err, result)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * result *object* : 성공시에 리턴된다. *Follow json*

##Channel 관련 Methods(member of Stalk)

### openChannel(users, channelId, callback)
채팅을 위한 채널에 접속한다. ( 로그인이 필요한 채널 )

##### Parameters:
* `users` *array*  - 채널에 포함될 사용자의 list, 필수값
* `channelId` *string* : 선택된 채널의 id, (optional)
* `callback(err, channel)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * channel *object* : 성공시에 리턴된다. *Channel Class*

### openSimpleChannel(channelId, callback)
채팅을 위한 채널에 접속한다. ( 로그인이 필요없는 채널 )

##### Parameters:
* `channelId` *string* : 접속할 채널의 id. 임의 부여가능
* `callback(err, channel)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * channel *object* : 성공시에 리턴된다. *Channel Class*

### loadChannels(callback)
현재 사용자의 Channels List를 조회한다.

##### Parameters:
* `callback(err, results)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * results *array* : 성공시에 리턴된다. *Channel json array*

### currentChannel()
현재 활성화된 Channel Object를 리턴한다.
##### Retuns: *Channel Class*

 
Channel Class
-------------

`openChannel` 과 `openSimpleChannel` 을 통해 생성된 Channel class의 object는 아래와 같은 Methods를 지원한다.

##Channel Methods(member of Channel)

### loadMessages(callback)
현재 Channel내의 메세지를 조회한다.

##### Parameters:
* `callback(err, results)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * results *array* : 성공시에 리턴된다. *Message json array*

### sendText(message)
현재 채널에 Text 메세지를 전송한다.

##### Parameters:
* `message` *string* : 전송할 Text

### sendImageUrl(message)
현재 채널에 이미지url을 전송한다.

##### Parameters:
* `message` *string* : 전송할 Text

### sendImageFile(fileInput, callback)
현재 채널에 이미지 파일을 전송한다.

##### Parameters:
* `fileInput` *FileObject* : 전송할 image의 FileObject or base64
* `callback(err, result)` *function* : callback function
  * err *object* : 실패시에 리턴된다.
  * result *array* : 성공시에 리턴된다. 업로드한 파일의 url

License
-----------

STALK-IM is an open source software released under MIT license.

This means you can use and install stalk-messenger in your own personal or commercial projects for free.