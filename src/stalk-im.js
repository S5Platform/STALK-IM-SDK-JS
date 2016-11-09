(function(){

  var DEFAULT_PAGE_SIZE = 50;
  var MESSAGE_SIZE = 30;

  var Stalk = (function() {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
     http = require('http');
     io = require('socket.io-client');
     Parse = require('parse');
    }

    var socketOptions ={
      transports: ['websocket']
      ,'force new connection': true
    };

    var GLOBAL = 'global';
    var CHANNEL = 'channel';

    var debug = function() {
    };

    var oldDebug;

    var Stalk = function(host, appId){
      if( !appId ){
        appId = 'STALK';
      }

      if( host.endsWith("/") ){
        host = host.substring(0, host.lastIndexOf("/") ); 
      }

      var self = this;
      self.appId = appId;
      self.hostname = host;
      self._channels = {};
      self._currentUser = undefined;
      self._currentChannel = undefined;
      self.onGlobalMessageCallback = undefined;
      self._globalSocketConnected = false;

      Parse.initialize(appId);
      Parse.serverURL = self.hostname+'/parse';

      return self;
    };

    /**
     * debug 기능을 켠다.
     * @name enableDebug
     * @memberof Stalk
     * @function
     * @example
     * // enable debug
     * stalk.enableDebug();
     */
    Stalk.prototype.enableDebug = function(){
      if( oldDebug ){
        return;
      }

      if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        debug = Function.prototype.bind.call(console.log, console);
      } else {
        if (window.console) {
          if (Function.prototype.bind) {
            debug = Function.prototype.bind.call(console.log, console);
          } else {
            debug = function() {
              Function.prototype.apply.call(console.log, console, arguments);
            };
          }
        }
      }
    };

    /**
     * debug 기능을 끈다.
     * @name disableDebug
     * @memberof Stalk
     * @function
     * @example
     * // disable debug
     * stalk.disableDebug();
     */
    Stalk.prototype.disableDebug = function(){
      // Init debug funciton
      debug = function(){
      };

      oldDebug = undefined;
    };

    /**
     * 회원 가입
     * @name signUp
     * @memberof Stalk
     * @function
     * @param {string} username - 사용자 이름(or email)
     * @param {string} password - 비밀번호
     * @param {Object} attrs - 신규 유저에게 설정할 추가 필드
     * @param {callback} callback - 회원가입 후 수행할 callback function
     * @example
     * stalk.signUp("james", "1234", function(err, result){
     *  console.log( result );
     * });
     */
    Stalk.prototype.signUp = function(username, password, attrs, callback){

      if(typeof(attrs) == 'function' && !callback){
        callback = attrs;
        attrs = undefined;
      }

      var user = new Parse.User();
      user.set("username", username);
      user.set("password", password);
      user.set("nickName", username);
      if( attrs ){
        for( var key in attrs ){
          user.set(key, attrs[key]);
        }
      }

      user.signUp(null, {
        success: function(user) {
          callback( null, user );
        },
        error: function(user, error) {
          callback( error, null );
        }
      });
    };

    /**
     * 로그인 하기
     * @name logIn
     * @memberof Stalk
     * @function
     * @param {string} username - 사용자 이름(or email)
     * @param {string} password - 비밀번호
     * @param {callback} callback - 회원가입 후 수행할 callback function
     * @example
     * stalk.logIn(username, password, function(err, result){
     *  console.log( result );
     * });
     */
    Stalk.prototype.logIn = function(username, password, callback){
      var self = this;
      Parse.User.logIn(username, password, {
        success: function(user) {
          var jsonUser = ParseUtil.fromUserToJSON(user, 160);
          self._currentUser = jsonUser;

          // coonect global channl
          try{
            self._connectGlobalChannel();
          } catch ( err ){
            console.log( err );
          }

          callback( null, jsonUser );
        },
        error: function(user, error) {
          // The login failed. Check error to see why.
          callback( error, null );
        }
      });
    };

    /**
     * 로그 아웃
     * @name logOut
     * @memberof Stalk
     * @example
     * stalk.logOut()
     */
    Stalk.prototype.logOut = function(){
      Parse.User.logOut();
    };

    /**
     * 현재 로그인한 유저의 정보를 가져온다.
     * @name currentUser
     * @memberof Stalk
     * @function
     * @example
     * stalk.currentUser()
     */
    Stalk.prototype.currentUser = function(){
      return this._currentUser;
    };

    /**
     * 현재 활성화된 채널을 가져온다.
     * @name currentChannel
     * @memberof Stalk
     * @function
     * @example
     * stalk.currentChannel()
     */
    Stalk.prototype.currentChannel = function(){
      return this._currentChannel;
    };

    /**
     * 현재 로그인한 유저의 정보를 수정한다.
     * @name updateUser
     * @memberof Stalk
     * @function
     * @param {string} key - user 객체에 추가해야할 key
     * @param {string} value - user 객체에 추가해야할 key에 매핑되는 value
     * @param {callback} callback - 사용자 정보를 수정후 호출되는 callback
     * @example
     * stalk.updateUser( 'nickName', '파인애플', function(err, user){
     *   console.log( user );
     * });
     */
    Stalk.prototype.updateUser = function(key, value, callback) {

      var self = this;
      var user = Parse.User.current();

      var data = value;
      if( key == 'profileFile' ){

        var file = value;
        if( typeof( value ) == 'object' ){
          var fileUploadControl = value;
          if (fileUploadControl.files.length > 0) {
            file = fileUploadControl.files[0];
            name = file.name;
          }
        } else if( typeof( value ) == 'string' ){
          file = { base64: value };
          name = self._currentUser.id +"_"+ Date.now();
        }

        data = new Parse.File(name, file);
      }

      user.set(key, data);
      user.save(null, {
        success: function(user) {
          if( key == 'profileFile' ){
            self._currentUser.avatar = user.get('profileFile').url();
          } else {
            self._currentUser[key] = data;
          }
          callback( null, user );
        },
        error: function(user, error) {
          callback(error, null);
        }
      });
    };

    /**
     * 검색어를 이용해서 유저 정보를 검색한다.
     * @name searchUsers
     * @memberof Stalk
     * @function
     * @param {string} keyword - 검색어 
     * @param {callback} callback - 사용자 검색후 호출되는 callback
     * @example
     * stalk.searchUsers( 'james', function( err, users ){
     *   console.log( users );
     * });
     */
    Stalk.prototype.searchUsers = function(keyword, callback){

      var data = {
        keyword: keyword,
        pageNumber: 1
      };

      var limit = data.pageSize || DEFAULT_PAGE_SIZE;
      var skip = ((data.pageNumber || 1) - 1) * limit;

      if(data.keyword) {
        var usernameQuery = new Parse.Query(Parse.User);
        usernameQuery.startsWith("username", data.keyword);

        var nickNameQuery = new Parse.Query(Parse.User);
        nickNameQuery.startsWith("nickName", data.keyword);

        var query = Parse.Query.or(usernameQuery, nickNameQuery);

        if(skip > 0) query = query.skip(skip);
        query = query.limit(limit).ascending('username');

        query.find({
          success:function(results) {
            callback( null, results.map(ParseUtil.fromUserToJSON) )
          },
          error: function(object, error) {
            callback( error, null );
          }
        });
      } else{
        callback(null, []);
      }      
    };

    /**
     * 현재 접속 중인 사용자의 follow list를 가져온다.
     * @name loadFollows
     * @memberof Stalk
     * @function
     * @param {callback} callback - follow 를 조회 후에 호출되는 callback
     * @example
     * stalk.loadFollows(function( err, follows ){
     *   console.log( follows );
     * });
     */
    Stalk.prototype.loadFollows = function(callback){
      var currentUser = Parse.User.current();
      var Follows = Parse.Object.extend('Follows');

      var query = new Parse.Query(Follows)
        .equalTo('userFrom', currentUser)
        .include('userTo')
        .ascending('nickName');

      query.find({
        success:function(results) {
          callback( null, results.map(ParseUtil.fromFollowToJSON) )
        },
        error: function(object, error) {
          callback( error, null );
        }
      });
    };

    /**
     * 현재 접속 중인 사용자의 follow 목록에 선택된 user를 추가한다.
     * @name createFollow
     * @memberof Stalk
     * @function
     * @param {string} id - user's id
     * @param {callback} callback - follow 생성 후에 호출되는 함수
     * @example
     * stalk.createFollow(userId, function( err, result ){
     *   console.log( result );
     * });
     */
    Stalk.prototype.createFollow = function(id, callback){
      if( typeof(id) == 'array' ){
        if( id.size > 0 ){
          id = id[0];
        } else {
          callback( {'message':'Invalid ids'}, null );
        }
      }

      Parse.Cloud.run('follows-create', {id:id}, {
        success:function(result) {
          callback( null, ParseUtil.fromFollowToJSON(result) );
        },
        error: function(object, error) {
          callback( error, null );
        }
      });
    };

    /**
     * 현재 접속 중인 사용자의 follow 목록에서 선택된 user를 제거한다.
     * @name removeFollow
     * @memberof Stalk
     * @function
     * @param {string} id - user's id
     * @param {callback} callback - follow 삭제 후에 호출되는 함수
     * @example
     * stalk.removeFollow(userId, function( err, result ){
     *   console.log( result );
     * });
     */
    Stalk.prototype.removeFollow = function(id, callback){
      Parse.Cloud.run('follows-remove', {id:id}, {
        success:function(result) {
          callback( null, result )
        },
        error: function(object, error) {
          callback( error, null );
        }
      });      
    };

    /**
     * 채팅을 위한 채널에 접속한다. ( 로그인이 필요한 채널 )
     * @name openChannel
     * @memberof Stalk
     * @function
     * @param {array} users - 채널에 포함될 사용자의 list
     * @param {string} channelId - channelId
     * @param {callback} callback - channel 오픈 후에 호출되는 함수
     * @example
     * stalk.openChannel(channelId, ['qW2hcf','r3vFdQ'], function( err, channel ){
     *   console.log( channel );
     * });
     */
    Stalk.prototype.openChannel = function(users, channelId, callback){

      if( typeof(channelId) == 'function' && !callback ){
        callback = channelId;
        channelId = undefined;
      }

      var self = this;

      if( channelId ){
        self._getChannelById( channelId, function( err, channel ){
          if( !err && channel && channel.channelId ){
            self._currentChannel = channel;
            callback( null, channel );
          } else {
            self._createChat(users, callback);
          }
        });     
      } else {
        self._createChat(users, callback);
      }
    };

    /**
     * 채팅을 위한 채널에 접속한다. ( 로그인 불필요 )
     * @name openSimpleChannel
     * @memberof Stalk
     * @function
     * @param {string} channelId - channelId
     * @param {object} userObj - userObj
     * @param {callback} callback - channel 오픈 후에 호출되는 함수
     * @example1
     * stalk.openSimpleChannel('channel01', function( err, channel ){
     *   console.log( channel );
     * });
     * @example2
     * stalk.openSimpleChannel('channel01', {id:'james'}, function( err, channel ){
     *   console.log( channel );
     * });
     */
    Stalk.prototype.openSimpleChannel = function(channelId, userObj, callback){
      var self = this;
      var data = {channelId:channelId};

      if(typeof(userObj) == 'function' && !callback){
        callback = userObj;
        userObj = undefined;
      }

      if( userObj ){
        self._currentUser = userObj;
      }

      var channel = new Channel(self, data);
      channel._getSocket( function(socket){
        self._currentChannel = channel;
        callback( null, channel ); 
      });
    };

    Stalk.prototype._connectGlobalChannel = function(){
      var self = this;
      var userId = self._currentUser.id;

      self.ajax( '/node/'+self.appId+'-BG/'+encodeURIComponent(userId) , 'GET', {}, function(err, data){
        if( err ){
          console.error( err );
          self._globalSocketConnected = false;
        } else if ( data.status == 'ok'){
          var name = data.result.server.name;
          var url = data.result.server.url;

          var query =
              'A='+self.appId+'&'+
              'U='+userId;

          self._globalSocket = io.connect(url+'/background?'+query, socketOptions);

          self._globalSocket.on('connect', function(){
            debug( 'global connection completed' );
            self._globalSocketConnected = true;
          });

          self._globalSocket.on('disconnect', function(){
            console.warn( 'global disconnected' );
            self._globalSocketConnected = false;
          });

          self._globalSocket.on('backgound-message', function(resData){
            debug( 'onGlobalMessage : ', resData );
            if( resData.NM == 'message' && resData.DT && self.onGlobalMessageCallback ){
              self.onGlobalMessageCallback( resData.DT  );
            }
          });
        }
      });      
    };

    /**
     * 글로벌 메시지 이벤트를 등록한다.
     * @name onGlobalMessage
     * @memberof Stalk
     * @function
     * @example
     * stalk.onGlobalMessage();
     *  console.log( data );
     * });
     */
    Stalk.prototype.onGlobalMessage = function(callback){
      this.onGlobalMessageCallback = callback;
    };

    Stalk.prototype._createChat = function(users, callback){

      var self = this;
      var ids = [];

      if( !users || users.size == 0 ){
        callback( {'message':'Invalid users'}, null );
        return;
      }

      if( typeof( users[0] ) == 'object' ){
        users.forEach( function(user) {
           ids.push(user.id);
        });
      } else if( typeof( users[0] ) == 'string' ){
        ids = users;
      }

      Parse.Cloud.run('chats-create', { ids: ids }, {
        success:function(result) {

          self._getChatById( result.id, function( err, channel ){
            self._currentChannel = channel;
            callback( null, channel );
          });

        },
        error: function(object, error) {
          callback( error, null );
        }
      });
    };

    Stalk.prototype._getChatById = function(chatId, callback){
      var self = this;

      var Chats = Parse.Object.extend('Chats');

      var query = new Parse.Query(Chats)
      .include('channel.users')
      .get(chatId, {
        success:function(chat) {

          var newChannel = new Channel(self, ParseUtil.fromChatToJSON(chat) );
          self._channels[newChannel.channelId] = newChannel;
          callback( null, newChannel  );
        },
        error: function(object, error) {
          callback( error, null );
        }
      });
    };

    Stalk.prototype._getChannelById = function(channelId, callback){
      var self = this;

      var Channels = Parse.Object.extend('Channels');

      if( self._channels[channelId] ){
        callback( null, self._channels[channelId] );
        return;
      }

      var query = new Parse.Query(Channels)
      .get(channelId, {
        success:function(channel) {
          var newChannel = new Channel(self, ParseUtil.fromChannelToJSON(channel) );
          self._channels[newChannel.channelId] = newChannel;
          callback( null, newChannel  );
        },
        error: function(object, error) {
          callback( error, null );
        }
      });
    };

    /**
     * 현재 사용자의 Channels List를 조회한다.
     * @name loadChannels
     * @memberof Stalk
     * @function
     * @param {callback} callback - channel 조회 후에 호출되는 함수
     * @example
     * stalk.loadChannels(function( err, channels ){
     *   console.log( channels );
     * });
     */
    Stalk.prototype.loadChannels = function(callback){
      var currentUser = Parse.User.current();

      var self = this;
      var Chats = Parse.Object.extend('Chats');

      var query = new Parse.Query(Chats)
        .equalTo('user', currentUser)
        .include('channel.users')
        .descending("updatedAt");

      query.find({
        success:function(lists) {
          var results = lists.map( ParseUtil.fromChatToJSON );
          callback( null, results );
        },
        error: function(object, error) {
          callback( error, null );
        }
      }); 
    };

    var Channel = function(stalk, data){
      var self = this;
      self._stalk = stalk;

      if(data.id) self.id = data.id;
      self.channelId = data.channelId;
      if(data.createdAt) self.createdAt = data.createdAt;
      if(data.updatedAt) self.updatedAt = data.updatedAt;
      if(data.name) self.name = data.name;
      if(data.uid) self.uid = data.uid;
      if(data.users) self.users = data.users;

      if(stalk._currentUser) self._currentUser = stalk._currentUser;

      // channel connection;
      self._socket;

      self.onMessageCallback;

      return self;
    };

    Channel.prototype._getSocket = function(callback){
      var self = this;

      if( self._socket && self._socket.connected ){
        if( callback ) callback(self._socket);
      } else {
        self._getChannelNode( function(err, node){
          if( !err ){
            self._connectChannel(node, callback);
          }
        });
      }
    };

    Channel.prototype._getChannelNode = function(callback){
      var self = this;
      this._stalk.ajax( '/node/'+self._stalk.appId+'/'+encodeURIComponent(self.channelId) , 'GET', {}, function(err, data){
        if( err ){
          callback( err, null);
        } else if ( data.status == 'ok'){

          var result = {
            app: self._stalk.appId,
            name: data.result.server.name,
            url: data.result.server.url
          };

          callback( null, result );
        }
      }); 
    };

    Channel.prototype._connectChannel = function(node, callback){
      var self = this;
      var userId = self._currentUser && self._currentUser.id ? self._currentUser.id : Util.getUniqueKey();
      self._currentUser.id = userId;

      var self = this;
      var query =
          'A='+self._stalk.appId+'&'+
          'C='+self.channelId+'&'+
          'U='+userId+'&'+
          'S='+node.name;

      self._socket = io.connect(node.url+'/channel?'+query, socketOptions);

      self._socket.on('connect', function(){
        debug( 'channel connection completed' );
        self._connected = true;
        if(callback) callback(self._socket);
      });

      self._socket.on('disconnect', function(){
        debug( 'channel disconnected' );
        self._connected = false;
      });

      self._socket.on('message', function(data){

        if( self.onMessageCallback ){

          if( typeof(data) == 'object' && data.user ) {
            if( data.user.id == self._currentUser.id ){
              data.sent = true;
            }

            if( data.TS ){
              data.createdAt = new Date(data.TS);
            } 
          }

          debug( 'onMessage : ', data );
          self.onMessageCallback( data );
        }
      });
    };

    var messageTimeSort = function(a,b){
      return (b.createdAt < a.createdAt) ? 1 : (b.createdAt > a.createdAt) ? -1 : 0;
    };


    /**
     * 현재 사용자의 Channels List를 조회한다.
     * @name loadMessages
     * @memberof Channel
     * @function
     * @param {callback} callback - channel 조회 후에 호출되는 함수
     * @param {datetime} [datetime] - channel 조회 후에 호출되는 함수
     * @example
     * channel.loadMessages(function( err, channels ){
     *   console.log( channels );
     * });
     */
    Channel.prototype.loadMessages = function(callback, datetime){

      var self = this;
      var Messages = Parse.Object.extend('Messages');
      var Channels = Parse.Object.extend('Channels');

      var channel = new Channels();
      channel.id = self.channelId;

      // init channel socket;
      self._getSocket( function( socket ){
      });

      var query = new Parse.Query(Messages)
        .equalTo("channel", channel)
        .lessThan("createdAt", datetime ? new Date(datetime) : new Date())
        .greaterThan("createdAt", new Date(self.createdAt))
        .descending("createdAt")
        .include("user") // TODO check performance issues ?
        .limit(MESSAGE_SIZE)
        .find({
          success:function(lists) {
            var messages = lists.map( ParseUtil.fromMessageToJSON );
            callback( null, messages.sort(messageTimeSort) );
          },
          error: function(object, error) {
            callback( error, null );
          }
        });
    }; 

    /**
     * 현재 활성화된 채널에 Text 메세지를 전송한다.
     * @name sendText
     * @memberof Channel
     * @function
     * @param {string} message - 전송할 Text
     * @example
     * channel.sendText(message);
     */
    Channel.prototype.sendText = function(message){
      var self = this;

      var currentUser = self._currentUser;

      var data = { 
        text: message,
        user: { id: currentUser.id, username: currentUser.username, nickName: currentUser.nickName, avatar: currentUser.avatar },
        _id: 'temp-id-' + self.channelId +"_"+Date.now()
      };

      self._getSocket( function( socket ){
        socket.emit('send', {NM: 'message' , DT: data});
      });
    };

    /**
     * 메시지 이벤트를 등록한다.
     * @name onMessage
     * @memberof Channel
     * @function
     * @example
     * channel.onMessage(function(data){
     *  console.log( data );
     * });
     */
    Channel.prototype.onMessage = function(callback){
      this.onMessageCallback = callback;
    };

    /**
     * 현재 활성화된 채널에 이미지url을 전송한다.
     * @name sendImageUrl
     * @memberof Channel
     * @function
     * @param {string} message - 전송할 image의 url
     * @example
     * channel.sendImageUrl(url);
     */
    Channel.prototype.sendImageUrl = function(imageUrl){
      var self = this;

      var currentUser = self._currentUser;

      var data = {
        image: imageUrl,
        user: { id: currentUser.id, username: currentUser.username, nickName: currentUser.nickName, avatar: currentUser.avatar },
        _id: 'temp-id-' + self.channelId +"_"+ Date.now()
      }

      self._getSocket( function( socket ){
        socket.emit('send', {NM: 'message' , DT: data});
      });
    };

    /**
     * 현재 활성화된 채널에 파일을 전송한다.
     * @name sendImageFile
     * @memberof Channel
     * @function
     * @param {object} input - 전송할 image의 FileObject or base64
     * @example
     * channel.sendImageFile(document.getElementById("file");
     */
    Channel.prototype.sendImageFile = function(inputFile, callback){
      var self = this;

      var file = "";
      var name = "";

      if( typeof( inputFile ) == 'object' ){
        var fileUploadControl = inputFile;
        if (fileUploadControl.files.length > 0) {
          file = fileUploadControl.files[0];
          name = self.channelId +"_"+ file.name;
        }
      } else if( typeof( inputFile ) == 'string' ){
        file = { base64: inputFile };
        name = self.channelId +"_"+ Date.now();
      }

      if( !file ){
        callback( "Invaild File", null );
        return;
      }

      var parseFile = new Parse.File(name, file);
      var UploadFiles = Parse.Object.extend('UploadFiles');
      var uploadFile = new UploadFiles();

      if( Parse.User.current() ){
        var user = new Parse.User();
        user.id = Parse.User.current().id;
        uploadFile.set("user",     user    );
      }

      uploadFile.set("file",  parseFile  );

      uploadFile.save().then(function() {

        var uploadedUrl = parseFile.url();
        inputFile.value = '';        

        self.sendImageUrl(uploadedUrl);
        if( callback ) callback( null, uploadedUrl );
      }, function(error) {
        if( callback ) callback(error, null);
      });
    };

    var ParseUtil = {};

    ParseUtil.fromUserToJSON = function(user, size){
      var username = user.get('username');

      var avatar = "";
      if( user && user.get('profileFile') != null && user.get('profileFile') != undefined ){
        avatar = user.get('profileFile').url();
      } else {
        avatar = Util.getDefaultProfile( username, size); 
      }

      return {
        id: user.id,
        username: username,
        email: user.get('email'),
        nickName: user.get('nickName'),
        avatar: avatar,
        statusMessage: user.get('statusMessage'),
      }; 
    };

    ParseUtil.fromFollowToJSON = function(object){
      var user = object.get('userTo');
      var username = user.get('username');

      var avatar = "";
      if( user && user.get('profileFile') != null && user.get('profileFile') != undefined ){
        avatar = user.get('profileFile').url();
      } else {
        avatar = Util.getDefaultProfile( username );   
      }

      var result = {
        followId: object.id,
        id: user.id,
        username: username,
        email: user.get('email'),
        nickName: user.get('nickName'),
        statusMessage: user.get('statusMessage'),
        avatar: avatar,
      };

      return result;
    };

    ParseUtil.fromChatToJSON = function(object){

      if( !object ){
        return null;
      }

      var channel;
      var users;
      var name;
      var names;
      var image;

      try {

        channel = object.get("channel");
        users = channel.get("users");
        names = [];

        var currentUser = Parse.User.current();
        users.reduceRight(function(acc, user, index, object) {

          if (user.id === currentUser.id) {
            object.splice(index, 1);
          } else {
            object[index] = ParseUtil.fromUserToJSON(user);
            names.push(user.get('nickName'));
          }
        }, []);

        name = names.join(", ");
        image = Util.getDefaultProfile( name );

      } catch (err){
        console.error("ajax error: " + err);
        return {};
      }

      return {
        id: channel.id,
        channelId: channel.id,
        createdAt: object.get("createdAt"),
        updatedAt: object.get("updatedAt"),
        name: names.join(", "),
        uid: users.length == 1 ? users[0].id : null, // uid 이 Null 이면, Group Chat !
        users: users,
        image: image
      };
    };

   ParseUtil.fromChannelToJSON = function(object){

      if( !object ){
        return null;
      }

      var channel;
      var users;
      var name;
      var names;
      var image;

      try {

        channel = object;
        users = channel.get("users");
        names = [];

        var currentUser = Parse.User.current();
        users.reduceRight(function(acc, user, index, object) {

          if (user.id === currentUser.id) {
            object.splice(index, 1);
          } else {
            object[index] = ParseUtil.fromUserToJSON(user);
            names.push(user.get('nickName'));
          }
        }, []);

        name = names.join(", ");
        image = Util.getDefaultProfile( name );

      } catch (err){
        console.error("ajax error: " + err);
        return {};
      }

      return {
        id: channel.id,
        channelId: channel.id,
        createdAt: channel.get("createdAt"),
        updatedAt: channel.get("updatedAt"),
        name: names.join(", "),
        uid: users.length == 1 ? users[0].id : null, // uid 이 Null 이면, Group Chat !
        users: users,
        image: image
      };
    };

    ParseUtil.fromMessageToJSON = function(object){
      var user = object.get("user");

      var username = user.get('username');
      var avatar = user.get('profileFile') ? user.get('profileFile').url() : Util.getDefaultProfile(username);

      var currentUser = Parse.User.current();

      return {
        _id: object.id,
        text: object.get("message"),
        createdAt: object.createdAt,
        user: {
          id: user.id,
          username: user.get('username'),
          nickName: user.get('nickName'),
          avatar: avatar
        },
        sent: user.id == currentUser.id,
        image: object.get("image")
      };
    };

    var Util= {};

    Util.getDefaultProfile = function(str, size){
      var result = "https://cdn-enterprise.discourse.org/ionicframework/user_avatar/forum.ionicframework.com/dtrujo/90/12150_1.png";
      if (str.search(/[^a-zA-Z0-9]+/) === -1) {

        var firstChar = str.substring(0,1);
        var rgb = Util.getRGBFromStr(str);
        if( !size ){
          size = 50;
        }

        result = "https://avatars.discourse.org/v2/letter/"+firstChar+"/"+rgb+"/"+size+".png";
      }

      return result;
    }

    Util.getRGBFromStr = function( str ){
      return Util.intToRGB(Util.hashCode(str));
    };

    Util.hashCode = function(str) { // java String#hashCode
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
         hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    };

    Util.intToRGB = function(i){
      var c = (i & 0x00FFFFFF)
          .toString(16)
          .toUpperCase();

      return "00000".substring(0, 6 - c.length) + c;
    };

    Util.getUniqueKey = function () {
      var s = [], itoh = '0123456789ABCDEF';
      for (var i = 0; i < 36; i++) s[i] = Math.floor(Math.random() * 0x10);
      s[14] = 4;
      s[19] = (s[19] & 0x3) | 0x8;
      for (var x = 0; x < 36; x++) s[x] = itoh[s[x]];
      s[8] = s[13] = s[18] = s[23] = '-';
      return s.join('');
    },

    Util.dateToString =function(paramDate, type){

      var cDate = new Date();

      var cYyyymmdd = cDate.getFullYear() + "" + (cDate.getMonth() + 1) + "" + cDate.getDate();
      var date = new Date(paramDate);

      var yyyy = date.getFullYear();
      var mm = date.getMonth() + 1;
      mm = mm >= 10 ? "" + mm : "0" + mm;

      var dd = date.getDate();
      dd = dd >= 10 ? "" + dd : "0" + dd;

      var hour = date.getHours();
      hour = hour >= 10 ? hour : "0" + hour;

      var minute = date.getMinutes();
      minute = minute >= 10 ? "" + minute : "0" + minute;

      var second = date.getSeconds();
      second = second >= 10 ? "" + second : "0" + second;

      var yyyymmdd = yyyy + "" + mm + "" + dd;

      var result = [];
      if (cYyyymmdd != yyyymmdd) {
        result.push(yyyy + "-" + mm + "-" + dd);
      } else {
        result.push(hour + ":" + minute + ":" + second);
      }

      result.push(yyyy + "-" + mm + "-" + dd);
      result.push(hour + ":" + minute + ":" + second);
      result.push(date.toLocaleTimeString());

      if( type == undefined ){
        type = 0;
      }

      return result[type];  
    };

    var _rest = function( context, method, data, headers, cb){
      var self = this;

      if(typeof(headers) == 'function' && !cb){
        cb = headers;
        headers = undefined;
      }

      var hostname = self.hostname.replace( "http://", "" );
      var port = 8000;
      if( hostname.indexOf( ":" ) > 0 ) {
        hostname = hostname.split(":")[0];
        port = hostname.split(":")[1]
      }

      var options = {
        host: hostname,
        port:port,
        path: context,
        method: method
      };

      if( headers ){
        options.headers = headers;
      } else {
         options.headers = {};
      }

      options.headers['Content-Type'] = 'application/json';      

      var result = '';
      var request = http.request( options, function(res) {

        res.setEncoding('utf8');
        res.on("data", function(chunk) {    
          result = result + chunk;      
        });

        res.on("end", function() {
          var r = JSON.parse(result);
          if(r.status != 'ok'){
            cb(r.status,r.message);
          }else{
            cb(null,r);
          }  
        });

      }).on('error', function(e) {
        console.error("ajax error: " + e.message);
        cb('',result);
      });
      
      if( method.toLowerCase() !== 'GET'.toLowerCase() ){
        request.write(JSON.stringify(data));
      }
      request.end();
    }

    var _ajax = function( context, method, data, headers, cb){
      var self = this;

      if(typeof(headers) == 'function' && !cb){
        cb = headers;
        headers = false;
      }

      var xhr;
      try{
        xhr = new XMLHttpRequest();
      }catch (e){
        try{
          xhr = new XDomainRequest();
        } catch (e){
          try{
            xhr = new ActiveXObject('Msxml2.XMLHTTP');
          }catch (e){
            try{
              xhr = new ActiveXObject('Microsoft.XMLHTTP');
            }catch (e){
              console.error('\nYour browser is not compatible with XPUSH AJAX');
            }
          }
        }
      }

      var _url = self.hostname+context;

      var param = Object.keys(data).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }).join('&');

      method = (method.toLowerCase() == "get") ? "GET":"POST";
      param  = (param == null || param == "") ? null : param;
      if(method == "GET" && param != null){
        _url = _url + "?" + param;
      }

      xhr.open(method, _url, true);
      xhr.onreadystatechange = function() {

        if(xhr.readyState < 4) {
          return;
        }

        if(xhr.status !== 200) {
          debug("stalk : ajax error", self.hostname+context,param);
          cb(xhr.status,{});
        }

        if(xhr.readyState === 4) {
          var r = JSON.parse(xhr.responseText);
          if(r.status != 'ok'){
            cb(r.status,r.message);
          }else{
            cb(null,r);
          }
        }
      };

      debug("stalk : ajax ", self.hostname+context,method,param);

      if(headers) {
        for (var key in headers) {
          if (headers.hasOwnProperty(key)) {
            xhr.setRequestHeader(key, headers[key]);
          }
        }
      }
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send( (method == "POST") ? param : null);

      return;
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
      Stalk.prototype.ajax = _rest;
    } else {
      Stalk.prototype.ajax = _ajax;
    }

    return Stalk;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Stalk;
  } else {
    if (typeof define === 'function' && define.amd) {
      define([], function() {
        return Stalk;
      });
    } else {
      window.Stalk = Stalk;
    }
  }
})();