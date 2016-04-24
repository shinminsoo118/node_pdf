var Judoonge = (function (self, $) {
    self.about = {
        name: 'Judoonge',
        version: '1.0.9'
    };
    self.serverInfo = {
        httpBind: 'http://knowledgepoint.co.kr:7070/http-bind',
        conferenDomain: 'conference.knowledgepoint.co.kr',
        basicDomain: 'knowledgepoint.co.kr',
        connectUrl: 'knowledgepoint.co.kr',
        searchDomain: 'search.knowledgepoint.co.kr',
        avatarDomain: './upload/avatar/',
        pictureDomain: './upload/picture/',
        fileDomain: './upload/file/',
        documentDomain: './upload/document/'
    };
    // client agent ingo
    self.UserAgent = navigator.userAgent;
    // bad word
    self.filterWords = ["멍청이", "바보", "나쁜놈"];

    // Judoonge.DEF.callTargetId
    self.DEF = {
        callTargetId: [],
        peopleAdd: null,
        loginlist: [],
        loginlistFullJid: [],
        GroupList: [],
        TalkRoomList: [],
        PresReqFlag: 0,
        randomJidres: null,
        rBuddyAddJid: "",
        PeopleCount: 0,
        chattingTabCount: 0
    };
    /**
	 * Function: init Init view & core
	 * 
	 * Parameters: (String) service - URL to the BOSH interface (Object) options -
	 * Options for Judoonge
	 * 
	 * Options: (Boolean) debug - Debug (Default: false) (Array|Boolean)
	 * autojoin - Autojoin these channels. When boolean true, do not autojoin,
	 * wait if the server sends something.
	 */
    self.init = function (service, options) {
        self.View.init($('#chattingMainBody'), options.view);
        self.Core.init(service, options.core);
        Judoonge.DEF.GroupList.push("NewFriend");
    };

    return self;
}(Judoonge || {}, jQuery));

Judoonge.Core = (function (self, Strophe, $) {
    var _connection = null, _service = null, _user = null, _rooms = {}, _anonymousConnection = false, _registerProc = false, _options = {
        autojoin: true,
        debug: false
    }, _addNamespace = function (name, value) {
        Strophe.addNamespace(name, value);
    },

	_addNamespaces = function () {
	    _addNamespace('PRIVATE', 'jabber:iq:private');
	    _addNamespace('BOOKMARKS', 'storage:bookmarks');
	    _addNamespace('PRIVACY', 'jabber:iq:privacy');
	    _addNamespace('DELAY', 'jabber:x:delay');
	}, _registerEventHandlers = function () {
	    self.addHandler(self.Event.Jabber.Version, Strophe.NS.VERSION, 'iq');
	    self.addHandler(self.Event.Jabber.Presence, null, 'presence');
	    self.addHandler(self.Event.Jabber.Message, null, 'message');
	    self.addHandler(self.Event.Jabber.Bookmarks, Strophe.NS.PRIVATE, 'iq');
	    self.addHandler(self.Event.Jabber.Room.Disco, Strophe.NS.DISCO_INFO,
				'iq');
	    self.addHandler(self.Event.Jabber.PrivacyList, Strophe.NS.PRIVACY,
				'iq', 'result');
	    self.addHandler(self.Event.Jabber.PrivacyListError, Strophe.NS.PRIVACY,
				'iq', 'error');
	    // handler add
	    self.addHandler(self.Event.Jabber.rBuddyList, Strophe.NS.ROSTER, 'iq',
				'result');
	    self.addHandler(self.Event.Jabber.rBuddyGroupProc, Strophe.NS.ROSTER,
				'iq', 'set');
	    // self.addHandler(self.Event.Jabber.rBuddyDelete, Strophe.NS.ROSTER,
	    // 'iq', 'set');
	    self.addHandler(self.Event.Jabber.rBuddySearch, Strophe.NS.SEARCH,
				'iq', 'result');
	    self.addHandler(self.Event.Jabber.rBuddyIqProcError, null, 'iq',
				'error');
	    self.addHandler(self.Event.Jabber.rBuddyIqProcResult, null, 'iq',
				'result');
	};

    /**
	 * Function: init Initialize Core.
	 * 
	 * Parameters: (String) service - URL of BOSH service (Object) options -
	 * Options for Judoonge
	 */
    self.init = function (service, options) {
        _service = service;
        // Apply options
        $.extend(true, _options, options);

        // Enable debug logging
        if (_options.debug) {
            self.log = function (str) {
                try { // prevent erroring
                    if (typeof window.console !== undefined
							&& typeof window.console.log !== undefined) {
                        // console.log(str);
                    }
                } catch (e) {
                    // console.error(e);
                }
            };
            self.log('[Init] Debugging enabled');
        }

        _addNamespaces();
        _connection = new Strophe.Connection(_service);
        _connection.rawInput = self.rawInput.bind(self);
        _connection.rawOutput = self.rawOutput.bind(self);

        window.onbeforeunload = self.onWindowUnload;

        if ($.browser.mozilla) {
            $(document).keydown(function (e) {
                if (e.which === 27) {
                    e.preventDefault();
                }
            });
        }
    };

    /**
	 * Function: connect Connect to the jabber host.
	 * 
	 * There are four different procedures to login: connect('JID', 'password') -
	 * Connect a registered user connect('domain') - Connect anonymously to the
	 * domain. The user should receive a random JID. connect('domain', null,
	 * 'nick') - Connect anonymously to the domain. The user should receive a
	 * random JID but with a nick set. connect('JID') - Show login form and
	 * prompt for password. JID input is hidden. connect() - Show login form and
	 * prompt for JID and password.
	 * 
	 * See: <Judoonge.Core.attach()> for attaching an already established
	 * session.
	 * 
	 * Parameters: (String) jidOrHost - JID or Host (String) password - Password
	 * of the user (String) nick - Nick of the user. Set one if you want to
	 * anonymously connect but preset a nick. If jidOrHost is a domain and this
	 * param is not set, Judoonge will prompt for a nick.
	 */
    self.connect = function (jidOrHost, password, nick) {
        _connection.reset();
        _registerEventHandlers();

        _anonymousConnection = !_anonymousConnection ? jidOrHost
				&& jidOrHost.indexOf("@") < 0 : true;

        if (jidOrHost && password) {
            // authentication
            Judoonge.DEF.randomJidres = Judoonge.about.name
					+ Math.round(Math.random() * 1000) + "";

            if (Judoonge.DEF.randomJidres.length <= 7) {
                Judoonge.Core.log("7자리임...");
                Judoonge.DEF.randomJidres += "0";
                if (Judoonge.DEF.randomJidres.length <= 7) {
                    Judoonge.Core.log("6자리임...");
                    Judoonge.DEF.randomJidres += "0";
                }
            }

            var authFullJid = _getEscapedJidFromJid(jidOrHost) + '/'
					+ Judoonge.DEF.randomJidres;
            _connection.connect(authFullJid, password,
					Judoonge.Core.Event.Strophe.Connect);
            _user = new self.ChatUser(jidOrHost, Strophe
					.getNodeFromJid(jidOrHost));

        } else if (jidOrHost && nick) {
            self.log('[Judoonge.Core.connect] anonymous connect....');
            // anonymous connect
            _connection.connect(_getEscapedJidFromJid(jidOrHost) + '/'
					+ Judoonge.about.name, null,
					Judoonge.Core.Event.Strophe.Connect);
            _user = new self.ChatUser(null, nick); // set jid to null because
            // we'll later receive it
        } else if (jidOrHost) {
            Judoonge.Core.Event.Login(jidOrHost);
        } else {
            // display login modal
            Judoonge.Core.Event.Login();
        }
    };

    _getEscapedJidFromJid = function (jid) {
        var node = Strophe.getNodeFromJid(jid), domain = Strophe
				.getDomainFromJid(jid);
        return node ? Strophe.escapeNode(node) + '@' + domain : domain;
    };

    /**
	 * Function: attach Attach an already binded & connected session to the
	 * server
	 * 
	 * _See_ Strophe.Connection.attach
	 * 
	 * Parameters: (String) jid - Jabber ID (Integer) sid - Session ID (Integer)
	 * rid - rid
	 */
    self.attach = function (jid, sid, rid) {
        _user = new self.ChatUser(jid, Strophe.getNodeFromJid(jid));
        _registerEventHandlers();
        _connection.attach(jid, sid, rid, Judoonge.Core.Event.Strophe.Connect);
    };

    /**
	 * Function: disconnect Leave all rooms and disconnect
	 */
    self.disconnect = function () {
        if (_connection.connected) {
            $.each(self.getRooms(), function () {
                Judoonge.Core.Action.Jabber.Room.Leave(this.getJid());
            });
            _connection.disconnect();
        }
    };

    /**
	 * Function: addHandler Wrapper for Strophe.Connection.addHandler() to add a
	 * stanza handler for the connection.
	 * 
	 * Parameters: (Function) handler - The user callback. (String) ns - The
	 * namespace to match. (String) name - The stanza name to match. (String)
	 * type - The stanza type attribute to match. (String) id - The stanza id
	 * attribute to match. (String) from - The stanza from attribute to match.
	 * (String) options - The handler options
	 * 
	 * Returns: A reference to the handler that can be used to remove it.
	 */
    self.addHandler = function (handler, ns, name, type, id, from, options) {
        return _connection.addHandler(handler, ns, name, type, id, from,
				options);
    };

    /**
	 * Function: getUser Gets current user
	 * 
	 * Returns: Instance of Judoonge.Core.ChatUser
	 */
    self.getUser = function () {
        return _user;
    };

    /**
	 * Function: setUser Set current user. Needed when anonymous login is used,
	 * as jid gets retrieved later.
	 * 
	 * Parameters: (Judoonge.Core.ChatUser) user - User instance
	 */
    self.setUser = function (user) {
        _user = user;
    };

    /**
	 * Function: getConnection Gets Strophe connection
	 * 
	 * Returns: Instance of Strophe.Connection
	 */
    self.getConnection = function () {
        return _connection;
    };

    /**
	 * Function: getRooms Gets all joined rooms
	 * 
	 * Returns: Object containing instances of Judoonge.Core.ChatRoom
	 */
    self.getRooms = function () {
        return _rooms;
    };

    /**
	 * Function: isAnonymousConnection Returns true if <Judoonge.Core.connect>
	 * was first called with a domain instead of a jid as the first param.
	 * 
	 * Returns: (Boolean)
	 */
    self.isAnonymousConnection = function () {
        return _anonymousConnection;
    };
    self.isRegisterProc = function () {
        return _registerProc;
    };
    self.isResetTemp = function () {
        _registerProc = false;
    };

    /**
	 * Function: getOptions Gets options
	 * 
	 * Returns: Object
	 */
    self.getOptions = function () {
        return _options;
    };

    /**
	 * Function: getRoom Gets a specific room
	 * 
	 * Parameters: (String) roomJid - JID of the room
	 * 
	 * Returns: If the room is joined, instance of Judoonge.Core.ChatRoom,
	 * otherwise null.
	 */
    self.getRoom = function (roomJid) {
        if (_rooms[roomJid]) {
            return _rooms[roomJid];
        }
        return null;
    };

    /**
	 * Function: onWindowUnload window.onbeforeunload event which disconnects
	 * the client from the Jabber server.
	 */
    self.onWindowUnload = function () {
        // Enable synchronous requests because Safari doesn't send asynchronous
        // requests within unbeforeunload events.
        // Only works properly when following patch is applied to strophejs:
        // https://github.com/metajack/strophejs/issues/16/#issuecomment-600266
        _connection.sync = true;
        self.disconnect();
        _connection.flush();
    };

    /**
	 * Function: rawInput (Overridden from Strophe.Connection.rawInput)
	 * 
	 * Logs all raw input if debug is set to true.
	 */
    self.rawInput = function (data) {
        this.log('RECV: ' + data);
    };

    /**
	 * Function rawOutput (Overridden from Strophe.Connection.rawOutput)
	 * 
	 * Logs all raw output if debug is set to true.
	 */
    self.rawOutput = function (data) {
        this.log('SENT: ' + data);
    };

    /**
	 * Function: log Overridden to do something useful if debug is set to true.
	 * 
	 * See: Judoonge.Core#init
	 */
    self.log = function () {
    };

    return self;
}(Judoonge.Core || {}, Strophe, jQuery));
/**
 * File: view.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.View The Judoonge View Class
 * 
 * Parameters: (Judoonge.View) self - itself (jQuery) $ - jQuery
 */
Judoonge.View = (function (self, $) {
    /**
	 * PrivateObject: _current Object containing current container & roomJid
	 * which the client sees.
	 */
    var _current = {
        container: null,
        roomJid: null
    },
	/**
	 * PrivateObject: _options
	 * 
	 * Options: (String) language - language to use (String) resources - path to
	 * resources directory (with trailing slash) (Object) messages - limit:
	 * clean up message pane when n is reached / remove: remove n messages after
	 * limit has been reached (Object) crop - crop if longer than defined:
	 * message.nickname=15, message.body=1000, roster.nickname=15
	 */
	_options = {
	    language: 'en',
	    resources: 'res/',
	    messages: {
	        limit: 2000,
	        remove: 500
	    },
	    crop: {
	        message: {
	            nickname: 15,
	            body: 1000
	        },
	        roster: {
	            nickname: 15
	        }
	    }
	},

	/**
	 * PrivateFunction: _setupTranslation Set dictionary using jQuery.i18n
	 * plugin.
	 * 
	 * See: view/translation.js See: libs/jquery-i18n/jquery.i18n.js
	 * 
	 * Parameters: (String) language - Language identifier
	 */
	_setupTranslation = function (language) {
	    $.i18n.setDictionary(self.Translation[language]);
	},

	/**
	 * PrivateFunction: _registerObservers Register observers. Judoonge core
	 * will now notify the View on changes.
	 */
	_registerObservers = function () {
	    Judoonge.Core.Event.addObserver(Judoonge.Core.Event.KEYS.CHAT,
				self.Observer.Chat);
	    Judoonge.Core.Event.addObserver(Judoonge.Core.Event.KEYS.PRESENCE,
				self.Observer.Presence);
	    Judoonge.Core.Event.addObserver(
				Judoonge.Core.Event.KEYS.PRESENCE_ERROR,
				self.Observer.PresenceError);
	    Judoonge.Core.Event.addObserver(Judoonge.Core.Event.KEYS.MESSAGE,
				self.Observer.Message);
	    Judoonge.Core.Event.addObserver(Judoonge.Core.Event.KEYS.LOGIN,
				self.Observer.Login);
	    Judoonge.Core.Event.addObserver(Judoonge.Core.Event.KEYS.MAINLIST,
				self.Observer.mainList);
	    Judoonge.Core.Event.addObserver(
				Judoonge.Core.Event.KEYS.FRIEND_MANAGER,
				self.Observer.friendManager);
	    Judoonge.Core.Event.addObserver(Judoonge.Core.Event.KEYS.CHATINFO,
				self.Observer.chatInfo);
	},

	/**
	 * PrivateFunction: _registerWindowHandlers Register window focus / blur /
	 * resize handlers.
	 * 
	 * jQuery.focus()/.blur() <= 1.5.1 do not work for IE < 9. Fortunately
	 * onfocusin/onfocusout will work for them.
	 */
	_registerWindowHandlers = function () {
	    // Cross-browser focus handling
	    if ($.browser.msie && !$.browser.version.match('^9')) {
	        $(document).focusin(Judoonge.View.Pane.Window.onFocus).focusout(
					Judoonge.View.Pane.Window.onBlur);
	    } else {
	        $(window).focus(Judoonge.View.Pane.Window.onFocus).blur(
					Judoonge.View.Pane.Window.onBlur);
	    }
	    $(window).resize(Judoonge.View.Pane.Chat.fitTabs);
	},

	/**
	 * PrivateFunction: _registerToolbarHandlers Register toolbar handlers and
	 * disable sound if cookie says so.
	 */
	_registerToolbarHandlers = function () {
	    $('#emoticons-icon').click(function (e) {
	        self.Pane.Chat.Context.showEmoticonsMenu(e.currentTarget);
	        e.stopPropagation();
	    });
	},

	/**
	 * PrivateFunction: _delegateTooltips Delegate mouseenter on tooltipified
	 * element to <Judoonge.View.Pane.Chat.Tooltip.show>.
	 */
	_delegateTooltips = function () {
	    $('body').delegate('li[data-tooltip]', 'mouseenter',
				Judoonge.View.Pane.Chat.Tooltip.show);
	};

    /**
	 * Function: init Initialize chat view (setup DOM, register handlers &
	 * observers)
	 * 
	 * Parameters: (jQuery.element) container - Container element of the whole
	 * chat view (Object) options - Options: see _options field (value passed
	 * here gets extended by the default value in _options field)
	 */
    self.init = function (container, options) {
        $.extend(true, _options, options);
        _setupTranslation(_options.language);

        // Set path to emoticons
        // Judoonge.Util.Parser.setEmoticonPath(this.getOptions().resources +
        // 'img/emoticons/');
        Judoonge.Util.Parser.setEmoticonPath('images/Emoticons/');

        // ... and let the elements dance.
        _registerWindowHandlers();
        _registerToolbarHandlers();
        _registerObservers();
        _delegateTooltips();
    };

    /**
	 * Function: getCurrent Get current container & roomJid in an object.
	 * 
	 * Returns: Object containing container & roomJid
	 */
    self.getCurrent = function () {
        return _current;
    };

    /**
	 * Function: getOptions Gets options
	 * 
	 * Returns: Object
	 */
    self.getOptions = function () {
        return _options;
    };

    return self;
}(Judoonge.View || {}, jQuery));

Judoonge.Util = (function (self, $) {
    self.jidToId = function (jid) {
        return MD5.hexdigest(jid);
    };

    self.escapeJid = function (jid) {
        var node = Strophe.escapeNode(Strophe.getNodeFromJid(jid)), domain = Strophe
				.getDomainFromJid(jid), resource = Strophe
				.getResourceFromJid(jid);

        jid = node + '@' + domain;
        if (resource) {
            jid += '/' + Strophe.escapeNode(resource);
        }

        return jid;
    };

    self.unescapeJid = function (jid) {
        var node = Strophe.unescapeNode(Strophe.getNodeFromJid(jid)), domain = Strophe
				.getDomainFromJid(jid), resource = Strophe
				.getResourceFromJid(jid);

        jid = node + '@' + domain;
        if (resource) {
            jid += '/' + Strophe.unescapeNode(resource);
        }

        return jid;
    };

    /**
	 * Function: crop Crop a string with the specified length
	 * 
	 * Parameters: (String) str - String to crop (Integer) len - Max length
	 */
    self.crop = function (str, len) {
        if (str.length > len) {
            str = str.substr(0, len - 3) + '...';
        }
        return str;
    };

    /**
	 * Function: setCookie Sets a new cookie
	 * 
	 * Parameters: (String) name - cookie name (String) value - Value (Integer)
	 * lifetime_days - Lifetime in days
	 */
    self.setCookie = function (name, value, lifetime_days) {
        var exp = new Date();
        exp.setDate(new Date().getDate() + lifetime_days);
        document.cookie = name + '=' + value + ';expires=' + exp.toUTCString()
				+ ';path=/';
    };

    /**
	 * Function: cookieExists Tests if a cookie with the given name exists
	 * 
	 * Parameters: (String) name - Cookie name
	 * 
	 * Returns: (Boolean) - true/false
	 */
    self.cookieExists = function (name) {
        return document.cookie.indexOf(name) > -1;
    };

    /**
	 * Function: getCookie Returns the cookie value if there's one with this
	 * name, otherwise returns undefined
	 * 
	 * Parameters: (String) name - Cookie name
	 * 
	 * Returns: Cookie value or undefined
	 */
    self.getCookie = function (name) {
        if (document.cookie) {
            var regex = new RegExp(escape(name) + '=([^;]*)', 'gm'), matches = regex
					.exec(document.cookie);
            if (matches) {
                return matches[1];
            }
        }
    };

    /**
	 * Function: deleteCookie Deletes a cookie with the given name
	 * 
	 * Parameters: (String) name - cookie name
	 */
    self.deleteCookie = function (name) {
        document.cookie = name + '=;expires=Thu, 01-Jan-70 00:00:01 GMT;path=/';
    };

    /**
	 * Function: getPosLeftAccordingToWindowBounds Fetches the window width and
	 * element width and checks if specified position + element width is bigger
	 * than the window width.
	 * 
	 * If this evaluates to true, the position gets substracted by the element
	 * width.
	 * 
	 * Parameters: (jQuery.Element) elem - Element to position (Integer) pos -
	 * Position left
	 * 
	 * Returns: Object containing `px` (calculated position in pixel) and
	 * `alignment` (alignment of the element in relation to pos, either 'left'
	 * or 'right')
	 */
    self.getPosLeftAccordingToWindowBounds = function (elem, pos) {
        var windowWidth = $(document).width(), elemWidth = elem.outerWidth(), marginDiff = elemWidth
				- elem.outerWidth(true), backgroundPositionAlignment = 'left';

        if (pos + elemWidth >= windowWidth) {
            pos -= elemWidth - marginDiff;
            backgroundPositionAlignment = 'right';
        }

        return {
            px: pos,
            backgroundPositionAlignment: backgroundPositionAlignment
        };
    };

    /**
	 * Function: getPosTopAccordingToWindowBounds Fetches the window height and
	 * element height and checks if specified position + element height is
	 * bigger than the window height.
	 * 
	 * If this evaluates to true, the position gets substracted by the element
	 * height.
	 * 
	 * Parameters: (jQuery.Element) elem - Element to position (Integer) pos -
	 * Position top
	 * 
	 * Returns: Object containing `px` (calculated position in pixel) and
	 * `alignment` (alignment of the element in relation to pos, either 'top' or
	 * 'bottom')
	 */
    self.getPosTopAccordingToWindowBounds = function (elem, pos) {
        var windowHeight = $(document).height(), elemHeight = elem
				.outerHeight(), marginDiff = elemHeight
				- elem.outerHeight(true), backgroundPositionAlignment = 'top';

        if (pos + elemHeight >= windowHeight) {
            pos -= elemHeight - marginDiff;
            backgroundPositionAlignment = 'bottom';
        }

        return {
            px: pos,
            backgroundPositionAlignment: backgroundPositionAlignment
        };
    };

    /**
	 * Function: localizedTime Localizes ISO-8610 Date with the time/dateformat
	 * specified in the translation.
	 * 
	 * See: libs/dateformat/dateFormat.js See: src/view/translation.js See:
	 * jquery-i18n/jquery.i18n.js
	 * 
	 * Parameters: (String) dateTime - ISO-8610 Datetime
	 * 
	 * Returns: If current date is equal to the date supplied, format with
	 * timeFormat, otherwise with dateFormat
	 */
    self.localizedTime = function (dateTime) {
        if (dateTime === undefined) {
            return undefined;
        }

        var date = self.iso8601toDate(dateTime);
        if (date.toDateString() === new Date().toDateString()) {
            return date.format($.i18n._('timeFormat'));
        } else {
            return date.format($.i18n._('dateFormat'));
        }
    };

    self.localTimeJudoonge = function (dateTime) {
        if (dateTime === undefined) {
            return undefined;
        }
        var date = self.iso8601toDate(dateTime);
        // var timeDate = date.getHours() + date.getMinutes().toString() +
        // date.getSeconds()+ date.getMilliseconds().toString();
        var timeDate = date.getTime();
        return timeDate;
    };

    /**
	 * Function: iso8610toDate Parses a ISO-8610 Date to a Date-Object.
	 * 
	 * Uses a fallback if the client's browser doesn't support it.
	 * 
	 * Quote: ECMAScript revision 5 adds native support for ISO-8601 dates in
	 * the Date.parse method, but many browsers currently on the market (Safari
	 * 4, Chrome 4, IE 6-8) do not support it.
	 * 
	 * Credits: <Colin Snover at
	 * http://zetafleet.com/blog/javascript-dateparse-for-iso-8601>
	 * 
	 * Parameters: (String) date - ISO-8610 Date
	 * 
	 * Returns: Date-Object
	 */
    self.iso8601toDate = function (date) {
        var timestamp = Date.parse(date), minutesOffset = 0;
        if (isNaN(timestamp)) {
            var struct = /^(\d{4}|[+\-]\d{6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?))?/
					.exec(date);
            if (struct) {
                if (struct[8] !== 'Z') {
                    minutesOffset = +struct[10] * 60 + (+struct[11]);
                    if (struct[9] === '+') {
                        minutesOffset = -minutesOffset;
                    }
                }
                return new Date(+struct[1], +struct[2] - 1, +struct[3],
						+struct[4], +struct[5] + minutesOffset, +struct[6],
						struct[7] ? +struct[7].substr(0, 3) : 0);
            } else {
                // XEP-0091 date
                timestamp = Date.parse(date.replace(/^(\d{4})(\d{2})(\d{2})/,
						'$1-$2-$3')
						+ 'Z');
            }
        }
        return new Date(timestamp);
    };

    /**
	 * Function: isEmptyObject IE7 doesn't work with jQuery.isEmptyObject (<=1.5.1),
	 * workaround.
	 * 
	 * Parameters: (Object) obj - the object to test for
	 * 
	 * Returns: Boolean true or false.
	 */
    self.isEmptyObject = function (obj) {
        var prop;
        for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                return false;
            }
        }
        return true;
    };

    /**
	 * Function: forceRedraw Fix IE7 not redrawing under some circumstances.
	 * 
	 * Parameters: (jQuery.element) elem - jQuery element to redraw
	 */
    self.forceRedraw = function (elem) {
        elem.css({
            display: 'none'
        });
        setTimeout(function () {
            this.css({
                display: 'block'
            });
        }.bind(elem), 1);
    };

    /**
	 * Function: timer 초시계
	 * 
	 */
    var secondTime = 0;
    var timer;
    var sec = 0;
    var min = 0;
    var hours = 0;
    var days = 0;
    self.timer = {
        startTimer: function (roomJid) {
            secondTime = 0;
            timer = null;
            sec = 0;
            min = 0;
            hours = 0;
            days = 0;
            timer = setInterval(function () {

                secondTime += 1000;
                sec = Math.floor(secondTime / 1000);
                min = Math.floor(sec / 60);
                hours = Math.floor(min / 60);
                days = Math.floor(hours / 24);
                $("#vConnectTxt-" + roomJid)
						.text(
								zeroText((hours % 24) + (days * 24)) + ":"
										+ zeroText(min % 60) + ":"
										+ zeroText(sec % 60));
                $("#vConnectTxt2-" + roomJid)
						.text(
								zeroText((hours % 24) + (days * 24)) + ":"
										+ zeroText(min % 60) + ":"
										+ zeroText(sec % 60));
            }, 1000);
            function zeroText(value) {
                if (value < 10) {
                    return "0" + value;
                } else {
                    return value;
                }
            }
        },
        endTimer: function (roomJid) {
            clearInterval(timer);
            secondTime = 0;
            sec = 0;
            min = 0;
            hours = 0;
            days = 0;
            $("#vConnectTxt-" + roomJid).text("00:00:00");
            $("#vConnectTxt2-" + roomJid).text("00:00:00");
        },
    };

    self.sessionStorageSave = function (key, value) {
        sessionStorage[key] = value;
    };

    self.sessionStorageGet = function (key) {
        return sessionStorage[key];
    };

    self.ClearStorage = function () {
        sessionStorage.clear();
    };

    /**
	 * Class: Judoonge.Util.Parser Parser for emoticons, links and also supports
	 * escaping.
	 */
    self.Parser = {
        /**
		 * PrivateVariable: _emoticonPath Path to emoticons.
		 * 
		 * Use setEmoticonPath() to change it
		 */
        _emoticonPath: '',

        /**
		 * Function: setEmoticonPath Set emoticons location.
		 * 
		 * Parameters: (String) path - location of emoticons with trailing slash
		 */
        setEmoticonPath: function (path) {
            this._emoticonPath = path;
        },

        /**
		 * Array: emoticons Array containing emoticons to be replaced by their
		 * images.
		 * 
		 * Can be overridden/extended.
		 */
        emoticons: [{//
            plain: ':)',
            regex: /((\s):-?\)|:-?\)(\s|$))/gm,
            image: 'android_happy.png'
        }, {//
            plain: ';)',
            regex: /((\s);-?\)|;-?\)(\s|$))/gm,
            image: 'android_wink.png'
        }, {//
            plain: ':D',
            regex: /((\s):-?D|:-?D(\s|$))/gm,
            image: 'android_big_grin.png'
        }, {
            plain: ';D',
            regex: /((\s);-?D|;-?D(\s|$))/gm,
            image: 'Grinning_Winking.png'
        }, {//
            plain: ':$',
            regex: /((\s):-?\$|:-?\$(\s|$))/igm,
            image: 'android_embarrassed.png'
        }, {//
            plain: ':(',
            regex: /((\s):-?\(|:-?\((\s|$))/gm,
            image: 'android_sad.png'
        }, {//
            plain: ':P',
            regex: /((\s):-?P|:-?P(\s|$))/igm,
            image: 'android_stick-out_tongue.png'
        }, {//
            plain: ':/',
            regex: /((\s):-?\/|:-?\/(\s|$))/gm,
            image: 'android_confunsed.png'
        }, {//
            plain: ':x',
            regex: /((\s):x|:x(\s|$))/igm,
            image: 'android_no_speak.png'
        }, {//
            plain: '$[]',
            regex: /((\s)\$\[-?\]|\$\[-?\](\s|$))/igm,
            image: 'android_sick.png'
        }, {//
            plain: '(TH)',
            regex: /((\s)\(-?TH-?\)|\(-?TH-?\)(\s|$))/igm,
            image: 'android_thinking.png'
        }, {//
            plain: 'o[]',
            regex: /((\s)o\[-?\]|o\[-?\](\s|$))/igm,
            image: 'android_sleepy.png'
        }, {//
            plain: ':*',
            regex: /((\s):-?\*|:-?\*(\s|$))/gm,
            image: 'android_kiss.png'
        }, {//
            plain: ':O',
            regex: /((\s):O|:O(\s|$))/igm,
            image: 'android_surprised.png'
        }, {//
            plain: ':@',
            regex: /((\s):-?@|:-?@(\s|$))/gm,
            image: 'android_angry.png'
        }, {//
            plain: 'BO)',
            regex: /((\s)BO-?\)|BO?\)(\s|$))/igm,
            image: 'android_sunglasses.png'
        }, {//
            plain: ':s',
            regex: /((\s):s|:s(\s|$))/igm,
            image: 'android_worried.png'
        }, {//
            plain: ']:)',
            regex: /((\s)\]-?:-?\)|\]-?:-?\)(\s|$))/gm,
            image: 'android_devilish.png'
        }, {//
            plain: '[(',
            regex: /((\s)\[-?\(|\[-?\((\s|$))/gm,
            image: 'android_crying.png'
        }, {//
            plain: ':))',
            regex: /((\s):-?\)-?\)|:-?\)-?\)(\s|$))/gm,
            image: 'android_laughing.png'
        }, {//
            plain: ':I',
            regex: /((\s):I|:I(\s|$))/igm,
            image: 'android_disappointed.png'
        }, {//
            plain: 'o:)',
            regex: /((\s)o:-?\)|o:-?\)(\s|$))/igm,
            image: 'android_angel.png'
        }, {//
            plain: ':B',
            regex: /((\s):B|:B(\s|$))/igm,
            image: 'android_nerd.png'
        }, {//
            plain: '8)',
            regex: /((\s)8-?\)|8-?\)(\s|$))/gm,
            image: 'android_rolling_eyes.png'
        }, {//
            plain: ':o)',
            regex: /((\s):-?o-?\)|:-?o-?\)(\s|$))/igm,
            image: 'android_raised_eyebrow.png'
        }, {//
            plain: '<3',
            regex: /((\s)&lt;3|&lt;3(\s|$))/gm,
            image: 'android_heart.png'
        }, {//
            plain: '@):',
            regex: /((\s)@-?\)-?:|@-?\)-?:(\s|$))/gm,
            image: 'android_flower.png'
        }, {//
            plain: '~o)',
            regex: /((\s)~-?o-?\)|~-?o-?\)(\s|$))/igm,
            image: 'android_cup_of_coffee.png'
        }, {//
            plain: ')~l',
            regex: /((\s)\)-?~-?l|\)-?~-?l(\s|$))/igm,
            image: 'android_cup_of_coffee.png'
        }, {//
            plain: '*:)',
            regex: /((\s)\*-?:-?\)|\*-?:-?\)(\s|$))/igm,
            image: 'android_idea.png'
        }, {//
            plain: 'q!p',
            regex: /((\s)q!-?p|q!-?p(\s|$))/igm,
            image: 'android_brocken_heart.png'
        }, {//
            plain: ')m(',
            regex: /((\s)\)-?m\(|\)-?m\((\s|$))/igm,
            image: 'android_rock_on.png'
        }, {//
            plain: '8~}',
            regex: /((\s)8-?~-?\}|8-?~-?\}(\s|$))/igm,
            image: 'android_silly.png'
        }, {//
            plain: ':ar!',
            regex: /((\s):-?ar!|:-?ar!(\s|$))/igm,
            image: 'android_pirate.png'
        }, {//
            plain: '=D',
            regex: /((\s)=-?D|=-?D(\s|$))/igm,
            image: 'android_applause.png'
        }, {//
            plain: '<(")',
            regex: /((\s)&lt;-?\(-?\"-?\)|&lt;-?\(-?\"-?\)(\s|$))/gm,
            image: 'android_penguin.png'
        }, {//
            plain: 'd*d',
            regex: /((\s)d-?\*-?d|d-?\*-?d(\s|$))/igm,
            image: 'android_music_note.png'
        }, {//
            plain: '(BE)',
            regex: /((\s)\(-?BE-?\)|\(-?BE-?\)(\s|$))/igm,
            image: 'android_beer.png'
        }, {//
            plain: ':8)',
            regex: /((\s):-?8-?\)|:-?8-?\)(\s|$))/gm,
            image: 'android_pig.png'
        }, {//
            plain: '<o)',
            regex: /((\s)&lt;-?o-?\)|&lt;-?o-?\)(\s|$))/igm,
            image: 'android_party!.png'
        }, {//
            plain: '(~)',
            regex: /((\s)\(-?~-?\)|\(-?~-?\)(\s|$))/gm,
            image: 'android_film.png'
        }, {//
            plain: '(^)',
            regex: /((\s)\(-?\^-?\)|\(-?\^-?\)(\s|$))/gm,
            image: 'android_cake.png'
        }, {//
            plain: '(ST)',
            regex: /((\s)\(-?ST-?\)|\(-?ST-?\)(\s|$))/igm,
            image: 'android_raincloud.png'
        }, {//
            plain: '(UM)',
            regex: /((\s)\(-?UM-?\)|\(-?UM-?\)(\s|$))/igm,
            image: 'android_umbrella.png'
        }, {//
            plain: '(SU)',
            regex: /((\s)\(-?SU-?\)|\(-?SU-?\)(\s|$))/igm,
            image: 'android_sun.png'
        }, {//
            plain: '(PI)',
            regex: /((\s)\(-?PI-?\)|\(-?PI-?\)(\s|$))/igm,
            image: 'android_pizza.png'
        }, {//
            plain: '(MO)',
            regex: /((\s)\(-?MO-?\)|\(-?MO-?\)(\s|$))/igm,
            image: 'android_money.png'
        }, {//
            plain: '(CL)',
            regex: /((\s)\(-?CL-?\)|\(-?CL-?\)(\s|$))/igm,
            image: 'android_clock.png'
        }, {//
            plain: '(GI)',
            regex: /((\s)\(-?GI-?\)|\(-?GI-?\)(\s|$))/igm,
            image: 'android_gift.png'
        }, {//
            plain: '(PH)',
            regex: /((\s)\(-?PH-?\)|\(-?PH-?\)(\s|$))/igm,
            image: 'android_phone.png'
        }, {//
            plain: '(EM)',
            regex: /((\s)\(-?EM-?\)|\(-?EM-?\)(\s|$))/igm,
            image: 'android_email.png'
        }, {//
            plain: '(SH)',
            regex: /((\s)\(-?SH-?\)|\(-?SH-?\)(\s|$))/igm,
            image: 'android_sheep.png'
        }, {//
            plain: '(PL)',
            regex: /((\s)\(-?PL-?\)|\(-?PL-?\)(\s|$))/igm,
            image: 'android_aeroplane.png'
        }, {//
            plain: '(**)',
            regex: /((\s)\(-?\*\*-?\)|\(-?\*\*-?\)(\s|$))/gm,
            image: 'android_star.png'
        }, {//
            plain: ':H',
            regex: /((\s):-?H|:-?H(\s|$))/igm,
            image: 'android_wave.png'
        }, {//
            plain: '<D',
            regex: /((\s)&lt;-?D|&lt;-?D(\s|$))/igm,
            image: 'android_big_hug.png'
        }

        ],

        /**
		 * Function: emotify Replaces text-emoticons with their image
		 * equivalent.
		 * 
		 * Parameters: (String) text - Text to emotify
		 * 
		 * Returns: Emotified text
		 */
        emotify: function (text) {
            var i;
            for (i = this.emoticons.length - 1; i >= 0; i--) {
                // text = text.replace(this.emoticons[i].regex, '$2<img
                // class="emoticon" alt="$1" src="' + this._emoticonPath +
                // this.emoticons[i].image + '" />$3');
                text = text.replace(this.emoticons[i].regex, "$2 <img src="
						+ this._emoticonPath + this.emoticons[i].image
						+ " /> $3");
            }
            // position
            return text;
        },

        /**
		 * Function: linkify Replaces URLs with a HTML-link.
		 * 
		 * Parameters: (String) text - Text to linkify
		 * 
		 * Returns: Linkified text
		 */
        linkify: function (text) {
            text = text.replace(/(^|[^\/])(www\.[^\.]+\.[\S]+(\b|$))/gi,
					'$1http://$2');
            return text
					.replace(
							/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig,
							'<a href="$1" target="_blank">$1</a>');
        },

        /**
		 * Function: escape Escapes a text using a jQuery function (like
		 * htmlspecialchars in PHP)
		 * 
		 * Parameters: (String) text - Text to escape
		 * 
		 * Returns: Escaped text
		 */
        escape: function (text) {
            return $('<div/>').text(text).html();
        },
        imgReplace: function (text) {
            // text = text.replace("&lt;img ","<img ");
            // text = text.replace(" /&gt;"," />");
            text = text.replace(/(&lt;img )/g, "<img ").replace(/( \/&gt;)/g,
					" />").replace(/(\n)/g, "<br>"); // img tag 처리
            // text = text.replace(/(&lt;span )/g,"<span ").replace(/(
            // def&gt;)/g," >").replace(/(&lt;\/span&gt;)/g,"</span>"); // span
            // tag 처리
            // text = this.shareProcess(text);
            Judoonge.Core.log("[imgReplace] Message -> " + text);
            return text;
        },

        shareProcess: function (text) {
            var shareInfo, shareVal;

            // 위치/문서/파일/사진 공유 처리
            if (text.match(Strophe.DEF.SHARE_DOCUMENT)) {
                // 문서공유 처리
                Judoonge.Core.log("[ShareDocument] Message start...-> " + text);
                // shareInfo = text.split(Strophe.DEF.SHARE_SEPARATOR);
                // shareVal = shareInfo[1].split(Strophe.DEF.VALUE_SEPARATOR);
                // // 파일이름#파일갯수 split
                // text = "<img src=./images/chatting/documentIcon.png
                // onclick=viewDocument('"+Judoonge.serverInfo.documentDomain+"','"+shareVal[0]+"',"+shareVal[1]+");
                // />";
                text = "문서가 공유되었습니다.";
                Judoonge.Core.log("[ShareDocument] Message end...-> " + text);
            } else if (text.match(Strophe.DEF.SHARE_DOCUMENT_PAGE)) {
                // DDocumentPage@@document-14767##2##5
                Judoonge.Core.log("[ShareDocumentPage] Message start...-> "
						+ text);
                shareVal = text.split(Strophe.DEF.VALUE_SEPARATOR); // filename##curPage##Totalpage
                text = "공유문서 " + shareVal[1] + "페이지로 이동합니다.";
                Judoonge.Core.log("[ShareDocumentPage] Message end...-> "
						+ text);
            } else if (text.match(Strophe.DEF.SHARE_FILE)) {
                // 파일공유
                Judoonge.Core.log("[ShareFILE] Message start... -> " + text);
                shareInfo = text.split(Strophe.DEF.SHARE_SEPARATOR);
                // text = "<img src=./images/chatting/fileIcon.png
                // onclick=viewFile('"+Judoonge.serverInfo.fileDomain+"','"+shareInfo[1]+"');
                // />";
                text = "파일이 공유 되었습니다. <img src=./images/common/file.png onclick=viewFile('"
						+ Judoonge.serverInfo.fileDomain
						+ "','"
						+ shareInfo[1]
						+ "'); />";
                // text = "<img src=./images/chatting/fileIcon.png
                // onclick=window.open('"+Judoonge.serverInfo.fileDomain+shareInfo[1]+"')
                // />";
                Judoonge.Core.log("[ShareFILE] Message end... -> " + text);
            } else if (text.match(Strophe.DEF.SHARE_PICTURE)) {
                // 사진공유
                Judoonge.Core.log("[SharePicture] Message start..-> " + text);
                shareInfo = text.split(Strophe.DEF.SHARE_SEPARATOR);
                text = "<img width=40 height=40 src="
						+ Judoonge.serverInfo.pictureDomain + shareInfo[1]
						+ " onclick=viewPicture('"
						+ Judoonge.serverInfo.pictureDomain + "','"
						+ shareInfo[1] + "'); />";
                Judoonge.Core.log("[SharePicture] Message end..-> " + text);
            } else if (text.match(Strophe.DEF.SHARE_POSITION)) {
                // 위치공유
                Judoonge.Core.log("[SharePosition] Message start -> " + text);
                shareInfo = text.split(Strophe.DEF.SHARE_SEPARATOR); // name@value
                // split
                shareVal = shareInfo[1].split(Strophe.DEF.VALUE_SEPARATOR); // X좌표#Y좌표
                // split
                // text = "<img src=./images/chatting/locationIcon.png
                // onclick='javascript:viewMap(" + shareVal[0] + "," +
                // shareVal[1] + "," + shareVal[2] + ");' \>";
                // text = "<img src=./images/chatting/locationIcon.png
                // onclick=viewMap("+shareVal[0]+","+shareVal[1]+",'"+shareVal[2]+"');
                // />";
                text = "위치가 공유 되었습니다. <img width=30 height=25 src=./images/chatting/positionShareIcon01.png onclick=viewMap("
						+ shareVal[0]
						+ ","
						+ shareVal[1]
						+ ",'"
						+ shareVal[2]
						+ "'); />";
                Judoonge.Core.log("[SharePosition] Message end -> " + text);
            }

            return text;
        },

        /**
		 * Function: all Does everything of the parser: escaping, linkifying and
		 * emotifying.
		 * 
		 * Parameters: (String) text - Text to parse
		 * 
		 * Returns: Parsed text
		 */
        all: function (text) {
            if (text) {
                text = this.escape(text);
                text = this.linkify(text);
                text = this.emotify(text);
                // text = "<img class='emoticon' alt=' :)'
                // src='images/emoticons/android_happy.png'>";
                // 문서/위치/파일/위치 공유 처리 부분 추가
                text = this.shareProcess(text);
            }
            return text;
        }
    };

    return self;
}(Judoonge.Util || {}, jQuery));

/**
 * Class: Judoonge.Util.Observable A class can be extended with the observable
 * to be able to notify observers
 */
Judoonge.Util.Observable = (function (self) {
    /**
	 * PrivateObject: _observers List of observers
	 */
    var _observers = {};

    /**
	 * Function: addObserver Add an observer to the observer list
	 * 
	 * Parameters: (String) key - The key the observer listens to (Callback) obj -
	 * The observer callback
	 */
    self.addObserver = function (key, obj) {
        if (_observers[key] === undefined) {
            _observers[key] = [];
        }
        _observers[key].push(obj);
    };

    /**
	 * Function: deleteObserver Delete observer from list
	 * 
	 * Parameters: (String) key - Key in which the observer lies (Callback) obj -
	 * The observer callback to be deleted
	 */
    self.deleteObserver = function (key, obj) {
        delete _observers[key][obj];
    };

    /**
	 * Function: clearObservers Deletes all observers in list
	 * 
	 * Parameters: (String) key - If defined, remove observers of this key,
	 * otherwise remove all including all keys.
	 */
    self.clearObservers = function (key) {
        if (key !== undefined) {
            _observers[key] = [];
        } else {
            _observers = {};
        }
    };

    /**
	 * Function: notifyObservers Notify all of its observers of a certain event.
	 * 
	 * Parameters: (String) key - Key to notify (Object) arg - An argument
	 * passed to the update-method of the observers
	 */
    self.notifyObservers = function (key, arg) {
        // maverick
        Judoonge.Core
				.log(">> Judoonge.Util.Observable -> notifyObservers() key : "
						+ key);
        var observer = _observers[key], i;
        for (i = observer.length - 1; i >= 0; i--) {
            observer[i].update(self, arg);
        }
    };

    return self;
}(Judoonge.Util.Observable || {}));
/**
 * File: action.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.Core.Action Chat Actions (basicly a abstraction of Jabber
 * commands)
 * 
 * Parameters: (Judoonge.Core.Action) self - itself (Strophe) Strophe - Strophe
 * (jQuery) $ - jQuery
 */
Judoonge.Core.Action = (function (self, Strophe, $) {

    /**
	 * Class: Judoonge.Core.Action.Jabber Jabber actions
	 */
    self.Jabber = {
        /**
		 * Function: Version Replies to a version request
		 * 
		 * Parameters: (jQuery.element) msg - jQuery element
		 */
        Version: function (msg) {
            Judoonge.Core.log("Core.Action.Version() start ...");
            Judoonge.Core.getConnection().send($iq({
                type: 'result',
                to: msg.attr('from'),
                from: msg.attr('to'),
                id: msg.attr('id')
            }).c('query', {
                name: Judoonge.about.name,
                version: Judoonge.about.version,
                os: navigator.userAgent
            }));
            Judoonge.Core.log("Core.Action.Version() end ...");
        },

        /**
		 * Function: Roster Sends a request for a roster
		 */
        Roster: function () {
            Judoonge.Core.log("Core.Action.Roster() start ...");
            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                xmlns: Strophe.NS.CLIENT
            }).c('query', {
                xmlns: Strophe.NS.ROSTER
            }).tree());
            Judoonge.Core.log("Core.Action.Roster() end ...");
        },

        /**
		 * Function: Presence Sends a request for presence
		 * 
		 * Parameters: (Object) attr - Optional attributes
		 */
        Presence: function (attr) {
            // maverick
            Judoonge.Core.log("Core.Action.Presence() start -> attr : " + attr);
            Judoonge.Core.getConnection().send($pres(attr).tree());
            Judoonge.Core.log("Core.Action.Presence() end -> attr : " + attr);
        },

        /**
		 * Function: buddyList Sends a request for buddy List Info
		 * 
		 * Parameters: (string) actionID - 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 */
        buddyList: function (actionID) {
            // maverick
            Judoonge.Core.log("[Judoonge.Core.Action] buddyList start...");

            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                id: actionID
            })
			// Judoonge.Core.getConnection().send($iq({type: 'get', from:
			// Judoonge.Core.getUser().getJid(), id: Strophe.ID.BUDDY_LIST})
			.c('query', {
			    xmlns: Strophe.NS.ROSTER
			}).tree());
            Judoonge.Core.log("[Judoonge.Core.Action] buddyList end...");
            return true;
        },

        privacyInfoGet: function (actionID) {
            Judoonge.Core.log("[Judoonge.Core.Action] privacyInfoGet start...");

            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.PRIVACY_INFO_GET
            }).c('query', {
                xmlns: Strophe.NS.PRIVACY
            }).c('active', {
                name: "ignore"
            }).tree());

            Judoonge.Core.log("[Judoonge.Core.Action] privacyInfoSet end...");
            return true;
        },
        privacyInfoSet: function (actionID) {
            Judoonge.Core.log("[Judoonge.Core.Action] privacyInfoSet start...");

            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.PRIVACY_INFO_SET
            }).c('query', {
                xmlns: Strophe.NS.PRIVACY
            }).c('active', {
                name: "ignore"
            }).tree());

            Judoonge.Core.log("[Judoonge.Core.Action] privacyInfoSet end...");
            return true;
        },

        /**
		 * Function: discoMucRoomsGet Sends a request for Entity Queries Chat
		 * Service for Rooms
		 * 
		 * Parameters: (string) actionID - 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 */
        discoMucRoomsGet: function (actionID) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] discoMucRoomsGet start...");

            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                to: Judoonge.serverInfo.conferenDomain,
                id: actionID
            }).c('query', {
                xmlns: Strophe.NS.DISCO_ITEMS
            }).tree());

            Judoonge.Core.log("[Judoonge.Core.Action] discoMucRoomsGet end...");
            return true;
        },

        discoMucRoomUsersGet: function (roomJid, actionID) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] discoMucRoomUsersGet start...roomJid : "
							+ roomJid);

            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                to: roomJid,
                id: actionID
            }).c('query', {
                xmlns: Strophe.NS.DISCO_ITEMS
            }).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] discoMucRoomUsersGet end...roomJid : "
							+ roomJid);
            return true;
        },

        // 대화명 메세지를 상태메세지로 처리
        presenceStatusSave: function (statusMsg) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceStatusSave start...msg : "
							+ statusMsg);

            Judoonge.Core.getConnection().send($pres({
                from: Judoonge.Core.getUser().getJid()
            }).c('status', statusMsg).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceStatusSave end...msg : "
							+ statusMsg);
            return true;
        },

        presenceContactRequest: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceContactRequest start...");

            Judoonge.Core.getConnection().send($pres({
                type: Strophe.DEF.PRES_TYPE_SUBSCRIBE,
                from: Judoonge.Core.getUser().getJid(),
                to: contactJid
            }).tree());
            Judoonge.DEF.PresReqFlag = 1; // 승인요청을 핑퐁 치지 않도록 flag 설정
            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceContactRequest end...");
            return true;
        },

        presenceContactResponse: function (contactJid, responseType) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceContactResponse start...");

            Judoonge.Core.getConnection().send($pres({
                type: responseType,
                from: Judoonge.Core.getUser().getJid(),
                to: contactJid
            }).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceContactResponse end...");
            return true;
        },
        presenceDeviceOn: function (contactJid, roomJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] presenceDeviceOn start...");

            Judoonge.Core.getConnection().send($pres({
                from: Judoonge.Core.getUser().getJid(),
                to: contactJid,
                id: Strophe.ID.DEVICE_ON
            }).c('status', roomJid).tree());

            Judoonge.Core.log("[Judoonge.Core.Action] presenceDeviceOn end...");
            return true;
        },
        messageDeviceEnable: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageDeviceEnable start...Jid : "
							+ contactJid);

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.DEVICE_ENABLE,
					Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core
					.log("[Judoonge.Core.Action] messageDeviceEnable end...Jid : "
							+ contactJid);
            return true;
        },
        messageDeviceOn: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageDeviceOn start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.ID.DEVICE_ON, Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core.log("[Judoonge.Core.Action] messageDeviceOn end...");
            return true;
        },
        messageAudioCall: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageAudioCall start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.AUDIO_CALL, Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core.log("[Judoonge.Core.Action] messageAudioCall end...");
            return true;
        },
        messageVideoCall: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageVideoCall start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.VIDEO_CALL, Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core.log("[Judoonge.Core.Action] messageVideoCall end...");
            return true;
        },
        messageCallReject: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageCallReject start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.CALL_REJECT_MSG,
					Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core
					.log("[Judoonge.Core.Action] messageCallReject end...");
            return true;
        },
        messageDocumentEnd: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageDocumentEnd start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.SHARE_DOCUMENT_END,
					Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core
					.log("[Judoonge.Core.Action] messageDocumentEnd end...");
            return true;
        },
        messageAudioCallEnd: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageAudioCallEnd start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.AUDIO_CALL_END,
					Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core
					.log("[Judoonge.Core.Action] messageAudioCallEnd end...");
            return true;
        },
        messageVideoCallEnd: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageVideoCallEnd start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.VIDEO_CALL_END,
					Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core
					.log("[Judoonge.Core.Action] messageVideoCallEnd end...");
            return true;
        },
        messageMultiVideoCall: function (contactJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageMultiVideoCall start...");

            Judoonge.Core.Action.Jabber.Room.Message(contactJid,
					Strophe.DEF.MULTI_VIDEO_CALL,
					Strophe.DEF.MESSAGE_TYPE_GROUPCHAT);

            Judoonge.Core
					.log("[Judoonge.Core.Action] messageMultiVideoCall end...");
            return true;
        },
        messageCreateMultiVideoCall: function (contactJid, roomJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageCreateMultiVideoCall start...toJid : "
							+ contactJid + ", roomJid : " + roomJid);
            Judoonge.Core.Action.Jabber.Room.Message(contactJid, roomJid,
					Strophe.DEF.MESSAGE_TYPE_VIDEOCHAT);
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageCreateMultiVideoCall end...toJid : "
							+ contactJid + ", roomJid : " + roomJid);
            return true;
        },
        messageCreateMultiAudioCall: function (contactJid, roomJid) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageCreateMultiAudioCall start...toJid : "
							+ contactJid + ", roomJid : " + roomJid);
            Judoonge.Core.Action.Jabber.Room.Message(contactJid, roomJid,
					Strophe.DEF.MESSAGE_TYPE_AUDIOCHAT);
            Judoonge.Core
					.log("[Judoonge.Core.Action] messageCreateMultiAudioCall end...toJid : "
							+ contactJid + ", roomJid : " + roomJid);
            return true;
        },
        sendVideoCallMsg: function (iArr, rName, mList) {
            if (mList.length > iArr) {
                Judoonge.Core.log("????" + mList[iArr]);
                Judoonge.Core.Action.Jabber.messageCreateMultiVideoCall(
						mList[iArr] + '@' + Judoonge.serverInfo.basicDomain,
						rName);
            } else {
                clearInterval(intervalId);
            }
        },

        /**
		 * Function: vCardInfoGet Sends a request for Get vCard Info of Jid
		 * 
		 * Parameters: (string) vCardInfoJid - input text vCard Info user ID
		 * (string) actionID - 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 */
        vCardInfoGet: function (vCardInfoJid, actionID) {
            // maverick
            Judoonge.Core
					.log("[Judoonge.Core.Action] vCardInfoGet start...Get Jid : "
							+ vCardInfoJid);

            // Judoonge.Core.getConnection().send($iq({type: 'get', from:
            // Judoonge.Core.getUser().getJid(), id: actionID})
            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                to: vCardInfoJid,
                id: Strophe.ID.VCARD_INFO_GET
            }).c('vCard', {
                xmlns: Strophe.NS.VCARD
            }).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] vCardInfoGet end...Get Jid : "
							+ vCardInfoJid);
            return true;
        },

        /**
		 * Function: vCardInfoSet Sends a request for Set my vCard Info
		 * 
		 * Parameters: (string) vNickName - input text vCard Info NickName
		 * (string) vPhone - input text vCard Info phone (string) vTitle - input
		 * text vCard Info title (string) actionID - 사용자 추가 후 해당 화면 이동을 위해 고유한
		 * ID를 받음
		 */
        vCardInfoSet: function (vNickName, vPhone, vTitle, vEmail, actionID) {
            // maverick
            Judoonge.Core
					.log("[Judoonge.Core.Action] vCardInfoSet start...nick : "
							+ vNickName + ", phone : " + vPhone + ", Title : "
							+ vTitle + ", Email : " + vEmail);
            // self.Jabber.presenceStatusSave(vTitle); // 대화명 설정 api 호출
            Judoonge.Core.getConnection().send(
					$iq({
					    type: 'set',
					    from: Judoonge.Core.getUser().getJid(),
					    id: Strophe.ID.VCARD_INFO_SET
					}).c('vCard', {
					    xmlns: Strophe.NS.VCARD
					}).c('FN', vPhone).up().c('NICKNAME', vNickName).up().c(
							'TITLE', vTitle).up().c('TEL').c('WORK').up().c(
							'VOICE').up().c('NUMBER', vPhone).up().up().c(
							'EMAIL').c('INTERNET').up().c('PREF').up().c(
							'USERID', vEmail).tree());
            Judoonge.Core
					.log("[Judoonge.Core.Action] vCardInfoSet end...nick : "
							+ vNickName + ", phone : " + vPhone + ", Title : "
							+ vTitle + ", Email : " + vEmail);

            // self.Jabber.presenceStatusSave(vTitle); // 대화명 설정 api 호출
            return true;
        },

        /**
		 * Function: buddyRegister Sends a request for buddy add Register Info
		 * 
		 * Parameters: (string) memId - input texte friend add user ID (string)
		 * memNick - input text friend add user Name (string) memEmail - input
		 * text friend add user email (string) memPw - input text friend add
		 * user Password (string) actionID - 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 */
        buddyRegister: function (memId, memNick, memEmail, memPw, actionID) {
            // maverick
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyRegister start... id : "
							+ memId + ", nick : " + memNick + ", Email : "
							+ memEmail + ", pw : " + memPw);
            var item;

            // Judoonge.Core.getConnection().send($iq({type: 'set', from:
            // "Anonymous@knowledgepoint.co.kr", id: actionID})
            // Judoonge.Core.getConnection().send($iq({type: 'set', from:
            // Judoonge.Core.getUser().getJid(), id: actionID})
            Judoonge.Core.getConnection().send(
					$iq({
					    type: 'set',
					    from: Judoonge.Core.getUser().getJid(),
					    id: Strophe.ID.BUDDY_REGISTER
					}).c('query', {
					    xmlns: Strophe.NS.REGISTER
					})
					// .c('registered')
					// .up().c('username', memId)
					.c('username', memId).up().c('password', memPw).up().c(
							'email', memEmail).up().c('name', memNick).tree());
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyRegister end... id : "
							+ memId + ", nick : " + memNick + ", Email : "
							+ memEmail + ", pw : " + memPw);
            return true;
        },

        /**
		 * Function: buddyRegisterView Sends a request for get my Register Info
		 * 
		 * Parameters: (string) actionID - 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를
		 * 받음(option, not use)
		 */
        buddyRegisterView: function (actionID) {
            // maverick
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyRegisterView start...");
            var item;

            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.BUDDY_REGISTERVIEW
            }).c('query', {
                xmlns: Strophe.NS.REGISTER
            }).tree());
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyRegisterView end...");
            return true;
        },

        /**
		 * Function: buddySearch Sends a request for buddy JID search
		 * 
		 * Parameters: (string) searchJid - input search JID (string) actionID -
		 * 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 */
        buddySearch: function (searchJid, actionID) {
            // maverick
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddySearch start -> searchJid : "
							+ searchJid);

            // 검색 조건 확인 query
            // Judoonge.Core.getConnection().send($iq({type: 'get', from:
            // Judoonge.Core.getUser().getJid(), to:
            // Judoonge.JudoongeServerInfo.searchDomain, id: "buddySearch1"})
            // .c('query', {xmlns: Strophe.NS.SEARCH }).tree());

            // Username 으로 검색
            // Judoonge.Core.getConnection().send($iq({type: 'set', from:
            // Judoonge.Core.getUser().getJid(), to:
            // Judoonge.serverInfo.searchDomain, id: actionID, "xml:lang":
            // "en"})
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                to: Judoonge.serverInfo.searchDomain,
                id: Strophe.ID.BUDDY_SEARCH,
                "xml:lang": "en"
            }).c('query', {
                xmlns: Strophe.NS.SEARCH
            })
			// .c('last', searchJid).tree());
			.c('nick', searchJid).tree());
            // .c('Username', searchJid).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] buddySearch end -> searchJid : "
							+ searchJid);
            return true;
        },
        buddySearchId: function (searchJid, actionID) {
            // maverick
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddySearchId start -> searchJid : "
							+ searchJid);

            // Userid 으로 검색
            // Judoonge.Core.getConnection().send($iq({type: 'get', from:
            // Judoonge.Core.getUser().getJid(), to:
            // Judoonge.serverInfo.searchDomain, id: Strophe.ID.BUDDY_SEARCH_ID
            // })
            // .c('query', {xmlns: Strophe.NS.SEARCH})
            // .tree());
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                to: Judoonge.serverInfo.searchDomain,
                id: Strophe.ID.BUDDY_SEARCH_ID
            }).c('query', {
                xmlns: Strophe.NS.SEARCH
            }).c('x', {
                xmlns: Strophe.NS.XDATA,
                type: 'submit'
            }).c('field', {
                'var': 'FORM_TYPE',
                type: 'hidden'
            }).c('value', Strophe.NS.SEARCH).up().up().c('field', {
                'var': 'search',
                type: 'text-single'
            }).c('value', searchJid).up().up().c('field', {
                'var': 'Username',
                type: 'boolean'
            }).c('value', '1').tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] buddySearchId end -> searchJid : "
							+ searchJid);
            return true;
        },

        /**
		 * Function: buddyAdd Sends a request for buddy Add
		 * 
		 * Parameters: (string) addJid - input texte friend add user JID
		 * (string) addName - input text friend add user Name (string) addGroup -
		 * input text friend add user Group (string) actionID - 사용자 추가 후 해당 화면
		 * 이동을 위해 고유한 ID를 받음
		 */
        buddyAdd: function (addJid, addName, addGroup, actionID) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyadd start -> addJid : "
							+ addJid + ", addName : " + addName);

            // Judoonge.Core.getConnection().send($iq({type: 'set', from:
            // Judoonge.Core.getUser().getJid(), id: actionID})
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.BUDDY_ADD
            }).c('query', {
                xmlns: Strophe.NS.ROSTER
            }).c('item', {
                jid: addJid,
                name: addName
            }).c('group', addGroup).tree());

            var gFlag = 0;
            if ($("#pgTitle-NewFriend").attr("class") == undefined) {
                gFlag = "1";
            }
            Judoonge.View.Pane.People.showPeople({
                jid: addJid,
                name: addName,
                group: addGroup,
                gFlag: gFlag
            });
            alert('"' + Strophe.getNodeFromJid(addJid) + '" 가 친구 추가 되었습니다.');
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyadd end -> addJid : "
							+ addJid + ", addName : " + addName);
            return true;
        },

        /**
		 * Function: buddyGroupAddModify group add [ToDo]
		 * 
		 * Parameters: (string) addGroup - 친구의 그룹변경 및 추가. (string) actionID -
		 * 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 * 
		 * write by hwcho
		 */
        buddyGroupAddModify: function (addGroup, actionID) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyGroupAddModify start -> Group : "
							+ addGroup);
            // Judoonge.Core.getConnection().send($iq({type: 'set', from:
            // Judoonge.Core.getUser().getJid(), id: actionID})
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.BUDDY_GROUPADD
            }).c('query', {
                xmlns: Strophe.NS.ROSTER
            }).c('item', {
                jid: Judoonge.Core.getUser().getJid(),
                name: Judoonge.Core.getUser().getNick()
            }).c('group', addGroup).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyGroupAddModify end -> Group : "
							+ addGroup);

            return true;
        },

        /**
		 * Function: buddyDelete
		 * 
		 * Parameters: (string) delete - 친구 ID 단, db와 동일. (string) actionID -
		 * 사용자 추가 후 해당 화면 이동을 위해 고유한 ID를 받음
		 * 
		 * write by hwcho
		 */
        buddyDelete: function (delJid, actionID) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddDelete start -> delJid : "
							+ delJid);

            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: actionID
            })
			// Judoonge.Core.getConnection().send($iq({ type: 'set', from:
			// Judoonge.Core.getUser().getJid(), id: Strophe.ID.BUDDY_DELETE })
			.c('query', {
			    xmlns: Strophe.NS.ROSTER
			}).c('item', {
			    jid: delJid,
			    subscription: 'remove'
			}).tree());
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddDelete end -> delJid : "
							+ delJid);

            return true;
        },

        /**
		 * Function: buddyGroupDelete
		 * 
		 * Parameters: (string) delGroup - 삭제 그룹이름. (string) actionID - 사용자 추가 후
		 * 해당 화면 이동을 위해 고유한 ID를 받음
		 * 
		 * 그룹을 만들때 생성한 사람이 그룹을 삭제 한다, 다른 사람이 삭제하면 그룹에 포함된 사람이면 그룹에서 빠지고, 아니면 에러
		 */
        buddyGroupDelete: function (delGroup, actionID) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyGroupDelete start -> delGroup : "
							+ delGroup);

            // Judoonge.Core.getConnection().send($iq({ type: 'set', from:
            // Judoonge.Core.getUser().getJid(), id: actionID })
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.BUDDY_GROUPDELETE
            }).c('query', {
                xmlns: Strophe.NS.ROSTER
            }).c('item', {
                jid: Judoonge.Core.getUser().getJid(),
                subscription: 'remove'
            }).c('group', delGroup).tree());
            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyGroupDelete end -> delGroup : "
							+ delGroup);

            return true;
        },

        /**
		 * function: chatStart
		 * 
		 * Parameters: (string) roomName - 방이름. (string) guestId - 상대방 ID.
		 */

        // hwcho
        chatStart: function (roomName, guestId) {

            Judoonge.DEF.callTargetId = guestId;

            Judoonge.Core.log("[Judoonge.Core.Action] chatStart : Judoonge.DEF.callTargetId : " + Judoonge.DEF.callTargetId);

            self.Jabber.createRoom(roomName, Strophe.ID.CREATE_ROOM);

            return true;
        },
        /**
		 * Function: chatInvite
		 * 
		 * Parameters: (string) roomName - 방이름. (string) guestId - 상대방 ID.
		 */
        chatAddInvite: function (roomName, guestId) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] chatAddInvite -> start : guestId : "
							+ guestId + "  RoomName : " + roomName);

            for (var i = 0; i < guestId.length; i++) {
                self.Jabber.buddyJoinCall(roomName, guestId[i],
						Strophe.ID.BUDDY_JOINCALL);
            }

            Judoonge.Core
					.log("[Judoonge.Core.Action] chatAddInvite -> end : guestId : "
							+ guestId + "  RoomName : " + roomName);

            return true;
        },

        /**
		 * Function: createRoom
		 * 
		 * Parameters: (string) roomName - 생성될 다중 대화방 이름. (string) actionID -
		 * 고유한 ID.
		 * 
		 * 사용자 이름으로 방을 생성.
		 */
        createRoom: function (roomName, actionId) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] createRoom start ---> roomName : "
							+ roomName);

            var conName = roomName + "@" + Judoonge.serverInfo.conferenDomain
					+ "/"
					+ Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid());

            Judoonge.Core
					.log("[Judoonge.Core.Action] createRoom ---> conName : "
							+ conName);

            // Judoonge.Core.getConnection().send($pres({from:
            // Judoonge.Core.getUser().getJid(), to:
            // 'test1@conference.knowledgepoint/hwcho', id:
            // Strophe.ID.CREATE_ROOM})
            Judoonge.Core.getConnection().send($pres({
                from: Judoonge.Core.getUser().getJid(),
                to: conName,
                id: Strophe.ID.CREATE_ROOM
            }).c('x', {
                xmlns: Strophe.NS.MUC + '#user'
            }).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] createRoom end ---> roomName : "
							+ roomName);

            return true;
        },

        /**
		 * Function: buddyJoinCall
		 * 
		 * Parameters: (sring) roomName - 생성된 다중 대화방 이름. (string) guestID - 상대방
		 * Jid. (string) actionID - api에 대한 고유 ID.
		 * 
		 * api 호출은 presence: function(msg)에서 합니다. 방 생성후 대화상대 초대.
		 */

        buddyJoinCall: function (roomName, guestId, actionId) {

            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyCall start ---> roomName : "
							+ roomName + " guestId : " + guestId);

            var fullGuestId = guestId + "@" + Judoonge.serverInfo.basicDomain;

            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyCall ---> fullGuestId : "
							+ fullGuestId);

            // Judoonge.Core.getConnection().send($msg({from:
            // 'hwcho@knowledgepoint', id: 'come', to: 'test1'})
            Judoonge.Core.getConnection().send($msg({
                from: Judoonge.Core.getUser().getJid(),
                id: Strophe.ID.BUDDY_JOINCALL,
                to: fullGuestId
            }).c('x', {
                xmlns: Strophe.NS.MUC + '#user',
                jid: roomName,
                reason: 'come this room. please!!'
            }).tree());

            Judoonge.Core
					.log("[Judoonge.Core.Action] buddyCall end ---> roomName : "
							+ roomName + " guestId : " + guestId);

            return true;
        },

        roomSetMessage: function (roomName, actionId) {
            Judoonge.Core
					.log("[Judoonge.Core.Action] roomSetMessage start ---> roomName : "
							+ roomName);

            var conName = roomName + "@" + Judoonge.serverInfo.conferenDomain
					+ "/"
					+ Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid());

            Judoonge.Core
					.log("[Judoonge.Core.Action] roomSetMessage start ---> conName : "
							+ conName);
            // Judoonge.Core.getConnection().send($msg({from:
            // 'test1@conference.knowledgepoint', id: Strophe.ID.ROOM_SUBJECTID,
            // to: hwcho@knowledgepoint, type: 'groupchat'})
            Judoonge.Core.getConnection().send($msg({
                from: conName,
                id: Strophe.ID.ROOM_SUBJECTID,
                to: Judoonge.Core.getUser().getJid(),
                type: 'groupchat'
            }).c('subject', (roomName)).tree());

            return true;
        },

        /**
		 * Function: Services Sends a request for disco items
		 */
        Services: function () {
            Judoonge.Core.log("Core.Action.Services() start...");
            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                xmlns: Strophe.NS.CLIENT
            }).c('query', {
                xmlns: Strophe.NS.DISCO_ITEMS
            }).tree());
            Judoonge.Core.log("Core.Action.Services() end...");
        },

        /**
		 * Function: Autojoin When Judoonge.Core.getOptions().autojoin is true,
		 * request autojoin bookmarks (OpenFire)
		 * 
		 * Otherwise, if Judoonge.Core.getOptions().autojoin is an array, join
		 * each channel specified.
		 */
        Autojoin: function () {
            // maverick
            Judoonge.Core
					.log("Autojoin -> Judoonge.Core.getOptions().autojoin : "
							+ Judoonge.Core.getOptions().autojoin
							+ ", this.valueOf() : " + this.valueOf());
            // Request bookmarks
            if (Judoonge.Core.getOptions().autojoin === true) {
                Judoonge.Core.getConnection().send($iq({
                    type: 'get',
                    xmlns: Strophe.NS.CLIENT
                }).c('query', {
                    xmlns: Strophe.NS.PRIVATE
                }).c('storage', {
                    xmlns: Strophe.NS.BOOKMARKS
                }).tree());
                // Join defined rooms
            } else if ($.isArray(Judoonge.Core.getOptions().autojoin)) {
                Judoonge.Core.log("self.Jabber.Room.Join()");
                $.each(Judoonge.Core.getOptions().autojoin, function () {
                    self.Jabber.Room.Join(this.valueOf());
                });
                // autojoin : false 이면, 로그인 사용자 정보 받아오기..
            } else {
                Judoonge.Core
						.log("[ToDo] Autojoin 함수 안에 false 이면 사용자 정보 받아오기 구현필요");
                // self.Jabber.Room.Join(this.valueOf());
            }
        },

        /**
		 * Function: ResetIgnoreList Create new ignore privacy list (and reset
		 * the old one, if it exists).
		 */
        ResetIgnoreList: function () {
            Judoonge.Core.log("Core.Action.ResetIgnoreList() start...");
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: 'set1'
            }).c('query', {
                xmlns: Strophe.NS.PRIVACY
            }).c('list', {
                name: 'ignore'
            }).c('item', {
                'action': 'allow',
                'order': '0'
            }).tree());
            Judoonge.Core.log("Core.Action.ResetIgnoreList() end...");
        },

        /**
		 * Function: RemoveIgnoreList Remove an existing ignore list.
		 */
        RemoveIgnoreList: function () {
            Judoonge.Core.log("Core.Action.RemoveIgnoreList() start...");
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: 'remove1'
            }).c('query', {
                xmlns: Strophe.NS.PRIVACY
            }).c('list', {
                name: 'ignore'
            }).tree());
            Judoonge.Core.log("Core.Action.RemoveIgnoreList() end...");
        },

        /**
		 * Function: GetIgnoreList Get existing ignore privacy list when
		 * connecting.
		 */
        GetIgnoreList: function () {
            Judoonge.Core
					.log("GetIgnoreList-> Judoonge.Core.getConnection().send start >> id : "
							+ Judoonge.Core.getUser().getJid());
            Judoonge.Core.getConnection().send($iq({
                type: 'get',
                from: Judoonge.Core.getUser().getJid(),
                id: 'get1'
            }).c('query', {
                xmlns: Strophe.NS.PRIVACY
            }).c('list', {
                name: 'ignore'
            }).tree());
            Judoonge.Core
					.log("GetIgnoreList-> Judoonge.Core.getConnection().send end >> id : "
							+ Judoonge.Core.getUser().getJid());
        },

        /**
		 * Function: SetIgnoreListActive Set ignore privacy list active
		 */
        SetIgnoreListActive: function () {
            Judoonge.Core.log("Core.Action.SetIgnoreListActive() start...");
            Judoonge.Core.getConnection().send($iq({
                type: 'set',
                from: Judoonge.Core.getUser().getJid(),
                id: 'set2'
            }).c('query', {
                xmlns: Strophe.NS.PRIVACY
            }).c('active', {
                name: 'ignore'
            }).tree());
            Judoonge.Core.log("Core.Action.SetIgnoreListActive() end...");
        },

        /**
		 * Function: GetJidIfAnonymous On anonymous login, initially we don't
		 * know the jid and as a result, Judoonge.Core._user doesn't have a jid.
		 * Check if user doesn't have a jid and get it if necessary from the
		 * connection.
		 */
        GetJidIfAnonymous: function () {
            Judoonge.Core.log("Core.Action.GetJidIfAnonymous() start...");
            if (!Judoonge.Core.getUser().getJid()) {
                Judoonge.Core.log("[Jabber] Anonymous login");
                Judoonge.Core.getUser().data.jid = Judoonge.Core
						.getConnection().jid;
            }
            Judoonge.Core.log("Core.Action.GetJidIfAnonymous() end...");
        },

        /**
		 * Class: Judoonge.Core.Action.Jabber.Room Room-specific commands
		 */
        Room: {
            /**
			 * Function: Join Requests disco of specified room and joins
			 * afterwards.
			 * 
			 * TODO: maybe we should wait for disco and later join the room? but
			 * what if we send disco but don't want/can join the room
			 * 
			 * Parameters: (String) roomJid - Room to join (String) password -
			 * [optional] Password for the room
			 */
            Join: function (roomJid, password) {
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Join start -> roomJid : "
								+ roomJid + ", passwd : " + password);
                self.Jabber.Room.Disco(roomJid);
                Judoonge.Core.getConnection().muc.join(roomJid, Judoonge.Core
						.getUser().getNick(), null, null, password);
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Join end -> roomJid : "
								+ roomJid + ", passwd : " + password);
            },

            upJoin: function (roomJid, password, nick) {
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] upJoin start -> roomJid : "
								+ roomJid + ", passwd : " + password);
                // self.Jabber.Room.Disco(roomJid);
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] upJoin info -> nick : "
								+ nick
								+ ", getNick() : "
								+ Judoonge.Core.getUser().getNick());
                Judoonge.Core.getUser().data.nick = nick;
                // Judoonge.Core.getUser().data.nick =
                // Judoonge.Core.getUser().getNick();
                Judoonge.Core.getConnection().muc.join(roomJid, Judoonge.Core
						.getUser().getNick(), null, null, password);
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] upJoin end -> roomJid : "
								+ roomJid + ", passwd : " + password);
            },

            /**
			 * Function: Leave Leaves a room.
			 * 
			 * Parameters: (String) roomJid - Room to leave
			 */
            Leave: function (roomJid) {
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Leave start -> roomJid : "
								+ roomJid);

                // hwcho
                Judoonge.Core.getConnection().muc.leave(roomJid, Judoonge.Core
						.getRoom(roomJid).getUser().getNick(), function () {
						});
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Leave end -> roomJid : "
								+ roomJid);
            },

            /**
			 * Function: Disco Requests <disco info of a room at
			 * http://xmpp.org/extensions/xep-0045.html#disco-roominfo>.
			 * 
			 * Parameters: (String) roomJid - Room to get info for
			 */
            Disco: function (roomJid) {
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Disco start -> roomJid : "
								+ roomJid);
                Judoonge.Core.getConnection().send($iq({
                    type: 'get',
                    from: Judoonge.Core.getUser().getJid(),
                    to: roomJid,
                    id: 'disco3'
                }).c('query', {
                    xmlns: Strophe.NS.DISCO_INFO
                }).tree());
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Disco end -> roomJid : "
								+ roomJid);
            },

            /**
			 * Function: Message Send message
			 * 
			 * Parameters: (String) roomJid - Room to which send the message
			 * into (String) msg - Message (String) type - "groupchat" or "chat"
			 * ("chat" is for private messages)
			 * 
			 * Returns: (Boolean) - true if message is not empty after trimming,
			 * false otherwise.
			 */
            Message: function (roomJid, msg, type) {
                // maverick
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Message start -> roomJid : "
								+ roomJid
								+ ", msg : "
								+ msg
								+ ", type : "
								+ type);
                // Trim message
                msg = $.trim(msg);
                if (msg === '') {
                    return false;
                }
                for (var ti = 0; Judoonge.filterWords[ti]; ti++) {
                    // bad word check
                    if (msg.match(Judoonge.filterWords[ti])) {
                        Judoonge.Core
								.log("[Judoonge.Core.Action.Room] Message fail -> bad word : "
										+ Judoonge.filterWords[ti]
										+ ", msg : "
										+ msg + ", type : " + type);
                        alert("Bad Word... : " + Judoonge.filterWords[ti]);
                        return false;
                    }
                }
                Judoonge.Core.getConnection().muc.message(Judoonge.Util
						.escapeJid(roomJid), undefined, msg, type);
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] Message end -> roomJid : "
								+ roomJid
								+ ", msg : "
								+ msg
								+ ", type : "
								+ type);
                return true;
            },

            /**
			 * Function: IgnoreUnignore Checks if the user is already ignoring
			 * the target user, if yes: unignore him, if no: ignore him.
			 * 
			 * Uses the ignore privacy list set on connecting.
			 * 
			 * Parameters: (String) userJid - Target user jid
			 */
            IgnoreUnignore: function (userJid) {
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] IgnoreUnignore start -> userJid : "
								+ userJid);
                Judoonge.Core.getUser().addToOrRemoveFromPrivacyList('ignore',
						userJid);
                Judoonge.Core.Action.Jabber.Room.UpdatePrivacyList();
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] IgnoreUnignore end -> userJid : "
								+ userJid);
            },

            /**
			 * Function: UpdatePrivacyList Updates privacy list according to the
			 * privacylist in the currentUser
			 */
            UpdatePrivacyList: function () {
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] UpdatePrivacyList start..");
                var currentUser = Judoonge.Core.getUser(), iq = $iq({
                    type: 'set',
                    from: currentUser.getJid(),
                    id: 'edit1'
                }).c('query', {
                    xmlns: 'jabber:iq:privacy'
                }).c('list', {
                    name: 'ignore'
                }), privacyList = currentUser.getPrivacyList('ignore');
                if (privacyList.length > 0) {
                    $.each(privacyList, function (index, jid) {
                        iq.c('item', {
                            type: 'jid',
                            value: Judoonge.Util.escapeJid(jid),
                            action: 'deny',
                            order: index
                        }).c('message').up().up();
                    });
                } else {
                    iq.c('item', {
                        action: 'allow',
                        order: '0'
                    });
                }
                Judoonge.Core.getConnection().send(iq.tree());
                Judoonge.Core
						.log("[Judoonge.Core.Action.Room] UpdatePrivacyList end..");
            },

            /**
			 * Class: Judoonge.Core.Action.Jabber.Room.Admin Room administration
			 * commands
			 */
            Admin: {
                /**
				 * Function: UserAction Kick or ban a user
				 * 
				 * Parameters: (String) roomJid - Room in which the kick/ban
				 * should be done (String) userJid - Victim (String) type -
				 * "kick" or "ban" (String) msg - Reason
				 * 
				 * Returns: (Boolean) - true if sent successfully, false if type
				 * is not one of "kick" or "ban".
				 */
                UserAction: function (roomJid, userJid, type, reason) {
                    Judoonge.Core
							.log("[Judoonge.Core.Action.Room.Admin] UserAction start -> roomJid : "
									+ roomJid
									+ ", userJid : "
									+ userJid
									+ ", type : "
									+ type
									+ ", reason : "
									+ reason);
                    var iqId, itemObj = {
                        nick: Strophe.escapeNode(Strophe
								.getResourceFromJid(userJid))
                    };
                    switch (type) {
                        case 'kick':
                            iqId = 'kick1';
                            itemObj.role = 'none';
                            break;
                        case 'ban':
                            iqId = 'ban1';
                            itemObj.affiliation = 'outcast';
                            break;
                        default:
                            return false;
                    }
                    Judoonge.Core.getConnection().send($iq({
                        type: 'set',
                        from: Judoonge.Core.getUser().getJid(),
                        to: roomJid,
                        id: iqId
                    }).c('query', {
                        xmlns: Strophe.NS.MUC_ADMIN
                    }).c('item', itemObj).c('reason').t(reason).tree());
                    Judoonge.Core
							.log("[Judoonge.Core.Action.Room.Admin] UserAction end -> roomJid : "
									+ roomJid
									+ ", userJid : "
									+ userJid
									+ ", type : "
									+ type
									+ ", reason : "
									+ reason);
                    return true;
                },

                /**
				 * Function: SetSubject Sets subject (topic) of a room.
				 * 
				 * Parameters: (String) roomJid - Room (String) subject -
				 * Subject to set
				 */
                SetSubject: function (roomJid, subject) {
                    Judoonge.Core
							.log("[Judoonge.Core.Action.Room.Admin] SetSubject start -> roomJid : "
									+ roomJid + ", subject : " + subject);
                    Judoonge.Core.getConnection().muc
							.setTopic(roomJid, subject);
                    Judoonge.Core
							.log("[Judoonge.Core.Action.Room.Admin] SetSubject end -> roomJid : "
									+ roomJid + ", subject : " + subject);
                }
            }
        }
    };

    return self;
}(Judoonge.Core.Action || {}, Strophe, jQuery));
/**
 * File: chatRoom.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.Core.ChatRoom Judoonge Chat Room
 * 
 * Parameters: (String) roomJid - Room jid
 */
Judoonge.Core.ChatRoom = function (roomJid) {
    /**
	 * Object: room Object containing roomJid and name.
	 */
    this.room = {
        jid: roomJid,
        name: null
    };

    /**
	 * Variable: user Current local user of this room.
	 */
    this.user = null;

    /**
	 * Variable: Roster Judoonge.Core.ChatRoster instance
	 */
    this.roster = new Judoonge.Core.ChatRoster();

    /**
	 * Function: setUser Set user of this room.
	 * 
	 * Parameters: (Judoonge.Core.ChatUser) user - Chat user
	 */
    this.setUser = function (user) {
        this.user = user;
    };

    /**
	 * Function: getUser Get current local user
	 * 
	 * Returns: (Object) - Judoonge.Core.ChatUser instance or null
	 */
    this.getUser = function () {
        return this.user;
    };

    /**
	 * Function: getJid Get room jid
	 * 
	 * Returns: (String) - Room jid
	 */
    this.getJid = function () {
        return this.room.jid;
    };

    /**
	 * Function: setName Set room name
	 * 
	 * Parameters: (String) name - Room name
	 */
    this.setName = function (name) {
        this.room.name = name;
    };

    /**
	 * Function: getName Get room name
	 * 
	 * Returns: (String) - Room name
	 */
    this.getName = function () {
        return this.room.name;
    };

    /**
	 * Function: setRoster Set roster of room
	 * 
	 * Parameters: (Judoonge.Core.ChatRoster) roster - Chat roster
	 */
    this.setRoster = function (roster) {
        this.roster = roster;
    };

    /**
	 * Function: getRoster Get roster
	 * 
	 * Returns (Judoonge.Core.ChatRoster) - instance
	 */
    this.getRoster = function () {
        return this.roster;
    };
};
/**
 * File: chatRoster.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.Core.ChatRoster Chat Roster
 */
Judoonge.Core.ChatRoster = function () {
    /**
	 * Object: items Roster items
	 */
    this.items = {};

    /**
	 * Function: add Add user to roster
	 * 
	 * Parameters: (Judoonge.Core.ChatUser) user - User to add
	 */
    this.add = function (user) {
        this.items[user.getJid()] = user;
    };

    /**
	 * Function: remove Remove user from roster
	 * 
	 * Parameters: (String) jid - User jid
	 */
    this.remove = function (jid) {
        delete this.items[jid];
    };

    /**
	 * Function: get Get user from roster
	 * 
	 * Parameters: (String) jid - User jid
	 * 
	 * Returns: (Judoonge.Core.ChatUser) - User
	 */
    this.get = function (jid) {
        return this.items[jid];
    };

    /**
	 * Function: getAll Get all items
	 * 
	 * Returns: (Object) - all roster items
	 */
    this.getAll = function () {
        return this.items;
    };
};
/**
 * File: chatUser.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.Core.ChatUser Chat User
 */
Judoonge.Core.ChatUser = function (jid, nick, affiliation, role) {
    /**
	 * Constant: ROLE_MODERATOR Moderator role
	 */
    this.ROLE_MODERATOR = 'moderator';

    /**
	 * Constant: AFFILIATION_OWNER Affiliation owner
	 */
    this.AFFILIATION_OWNER = 'owner';

    /**
	 * Object: data User data containing: - jid - nick - affiliation - role -
	 * privacyLists - customData to be used by e.g. plugins
	 */
    this.data = {
        jid: jid,
        nick: Strophe.unescapeNode(nick),
        affiliation: affiliation,
        role: role,
        privacyLists: {},
        customData: {}
    };

    /**
	 * Function: getJid Gets an unescaped user jid
	 * 
	 * See: <Judoonge.Util.unescapeJid>
	 * 
	 * Returns: (String) - jid
	 */
    this.getJid = function () {
        if (this.data.jid) {
            return Judoonge.Util.unescapeJid(this.data.jid);
        }
        return;
    };

    /**
	 * Function: getEscapedJid Escapes the user's jid (node & resource get
	 * escaped)
	 * 
	 * See: <Judoonge.Util.escapeJid>
	 * 
	 * Returns: (String) - escaped jid
	 */
    this.getEscapedJid = function () {
        return Judoonge.Util.escapeJid(this.data.jid);
    };

    /**
	 * Function: getNick Gets user nick
	 * 
	 * Returns: (String) - nick
	 */
    this.getNick = function () {
        return Strophe.unescapeNode(this.data.nick);
    };

    /**
	 * Function: getRole Gets user role
	 * 
	 * Returns: (String) - role
	 */
    this.getRole = function () {
        return this.data.role;
    };

    /**
	 * Function: getAffiliation Gets user affiliation
	 * 
	 * Returns: (String) - affiliation
	 */
    this.getAffiliation = function () {
        return this.data.affiliation;
    };

    /**
	 * Function: isModerator Check if user is moderator. Depends on the room.
	 * 
	 * Returns: (Boolean) - true if user has role moderator or affiliation owner
	 */
    this.isModerator = function () {
        return this.getRole() === this.ROLE_MODERATOR
				|| this.getAffiliation() === this.AFFILIATION_OWNER;
    };

    /**
	 * Function: addToOrRemoveFromPrivacyList Convenience function for
	 * adding/removing users from ignore list.
	 * 
	 * Check if user is already in privacy list. If yes, remove it. If no, add
	 * it.
	 * 
	 * Parameters: (String) list - To which privacy list the user should be
	 * added / removed from. Judoonge supports curently only the "ignore" list.
	 * (String) jid - User jid to add/remove
	 * 
	 * Returns: (Array) - Current privacy list.
	 */
    this.addToOrRemoveFromPrivacyList = function (list, jid) {
        if (!this.data.privacyLists[list]) {
            this.data.privacyLists[list] = [];
        }
        var index = -1;
        if ((index = this.data.privacyLists[list].indexOf(jid)) !== -1) {
            this.data.privacyLists[list].splice(index, 1);
        } else {
            this.data.privacyLists[list].push(jid);
        }
        return this.data.privacyLists[list];
    };

    /**
	 * Function: getPrivacyList Returns the privacy list of the listname of the
	 * param.
	 * 
	 * Parameters: (String) list - To which privacy list the user should be
	 * added / removed from. Judoonge supports curently only the "ignore" list.
	 * 
	 * Returns: (Array) - Privacy List
	 */
    this.getPrivacyList = function (list) {
        if (!this.data.privacyLists[list]) {
            this.data.privacyLists[list] = [];
        }
        return this.data.privacyLists[list];
    };

    /**
	 * Function: isInPrivacyList Tests if this user ignores the user provided by
	 * jid.
	 * 
	 * Parameters: (String) list - Privacy list (String) jid - Jid to test for
	 * 
	 * Returns: (Boolean)
	 */
    this.isInPrivacyList = function (list, jid) {
        if (!this.data.privacyLists[list]) {
            return false;
        }
        return this.data.privacyLists[list].indexOf(jid) !== -1;
    };

    /**
	 * Function: setCustomData Stores custom data
	 * 
	 * Parameter: (Object) data - Object containing custom data
	 */
    this.setCustomData = function (data) {
        this.data.customData = data;
    };

    /**
	 * Function: getCustomData Retrieve custom data
	 * 
	 * Returns: (Object) - Object containing custom data
	 */
    this.getCustomData = function () {
        return this.data.customData;
    };
};
/**
 * File: event.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.Core.Event Chat Events
 * 
 * Parameters: (Judoonge.Core.Event) self - itself (Strophe) Strophe - Strophe
 * (jQuery) $ - jQuery (Judoonge.Util.Observable) observable - Observable to
 * mixin
 */
Judoonge.Core.Event = (function (self, Strophe, $, observable) {
    /**
	 * Mixin observable
	 */
    var i;
    for (i in observable) {
        if (observable.hasOwnProperty(i)) {
            self[i] = observable[i];
        }
    }

    /**
	 * Enum: KEYS Observer keys
	 * 
	 * CHAT - Chat events PRESENCE - Presence events MESSAGE - Message events
	 * LOGIN - Login event MAINLIST - login after
	 */
    self.KEYS = {
        CHAT: 1,
        PRESENCE: 2,
        MESSAGE: 3,
        LOGIN: 4,
        PRESENCE_ERROR: 5,
        MAINLIST: 6,
        FRIEND_MANAGER: 7,
        CHATINFO: 8
    };

    /**
	 * Class: Judoonge.Core.Event.Strophe Strophe-related events
	 */
    self.Strophe = {
        /**
		 * Function: Connect Acts on strophe status events and notifies view.
		 * 
		 * Parameters: (Strophe.Status) status - Strophe statuses
		 */
        Connect: function (status) {
            switch (status) {
                case Strophe.Status.CONNECTED:
                    Judoonge.Core.log('[Connection] Connected');
                    Judoonge.Core.Action.Jabber.GetJidIfAnonymous();
                    // fall through because the same things need to be done :)
                case Strophe.Status.ATTACHED:
                    if (!Judoonge.Core.isRegisterProc()
                            && !Judoonge.Core.isAnonymousConnection()) {
                        Judoonge.View.Pane.Main.showPane();
                        Judoonge.Core.log('[Connection] Attached');
                        Judoonge.Core.Action.Jabber.Presence(); // User sends
                        // initial presence
                        Judoonge.Core.Action.Jabber
                                .buddyRegisterView(Strophe.ID.BUDDY_REGISTERVIEW); // my
                        // register
                        // info
                        Judoonge.Core.Action.Jabber
                                .buddyList(Strophe.ID.BUDDY_LIST); // 사용자리스트
                    } else {
                        Judoonge.Core.isResetTemp(); // 임시 값을 리셋 시켜서 사용자 로그인 시
                        // 메인으로 가게 함
                    }
                    /*
                     * for(roomJid in Judoonge.Core.ChatRooms.getJid()) {
                     * Judoonge.Core.log("jid : " + Judoonge.Core.ChatRooms.getJid() +
                     * "rName : " + Judoonge.Core.ChatRooms.getName()); }
                     * for(roomUsr in Judoonge.Core.ChatRooms.getUser()) {
                     * Judoonge.Core.log('user : ' + roomUsr); }
                     */
                    break;

                case Strophe.Status.DISCONNECTED:
                    Judoonge.Core.log('[Connection] Disconnected');
                    break;

                case Strophe.Status.AUTHFAIL:
                    Judoonge.Core.log('[Connection] Authentication failed');
                    alert("로그인 실패");
                    Judoonge.Core.disconnect();
                    break;

                case Strophe.Status.CONNECTING:
                    Judoonge.Core.log('[Connection] Connecting');
                    break;

                case Strophe.Status.DISCONNECTING:
                    Judoonge.Core.log('[Connection] Disconnecting');
                    break;

                case Strophe.Status.AUTHENTICATING:
                    Judoonge.Core.log('[Connection] Authenticating');
                    break;

                case Strophe.Status.ERROR:
                case Strophe.Status.CONNFAIL:
                    Judoonge.Core.log('[Connection] Failed (' + status + ')');
                    break;

                default:
                    Judoonge.Core.log('[Connection] What?!');
                    break;
            }

            // modify maverick, KEYS.CHAT -> KEYS.MAINLIST
            // self.notifyObservers(self.KEYS.CHAT, { type: 'connection',
            // status: status } );
            self.notifyObservers(self.KEYS.MAINLIST, {
                type: 'connection',
                status: status
            });
        }
    };

    /**
	 * Function: Login Notify view that the login window should be displayed
	 * 
	 * Parameters: (String) presetJid - Preset user JID
	 */
    self.Login = function (presetJid) {
        self.notifyObservers(self.KEYS.LOGIN, {
            presetJid: presetJid
        });
    };

    /**
	 * Class: Judoonge.Core.Event.Jabber Jabber related events
	 */
    self.Jabber = {
        /**
		 * Function: Version Responds to a version request
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        Version: function (msg) {
            Judoonge.Core.log('[Judoonge.Core.Event.Jabber] Version');
            Judoonge.Core.Action.Jabber.Version($(msg));
            return true;
        },

        /**
		 * Function: rBuddyList Responds to buddyList request
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        rBuddyList: function (msg) {
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyList start...');
            msg = $(msg);
            var rData = [], ti = 0;
            var item = msg.children('query').children('item');
            var type = msg.attr('type');
            Judoonge.Core.log("iq id : " + msg.attr('id'));
            Judoonge.Core.log("iq type : " + type);

            Judoonge.Core.log('[Judoonge.Core.Event.Jabber] rBuddyList type : '
					+ type);
            // mainLIst success
            if (type === 'result') {
                // recv data temp buffre save , group sort
                item.each(function () {
                    var item2 = $(this);
                    if (!item2.attr('name'))
                        rName = Strophe.escapeNode(Strophe.getNodeFromJid(item2
								.attr('jid')));
                    else
                        rName = item2.attr('name');
                    if (!item2.children('group').text())
                        rGroup = Strophe.DEF.DEFAULT_GROUP;
                    else
                        rGroup = item2.children('group').text();
                    Judoonge.Core.log("name : " + item2.attr('name')
							+ " -> name : " + rName);
                    Judoonge.Core.log("group : "
							+ item2.children('group').text() + " -> group : "
							+ rGroup);

                    // rData[ti++] = new Array(item2.children('group').text(),
                    // item2.attr('jid'), item2.attr('name'),
                    // item2.attr('subscription') );
                    rData[ti++] = new Array(rGroup, item2.attr('jid'), rName,
							item2.attr('subscription'));
                    Judoonge.Core.log("jid : " + item2.attr('jid')
							+ ". name : " + rName + ". subscription : "
							+ item2.attr('subscription'));
                    Judoonge.Core.log("group : " + rGroup);
                });
                rData.sort();
                Judoonge.DEF.PeopleCount = rData.length;
                // view process
                for (tj = 0; ti > tj; tj++) {
                    // self.notifyObservers(self.KEYS.MAINLIST, { type: type,
                    // status: self.KEYS.MAINLIST, jid: item2.attr('jid'), name:
                    // item2.attr('name'), subscription:
                    // item2.attr('subscription'), group:
                    // item2.children('group').text() });
                    if (tj > 0 && rData[tj][0] == rData[tj - 1][0]) {
                        self.notifyObservers(self.KEYS.MAINLIST, {
                            type: type,
                            id: msg.attr('id'),
                            status: self.KEYS.MAINLIST,
                            jid: rData[tj][1],
                            name: rData[tj][2],
                            subscription: rData[tj][3],
                            group: rData[tj][0],
                            gFlag: "0"
                        });
                    } else {
                        self.notifyObservers(self.KEYS.MAINLIST, {
                            type: type,
                            id: msg.attr('id'),
                            status: self.KEYS.MAINLIST,
                            jid: rData[tj][1],
                            name: rData[tj][2],
                            subscription: rData[tj][3],
                            group: rData[tj][0],
                            gFlag: "1"
                        });
                    }
                }
                $(".peopleCount").text("친구(" + Judoonge.DEF.PeopleCount + "명)");
                // etc
            } else {
                Judoonge.Core
						.log('[Judoonge.Core.Event.Jabber] rBuddyList else...type : '
								+ type);
            }

            Judoonge.Core.log('[Judoonge.Core.Event.Jabber] rBuddyList end...');
            return true;
        },

        /**
		 * Function: rBuddyGroupProc Responds to buddy And Group
		 * Add/Modify/Delete request
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        rBuddyGroupProc: function (msg) {
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddy And Group Add/Delete/Modify start...');
            var msg = $(msg);
            var item = msg.children('query').children('item');
            Judoonge.Core.log("iq id : " + msg.attr('id'));
            Judoonge.Core.log("jid : " + item.attr('jid') + ". name : "
					+ item.attr('name') + ", subscription : "
					+ item.attr('subscription'));
            Judoonge.Core.log("group : " + item.children('group').text());
            self.notifyObservers(self.KEYS.MAINLIST, {
                type: msg.attr('type'),
                id: item.attr('subscription'),
                status: self.KEYS.MAINLIST,
                jid: item.attr('jid'),
                name: item.attr('name'),
                group: item.children('group').text()
            });
            // 사용자 추가 이후에 정보 공유(presence) 요청을 보내기 위해서 요청자 jid 저장
            Judoonge.DEF.rBuddyAddJid = item.attr('jid');
            Judoonge.DEF.peopleAdd = {
                jid: item.attr('jid'),
                name: item.attr('name'),
                group: item.children('group').text()
            };
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddy And Group Add/Delete/Modify end...');
            return true;
        },

        /**
		 * Function: rBuddyIqProcResult Responds to buddy Register request
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        rBuddyIqProcResult: function (msg) {
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyIqProcResult start...');
            msg = $(msg);
            var uId = msg.attr('id');
            var type = msg.attr('type');
            Judoonge.Core.log("iq id : " + uId);

            if (uId == Strophe.ID.BUDDY_REGISTERVIEW) {
                // buddy register view result
                Judoonge.Core
						.log('[rBuddyIqProcResult] my register view process...');

                var rUserName = msg.children('query').children('username')
						.text();
                var rName = msg.children('query').children('name').text();
                var rEmail = msg.children('query').children('email').text();
                if (!rName)
                    rName = rUserName;
                Judoonge.Core.log("username : " + rUserName + ", name : "
						+ rName + ", email : " + rEmail);

                self.notifyObservers(self.KEYS.MAINLIST, {
                    type: type,
                    id: uId,
                    status: self.KEYS.MAINLIST,
                    username: rUserName,
                    name: rName,
                    email: rEmail
                });

            } else if (uId == Strophe.ID.VCARD_INFO_GET) {
                // vcard get self/buddy info result
                Judoonge.Core
						.log('[rBuddyIqProcResult] vcard get self/buddy info process...');

                var vJid = msg.attr('from');
                var vNick = msg.children('vCard').children('NICKNAME').text();
                var vPhone = msg.children('vCard').children('TEL').children(
						'NUMBER').text();
                var vTitle = msg.children('vCard').children('TITLE').text();
                var vEmail = msg.children('vCard').children('EMAIL').children(
						'USERID').text();
                Judoonge.Core.log("vcard get, jid : " + vJid + ", nick : "
						+ vNick + ", phone : " + vPhone + ", title : " + vTitle
						+ ", Email : " + vEmail);

                self.notifyObservers(self.KEYS.MAINLIST, {
                    type: type,
                    id: uId,
                    status: self.KEYS.MAINLIST,
                    vcJid: vJid,
                    vcNick: vNick,
                    vcPhone: vPhone,
                    vcTitle: vTitle,
                    vcEmail: vEmail
                });

            } else if (uId == Strophe.ID.VCARD_INFO_SET) {
                Judoonge.Core
						.log('[rBuddyIqProcResult] vCard Setting process...');
            } else if (uId == Strophe.ID.BUDDY_ADD) {
                // 사용자 추가가 완료 되면, 사용자 정보 공유 메세지를 보낸다rBuddyAddJid
                Judoonge.Core
						.log('[rBuddyIqProcResult] roster add complete...presenceContactRequest..jid : '
								+ Judoonge.DEF.rBuddyAddJid);
                if (Judoonge.DEF.rBuddyAddJid != "") {
                    Judoonge.Core.Action.Jabber
							.presenceContactRequest(Judoonge.DEF.rBuddyAddJid); // 친구에게
                    // 정보공유요청
                    Judoonge.DEF.rBuddyAddJid = "";
                }
            } else if (uId == Strophe.ID.BUDDY_MODIFY) {
                Judoonge.Core
						.log('[rBuddyIqProcResult] roster modify complete...');
                // $(".fgBuddyList dd").remove();
                $("#friendAddInnerBox").empty();
                Judoonge.Core.Action.Jabber
						.buddyList(Strophe.ID.BUDDY_MANAGER_LIST); // 친구관리 사용될
                // 사용자리스트
            } else if (uId == Strophe.ID.BUDDY_DELETE) {
                Judoonge.Core
						.log('[rBuddyIqProcResult] roster delete complete...');
            } else if (uId == Strophe.ID.MUC_ROOMS_GET) {
                // 내가 채팅중인 방 정보
                Judoonge.Core
						.log('[rBuddyIqProcResult] my chat room info process...');

                var item = msg.children('query').children('item');
                // 여러개의 방이 있으므로 하나씩 꺼내서 화면 이벤트로 연결
                item.each(function () {
                    var item2 = $(this);
                    Judoonge.Core.log("room name : " + item2.attr('name')
							+ ", room jid : " + item2.attr('jid'));
                    self.notifyObservers(self.KEYS.CHATINFO, {
                        type: type,
                        id: uId,
                        status: self.KEYS.CHATINFO,
                        roomName: item2.attr('name'),
                        roomJid: item2.attr('jid')
                    });
                });
            } else if (uId == Strophe.ID.DISCO_ITEM_ROOM_USERS_GET) {
                // 채팅방 안의 사용자 정보
                Judoonge.Core
						.log('[rBuddyIqProcResult] my chat room, users info process...');
                var item = msg.children('query').children('item');
                var userNameList = [];
                var roomJid = "";
                // 여러 사용자가 있으므로 하나씩 꺼내서 화면 이벤트로 연결
                item
						.each(function () {
						    var item2 = $(this);
						    var uNick = Strophe.getResourceFromJid(item2
									.attr('jid')), rJid = Strophe
									.getBareJidFromJid(item2.attr('jid'));
						    userNameList.push(uNick);
						    roomJid = rJid;
						    Judoonge.Core.log("recv data : "
									+ item2.attr('jid') + ", room jid : "
									+ rJid + ", nick : " + uNick);
						    self.notifyObservers(self.KEYS.CHATINFO, {
						        type: type,
						        id: uId,
						        status: self.KEYS.CHATINFO,
						        userNick: uNick,
						        roomJid: rJid
						    });
						});
                $("#myText-" + Strophe.getNodeFromJid(roomJid)).text(
						userNameList);

                Judoonge.Util.sessionStorageSave(roomJid, userNameList);
                // var talkname = new Array();
                // for (var i = 0 ; userNameList.length > i ; i++) {
                // Judoonge.Core.log("userNameList[" + i + "]" +
                // userNameList[i]);
                // if (userNameList[i] !=
                // Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid()))
                // talkname.push(userNameList[i]);
                // }
                // if (talkname != null){
                // $("#" + Strophe.getNodeFromJid(roomJid)).text(" " + talkname
                // + " 님과 대화");
                // }
            } else {
                Judoonge.Core
						.log("rBuddyIqProcResult] processing part TODO...iq id : "
								+ uId);
            }

            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyIqProcResult end...');
            return true;
        },

        /**
		 * Function: rBuddyDelete Responds to buddyDelete request(사용하지 않는다,
		 * rBuddyGroupProc 로 통합)
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        rBuddyDelete: function (msg) {
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyDelete start...');
            msg = $(msg);
            var item = msg.children('query').children('item');
            Judoonge.Core.log("iq id : " + msg.attr('id') + ", type : ", msg
					.attr('type'));
            Judoonge.Core.log("jid : " + item.attr('jid'));

            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyDelete end...');
            return true;
        },

        rBuddySearch: function (msg) {
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddySearch start...');
            msg = $(msg);
            var sTi = 0;
            var bsId = msg.attr('id');
            var bsType = msg.attr('type');
            var item, item2;
            Judoonge.Core.log("iq id : " + bsId);
            Judoonge.Core.log("iq type : " + bsType);
            if (bsId == Strophe.ID.BUDDY_SEARCH) {
                // nick search
                item = msg.children('query').children('item');
                item.each(function () {
                    item2 = $(this);
                    sTi++;
                    Judoonge.Core.log("jid : " + item2.attr('jid'));
                    Judoonge.Core
							.log("nick : " + item2.children('nick').text());
                    self.notifyObservers(self.KEYS.FRIEND_MANAGER, {
                        type: bsType,
                        id: bsId,
                        status: self.KEYS.FRIEND_MANAGER,
                        jid: item2.attr('jid'),
                        name: item2.children('nick').text()
                    });
                });
                if (sTi == 0)
                    self.notifyObservers(self.KEYS.FRIEND_MANAGER, {
                        type: bsType,
                        id: bsId,
                        status: self.KEYS.FRIEND_MANAGER,
                        jid: "",
                        name: ""
                    });
            } else if (bsId == Strophe.ID.BUDDY_SEARCH_ID) {
                // id search
                item = msg.find('item');
                var uName = "", uJid = "", uEmail = "";
                item
						.children('field')
						.each(
								function () {
								    item2 = $(this);
								    if (item2.attr('var') == "Name") {
								        uName = item2.children('value').text();
								        Judoonge.Core.log("Name : " + uName);
								    } else if (item2.attr('var') == "Username") {
								        Judoonge.Core.log("Username : "
												+ item2.children('value')
														.text());
								    } else if (item2.attr('var') == "Email") {
								        uEmail = item2.children('value').text();
								        Judoonge.Core.log("Email : " + uEmail);
								    } else if (item2.attr('var') == "jid") {
								        uJid = item2.children('value').text();
								        Judoonge.Core.log("jid : " + uJid);
								        if (uJid != Judoonge.Core.getUser()
												.getJid())
								            self
													.notifyObservers(
															self.KEYS.FRIEND_MANAGER,
															{
															    type: bsType,
															    id: bsId,
															    status: self.KEYS.FRIEND_MANAGER,
															    jid: uJid,
															    name: uName,
															    email: uEmail
															});
								    }
								});

            }

            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddySearch end...');
            return true;
        },

        rBuddyIqProcError: function (msg) {
            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyIqProcError start...');
            var msg = $(msg);
            var item = msg.children('error');
            Judoonge.Core.log("iq id : " + msg.attr('id'));
            Judoonge.Core.log("iq type : " + msg.attr('type'));
            Judoonge.Core.log("error code : " + item.attr('code'));
            // Judoonge.Core.log("jid : " + item.children('group').text());
            if (msg.attr('id') == Strophe.ID.BUDDY_SEARCH) {
                Judoonge.Core
						.log('[Judoonge.Core.Event.Jabber] rBuddySearch Error...');
            } else if (msg.attr('id') == Strophe.ID.BUDDY_REGISTER) {
                Judoonge.Core
						.log('[Judoonge.Core.Event.Jabber] rBuddyRegister Error...');
                alert(msg.children('query').children('username').text()
						+ "는 중복된 ID입니다.\n다른 ID를 이용하세요!");
            } else {
                Judoonge.Core
						.log('[Judoonge.Core.Event.Jabber] rBuddyIqProc Etc Error...');
            }

            Judoonge.Core
					.log('[Judoonge.Core.Event.Jabber] rBuddyIqProcError end...');
            return true;
        },

        /**
		 * Function: Presence Acts on a presence event
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        Presence: function (msg) {

            Judoonge.Core.log('[Judoonge.Core.Event.Jabber] Presence start.. ');
            msg = $(msg);
            var toJid;
            var sStatus;

            if (msg.attr('id') == Strophe.ID.CREATE_ROOM) {
                toJid = msg.attr('to');
                var roomName = Strophe.getNodeFromJid(msg.attr("from"));
                var statusCode = msg.children('x').children('status').attr(
						'code');
                var roomJid = roomName + "@"
						+ Judoonge.serverInfo.conferenDomain;

                // 방장 또는 방원이 나갔을때, 화면은 그대로 유지
                if (msg.attr('type') == Strophe.DEF.PRES_TYPE_UNAVAILABLE) {
                    Judoonge.Core
							.log('[Judoonge.Core.Event.Jabber] Presence roomName : '
									+ roomName + ", anyone quit chat room...");
                    return true;
                } else if (statusCode == Strophe.DEF.GROUPCHAT_SCODE_201) {
                    // create room complet, guest join call process
                    Judoonge.Core
							.log('[Judoonge.Core.Event.Jabber] Presence start..  roomName : '
									+ roomName);
                    for (var i = 0; Judoonge.DEF.callTargetId.length > i; i++) {
                        Judoonge.Core
								.log('[Judoonge.Core.Event.Jabber] Presence start..  Judoonge.DEF.callTargetId[ '
										+ i
										+ ' ] : '
										+ Judoonge.DEF.callTargetId[i]);

                        Judoonge.Core.Action.Jabber.buddyJoinCall(roomName,
								Judoonge.DEF.callTargetId[i],
								Strophe.ID.BUDDY_JOINCALL);
                    }
                    // 나도 채팅방에 접속한다
                    Judoonge.Core.Action.Jabber.Room.upJoin(roomJid, null,
							Strophe.getNodeFromJid(toJid));
                }
            } else if (msg.attr('id') == Strophe.DEF.PRES_STATUS) {
                toJid = msg.attr('to');
                sStatus = msg.children('status').text();
                Judoonge.Core
						.log("[Judoonge.Core.Event.Jabber] Presence login status..  toJid : "
								+ toJid + ", status : " + sStatus);
                self.notifyObservers(self.KEYS.MAINLIST, {
                    type: Strophe.DEF.PRES_STATUS,
                    id: Strophe.DEF.PRES_STATUS,
                    status: self.KEYS.MAINLIST,
                    jid: toJid,
                    status: sStatus
                });
            } else if (msg.attr('id') == Strophe.ID.DEVICE_ON) {
                if (msg.attr("type") != Strophe.DEF.PRES_TYPE_UNAVAILABLE) {
                    Judoonge.Core
							.log("[Judoonge.Core.Event.Jabber] Presence DeviceOn..start.. roomJid : "
									+ msg.children('status').text());
                    webrtc.getUserMedia(msg.children('status').text());
                    Judoonge.Core
							.log("[Judoonge.Core.Event.Jabber] Presence DeviceOn..end.. roomJid : "
									+ msg.children('status').text());
                }
            } else {
                if (msg.children('x[xmlns^="' + Strophe.NS.MUC + '"]').length > 0) {
                    if (msg.attr('type') === 'error') {
                        self.Jabber.Room.PresenceError(msg);
                    } else {
                        self.Jabber.Room.Presence(msg);
                    }
                } else {
                    var fromUsr = msg.attr("from");
                    var fromUsrJid = Strophe.getBareJidFromJid(fromUsr);
                    var fromUsrName = Strophe.escapeNode(Strophe
							.getNodeFromJid(fromUsr));
                    if (!msg.attr("type")) {
                        if (msg.children('status').length > 0) {
                            toJid = msg.attr('to');
                            sStatus = msg.children('status').text();
                            Judoonge.Core
									.log("[Judoonge.Core.Event.Jabber] Presence changeInfo status..  Jid : "
											+ fromUsrJid
											+ ", status : "
											+ sStatus);
                            self.notifyObservers(self.KEYS.MAINLIST, {
                                type: Strophe.DEF.PRES_STATUS,
                                id: Strophe.DEF.PRES_STATUS,
                                status: self.KEYS.MAINLIST,
                                jid: fromUsrJid,
                                status: sStatus
                            });
                        } else {
                            Judoonge.Core
									.log('[Judoonge.Core.Event.Jabber] Presence user login process.. ');
                            self.notifyObservers(self.KEYS.MAINLIST, {
                                type: Strophe.DEF.PRES_LOGIN,
                                jid: fromUsrJid,
                                status: ""
                            });
                        }

                        var idflag = false;
                        for (var i = 0; Judoonge.DEF.loginlistFullJid.length > i; i++) {
                            if (Judoonge.DEF.loginlistFullJid[i] == fromUsr) {
                                return idflag = true;
                            }
                        }
                        ;
                        if (!idflag) {
                            Judoonge.DEF.loginlistFullJid.push(fromUsr);
                        }

                    } else if (msg.attr("type") == Strophe.DEF.PRES_TYPE_UNAVAILABLE) {
                        Judoonge.Core
								.log('[Judoonge.Core.Event.Jabber] Presence user logout process.. ');
                        self.notifyObservers(self.KEYS.MAINLIST, {
                            type: Strophe.DEF.PRES_LOGOUT,
                            jid: fromUsrJid
                        });
                        for (var index in Judoonge.DEF.loginlistFullJid) {
                            if (Judoonge.DEF.loginlistFullJid[index] == fromUsr) {
                                Judoonge.DEF.loginlistFullJid.splice(index, 1);
                            }
                        }
                        ;
                    } else if (msg.attr("type") == Strophe.DEF.PRES_TYPE_SUBSCRIBE) {
                        Judoonge.Core
								.log('[Judoonge.Core.Event.Jabber] Presence user subscribe process.. ');
                        Judoonge.Core.Action.Jabber.presenceContactResponse(
								fromUsrJid, Strophe.DEF.PRES_TYPE_SUBSCRIBED); // 정보공유응답(승인으로
                        // 보냄)
                        if (Judoonge.DEF.PresReqFlag == 0) {
                            Judoonge.Core.Action.Jabber
									.presenceContactRequest(fromUsrJid); // 친구에게
                            // 정보공유요청
                        }
                    } else if (msg.attr("type") == Strophe.DEF.PRES_TYPE_SUBSCRIBED) {
                        Judoonge.Core
								.log('[Judoonge.Core.Event.Jabber] Presence subscribed user : '
										+ fromUsr);
                        var gFlag;
                        if ($("#pgTitle-NewFriend").attr("class") == undefined) {
                            gFlag = "1";
                            Judoonge.DEF.peopleAdd.gFlag = gFlag;
                        }

                        if (Judoonge.DEF.peopleAdd != null
								&& Judoonge.DEF.peopleAdd.name != undefined) {
                            // Judoonge.View.Pane.People.showPeople(Judoonge.DEF.peopleAdd);
                            // alert('"' +
                            // Strophe.getNodeFromJid(Judoonge.DEF.peopleAdd.jid)
                            // + '" 가 친구 추가 되었습니다.');
                        } else {
                            Judoonge.View.Pane.People
									.showPeople({
									    jid: Judoonge.DEF.peopleAdd.jid,
									    name: Strophe
												.getNodeFromJid(Judoonge.DEF.peopleAdd.jid),
									    group: Strophe.DEF.DEFAULT_GROUP,
									    gFlag: gFlag
									});
                            alert('"'
									+ Strophe
											.getNodeFromJid(Judoonge.DEF.peopleAdd.jid)
									+ '" 가 친구 추가 되었습니다.');
                        }
                        $(".peopleCount").text(
								"친구(" + ++Judoonge.DEF.PeopleCount + "명)");
                        Judoonge.DEF.PresReqFlag = 0;
                    } else {
                        Judoonge.Core
								.log('[Judoonge.Core.Event.Jabber] Presence etc.. ');
                    }
                }
            }
            return true;
        },

        /**
		 * Function: Bookmarks Acts on a bookmarks event. When a bookmark has
		 * the attribute autojoin set, joins this room.
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        Bookmarks: function (msg) {
            Judoonge.Core.log('[Jabber] Bookmarks');
            // Autojoin bookmarks (Openfire)
            $('conference', msg).each(function () {
                var item = $(this);
                if (item.attr('autojoin')) {
                    Judoonge.Core.Action.Jabber.Room.Join(item.attr('jid'));
                }
            });
            return true;
        },

        /**
		 * Function: PrivacyList Acts on a privacy list event and sets up the
		 * current privacy list of this user.
		 * 
		 * If no privacy list has been added yet, create the privacy list and
		 * listen again to this event.
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - false to disable the handler after first call.
		 */
        PrivacyList: function (msg) {
            Judoonge.Core.log('[Jabber] PrivacyList');
            var currentUser = Judoonge.Core.getUser();

            $('list[name="ignore"] item', msg).each(
					function () {
					    var item = $(this);
					    if (item.attr('action') === 'deny') {
					        currentUser.addToOrRemoveFromPrivacyList('ignore',
									item.attr('value'));
					    }

					});
            Judoonge.Core.Action.Jabber.SetIgnoreListActive();
            return false;
        },

        /**
		 * Function: PrivacyListError Acts when a privacy list error has been
		 * received.
		 * 
		 * Currently only handles the case, when a privacy list doesn't exist
		 * yet and creates one.
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - false to disable the handler after first call.
		 */
        PrivacyListError: function (msg) {
            Judoonge.Core.log('[Jabber] PrivacyListError');
            // check if msg says that privacyList doesn't exist
            if ($('error[code="404"][type="cancel"] item-not-found', msg)) {
                Judoonge.Core.Action.Jabber.ResetIgnoreList();
                Judoonge.Core.Action.Jabber.SetIgnoreListActive();
            }
            return false;
        },

        /**
		 * Function: Message Acts on room, admin and server messages and
		 * notifies the view if required.
		 * 
		 * Parameters: (String) msg - Raw XML Message
		 * 
		 * Returns: (Boolean) - true
		 */
        Message: function (msg) {
            Judoonge.Core.log('[Jabber] Message');
            var msg = $(msg), fromJid = msg.attr('from'), type = msg
					.attr('type'), toJid = msg.attr('to');
            procID = msg.attr('id');
            if (procID == Strophe.ID.BUDDY_JOINCALL) {
                // group chat join message
                var roomName = msg.children('x').attr('jid');
                var roomJid = roomName + "@"
						+ Judoonge.serverInfo.conferenDomain;
                var joinNick = Strophe.getNodeFromJid(toJid);
                Judoonge.Core
						.log('[Jabber] group chat join message -> roomJid : '
								+ roomJid + ", joinNick : " + joinNick);
                // Judoonge.Core.getConnection().muc.join(roomJid, joinNick,
                // null, null, null);
                Judoonge.Core.Action.Jabber.Room
						.upJoin(roomJid, null, joinNick);
            } else if (type == Strophe.DEF.MESSAGE_TYPE_VIDEOCHAT) {
                // multi video chat start
                var mBody = msg.children('body').text();
                Judoonge.Core
						.log("[Jabber:Room] Message createMultiVideoChat..start.. msg : "
								+ mBody);
                message = {
                    name: mBody,
                    body: mBody,
                    type: Strophe.DEF.MESSAGE_TYPE_VIDEOCHAT
                };
                self.notifyObservers(self.KEYS.MESSAGE, {
                    roomJid: mBody,
                    message: message
                });
            } else if (type == Strophe.DEF.MESSAGE_TYPE_AUDIOCHAT) {
                // multi audio chat start
                var mBody = msg.children('body').text();
                Judoonge.Core
						.log("[Jabber:Room] Message createMultiAudioChat..start.. msg : "
								+ mBody);
                message = {
                    name: mBody,
                    body: mBody,
                    type: Strophe.DEF.MESSAGE_TYPE_AUDIOCHAT
                };
                self.notifyObservers(self.KEYS.MESSAGE, {
                    roomJid: mBody,
                    message: message
                });
            } else {
                // Room message
                if (fromJid !== Strophe.getDomainFromJid(fromJid)
						&& (type === 'groupchat' || type === 'chat' || type === 'error')) {
                    self.Jabber.Room.Message(msg);
                    // Admin message
                } else if (!toJid
						&& fromJid === Strophe.getDomainFromJid(fromJid)) {
                    self.notifyObservers(self.KEYS.CHAT, {
                        type: (type || 'message'),
                        message: msg.children('body').text()
                    });
                    // Server Message
                } else if (toJid
						&& fromJid === Strophe.getDomainFromJid(fromJid)) {
                    self.notifyObservers(self.KEYS.CHAT, {
                        type: (type || 'message'),
                        subject: msg.children('subject').text(),
                        message: msg.children('body').text()
                    });
                }
            }
            return true;
        },

        /**
		 * Class: Judoonge.Core.Event.Jabber.Room Room specific events
		 */
        Room: {
            /**
			 * Function: Leave Leaves a room and cleans up related data and
			 * notifies view.
			 * 
			 * Parameters: (String) msg - Raw XML Message
			 * 
			 * Returns: (Boolean) - true
			 */
            Leave: function (msg) {
                Judoonge.Core.log('[Jabber:Room] Leave');
                var msg = $(msg), from = msg.attr('from'), roomJid = Strophe
						.getBareJidFromJid(from);

                // if room is not joined yet, ignore.
                if (!Judoonge.Core.getRoom(roomJid)) {
                    return false;
                }

                var roomName = Judoonge.Core.getRoom(roomJid).getName(), item = msg
						.find('item'), type = 'leave', reason, actor;

                delete Judoonge.Core.getRooms()[roomJid];
                // if user gets kicked, role is none and there's a status code
                // 307
                if (item.attr('role') === 'none') {
                    if (msg.find('status').attr('code') === '307') {
                        type = 'kick';
                    } else if (msg.find('status').attr('code') === '301') {
                        type = 'ban';
                    }
                    reason = item.find('reason').text();
                    actor = item.find('actor').attr('jid');
                }

                // var user = new Judoonge.Core.ChatUser(from,
                // Strophe.getResourceFromJid(from), item.attr('affiliation'),
                // item.attr('role'));

                self.notifyObservers(self.KEYS.PRESENCE, {
                    'roomJid': roomJid,
                    'roomName': roomName,
                    'type': type,
                    'reason': reason,
                    'actor': actor
                });
                return true;
            },

            /**
			 * Function: Disco Sets informations to rooms according to the disco
			 * info received.
			 * 
			 * Parameters: (String) msg - Raw XML Message
			 * 
			 * Returns: (Boolean) - true
			 */
            Disco: function (msg) {
                Judoonge.Core.log('[Jabber:Room] Disco');
                var msg = $(msg), roomJid = Strophe.getBareJidFromJid(msg
						.attr('from'));

                // Client joined a room
                if (!Judoonge.Core.getRooms()[roomJid]) {
                    Judoonge.Core.getRooms()[roomJid] = new Judoonge.Core.ChatRoom(
							roomJid);
                }
                // Room existed but room name was unknown
                var roomName = msg.find('identity').attr('name'), room = Judoonge.Core
						.getRoom(roomJid);
                if (room.getName() === null) {
                    room.setName(roomName);
                    // Room name changed
                }/*
					 * else if(room.getName() !== roomName && room.getUser() !==
					 * null) { // NOTE: We want to notify the View here but
					 * jabber doesn't send anything when the room name changes
					 * :-( }
					 */
                // maverick
                Judoonge.Core.log('[Jabber:Room] Disco, roomName : ' + roomName
						+ " roomJid : " + roomJid);
                return true;
            },

            /**
			 * Function: Presence Acts on various presence messages (room
			 * leaving, room joining, error presence) and notifies view.
			 * 
			 * Parameters: (Object) msg - jQuery object of XML message
			 * 
			 * Returns: (Boolean) - true
			 */
            Presence: function (msg) {
                Judoonge.Core.log('[Jabber:Room] Presence');
                var from = Judoonge.Util.unescapeJid(msg.attr('from')), roomJid = Strophe
						.getBareJidFromJid(from), presenceType = msg
						.attr('type');

                // Client left a room
                if (Strophe.getResourceFromJid(from) === Judoonge.Core
						.getUser().getNick()
						&& presenceType === 'unavailable') {
                    self.Jabber.Room.Leave(msg);
                    return true;
                }

                // Client joined a room
                var room = Judoonge.Core.getRoom(roomJid);
                if (!room) {
                    Judoonge.Core.getRooms()[roomJid] = new Judoonge.Core.ChatRoom(
							roomJid);
                    room = Judoonge.Core.getRoom(roomJid);
                }

                var roster = room.getRoster(), action, user, item = msg
						.find('item');
                // User joined a room
                if (presenceType !== 'unavailable') {
                    var nick = Strophe.getResourceFromJid(from);
                    user = new Judoonge.Core.ChatUser(from, nick, item
							.attr('affiliation'), item.attr('role'));
                    // Room existed but client (myself) is not yet registered
                    if (room.getUser() === null
							&& Judoonge.Core.getUser().getNick() === nick) {
                        room.setUser(user);
                    }
                    roster.add(user);
                    action = 'join';
                    // User left a room
                } else {
                    action = 'leave';
                    if (item.attr('role') === 'none') {
                        if (msg.find('status').attr('code') === '307') {
                            action = 'kick';
                        } else if (msg.find('status').attr('code') === '301') {
                            action = 'ban';
                        }
                    }
                    user = roster.get(from);
                    roster.remove(from);
                }
                // maverick
                var sCode = msg.parent('body').find('status').attr('code');
                var uJid = item.attr('jid');
                Judoonge.Core.log('[Jabber:Room] Presence >> type : '
						+ presenceType + ', uJid : ' + uJid + ', user : '
						+ Judoonge.Core.getUser() + ", nick : " + nick
						+ ", roomName : " + Strophe.getNodeFromJid(roomJid)
						+ ", roomJid : " + roomJid + ", statusCode : " + sCode
						+ ", affiliation : " + item.attr('affiliation'));

                // self.notifyObservers(self.KEYS.PRESENCE, {'roomJid': roomJid,
                // 'roomName': Strophe.getNodeFromJid(roomJid), 'user': user,
                // 'action': action, 'currentUser': Judoonge.Core.getUser(),
                // nick: nick } );
                self.notifyObservers(self.KEYS.PRESENCE, {
                    'type': presenceType,
                    'uJid': uJid,
                    'roomJid': roomJid,
                    'roomName': Strophe.getNodeFromJid(roomJid),
                    'user': user,
                    'action': action,
                    'currentUser': Judoonge.Core.getUser(),
                    nick: nick,
                    statusCode: sCode,
                    affiliation: item.attr('affiliation')
                });
                return true;
            },

            /**
			 * Function: PresenceError Acts when a presence of type error has
			 * been retrieved.
			 * 
			 * Parameters: (Object) msg - jQuery object of XML message
			 * 
			 * Returns: (Boolean) - true
			 */
            PresenceError: function (msg) {
                Judoonge.Core.log('[Jabber:Room] Presence Error');
                var from = Judoonge.Util.unescapeJid(msg.attr('from')), roomJid = Strophe
						.getBareJidFromJid(from), room = Judoonge.Core
						.getRooms()[roomJid], roomName = room.getName();

                // Presence error: Remove room from array to prevent error when
                // disconnecting
                delete room;

                self.notifyObservers(self.KEYS.PRESENCE_ERROR, {
                    'msg': msg,
                    'type': msg.children('error').children()[0].tagName
							.toLowerCase(),
                    'roomJid': roomJid,
                    'roomName': roomName
                });
            },

            /**
			 * Function: Message Acts on various message events (subject
			 * changed, private chat message, multi-user chat message) and
			 * notifies view.
			 * 
			 * Parameters: (String) msg - jQuery object of XML message
			 * 
			 * Returns: (Boolean) - true
			 */
            Message: function (msg) {
                Judoonge.Core.log('[Jabber:Room] Message');
                // Room subject
                var roomJid, message, mBody;
                if (msg.children('subject').length > 0) {
                    roomJid = Judoonge.Util.unescapeJid(Strophe
							.getBareJidFromJid(msg.attr('from')));
                    message = {
                        name: Strophe.getNodeFromJid(roomJid),
                        body: msg.children('subject').text(),
                        type: 'subject'
                    };
                    // Error messsage
                } else if (msg.attr('type') === 'error') {
                    var error = msg.children('error');
                    if (error.attr('code') === '500'
							&& error.children('text').length > 0) {
                        roomJid = msg.attr('from');
                        message = {
                            type: 'info',
                            body: error.children('text').text()
                        };
                    }
                    // Chat message
                } else if (msg.children('body').length > 0) {
                    mBody = msg.children('body').text();
                    roomJid = Judoonge.Util.unescapeJid(Strophe
							.getBareJidFromJid(msg.attr('from')));
                    message = {
                        name: mBody,
                        body: mBody,
                        type: 'info'
                    };
                    // Private chat message
                    if (msg.attr('type') === 'chat') {
                        // hwcho facebook 연결 메세지
                        alert("페이스북친구가 추가 되었습니다.");
                        $(".mainMenuList li:eq(4) a").removeClass(
								"mainMenuSelect");
                        $(".mainMenuList li:eq(0) a")
								.addClass("mainMenuSelect");
                        Judoonge.Core.Action.Jabber.Presence(); // User sends
                        // initial
                        // presence
                        Judoonge.Core.Action.Jabber
								.buddyRegisterView(Strophe.ID.BUDDY_REGISTERVIEW); // my
                        // register
                        // info
                        Judoonge.Core.Action.Jabber
								.buddyList(Strophe.ID.BUDDY_LIST); // 사용자리스트
                        roomJid = Judoonge.Util.unescapeJid(msg.attr('from'));
                        var bareRoomJid = Strophe.getBareJidFromJid(roomJid),
						// if a 3rd-party client sends a direct message to this
						// user (not via the room) then the username is the node
						// and not the resource.
						isNoConferenceRoomJid = !Judoonge.Core
								.getRoom(bareRoomJid), name = isNoConferenceRoomJid ? Strophe
								.getNodeFromJid(roomJid)
								: Strophe.getResourceFromJid(roomJid);
                        message = {
                            name: name,
                            body: msg.children('body').text(),
                            type: msg.attr('type'),
                            isNoConferenceRoomJid: isNoConferenceRoomJid
                        };
                    } else if (mBody == Strophe.ID.DEVICE_ON) {
                        Judoonge.Core
								.log("[Jabber:Room] Message DeviceOn..start.. roomJid : "
										+ Strophe.getNodeFromJid(roomJid));
                        return true;
                    } else if (mBody == Strophe.DEF.AUDIO_CALL
							|| mBody == Strophe.DEF.VIDEO_CALL
							|| mBody == Strophe.DEF.CALL_REJECT_MSG) {
                        Judoonge.Core
								.log("[Jabber:Room] Message Audio/Video/CallReject Call..start.. roomJid : "
										+ Strophe.getNodeFromJid(roomJid));
                        self.notifyObservers(self.KEYS.MESSAGE, {
                            roomJid: roomJid,
                            message: message
                        });
                        return true;
                        // Multi-user chat message
                    } else {
                        roomJid = Judoonge.Util.unescapeJid(Strophe
								.getBareJidFromJid(msg.attr('from')));
                        var resource = Strophe.getResourceFromJid(msg
								.attr('from'));
                        // Message from a user
                        if (resource) {
                            resource = Strophe.unescapeNode(resource);
                            message = {
                                name: resource,
                                body: msg.children('body').text(),
                                type: msg.attr('type')
                            };
                            // Message from server
                            // (XEP-0045#registrar-statuscodes)
                        } else {
                            message = {
                                name: '',
                                body: msg.children('body').text(),
                                type: 'info'
                            };
                        }
                    }
                    // Unhandled message
                } else {
                    return true;
                }

                // besides the delayed delivery (XEP-0203), there exists also
                // XEP-0091 which is the legacy delayed delivery.
                // the x[xmlns=jabber:x:delay] is the format in XEP-0091.
                var delay = msg.children('delay') ? msg.children('delay') : msg
						.children('x[xmlns="' + Strophe.NS.DELAY + '"]'), timestamp = delay !== undefined ? delay
						.attr('stamp')
						: null;

                // maverick
                var writeName = Strophe.getBareJidFromJid(delay.attr('from'));
                Judoonge.Core.log("[Jabber:Room] Message >> name : "
						+ writeName + ", msg : " + msg.children('body').text()
						+ " , stamp : " + timestamp);

                self.notifyObservers(self.KEYS.MESSAGE, {
                    roomJid: roomJid,
                    message: message,
                    timestamp: timestamp
                });
                return true;
            }
        }
    };

    return self;
}(Judoonge.Core.Event || {}, Strophe, jQuery, Judoonge.Util.Observable));
/**
 * File: event.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.View.Event Empty hooks to capture events and inject custom
 * code.
 * 
 * Parameters: (Judoonge.View.Event) self - itself (jQuery) $ - jQuery
 */
Judoonge.View.Event = (function (self, $) {
    /**
	 * Class: Judoonge.View.Event.Chat Chat-related events
	 */
    self.Chat = {
        /**
		 * Function: onAdminMessage Called when receiving admin messages
		 * 
		 * Parameters: (Object) args - {subject, message}
		 */
        onAdminMessage: function (args) {
            return;
        },

        /**
		 * Function: onDisconnect Called when client disconnects
		 */
        onDisconnect: function () {
            return;
        },

        /**
		 * Function: onAuthfail Called when authentication fails
		 */
        onAuthfail: function () {
            return;
        }
    };

    /**
	 * Class: Judoonge.View.Event.Room Room-related events
	 */
    self.Room = {
        /**
		 * Function: onAdd Called when a new room gets added
		 * 
		 * Parameters: (Object) args - {roomJid, type=chat|groupchat, element}
		 */
        onAdd: function (args) {
            return;
        },

        /**
		 * Function: onShow Called when a room gets shown
		 * 
		 * Parameters: (Object) args - {roomJid, element}
		 */
        onShow: function (args) {
            return;
        },

        /**
		 * Function: onHide Called when a room gets hidden
		 * 
		 * Parameters: (Object) args - {roomJid, element}
		 */
        onHide: function (args) {
            return;
        },

        /**
		 * Function: onSubjectChange Called when a subject of a room gets
		 * changed
		 * 
		 * Parameters: (Object) args - {roomJid, element, subject}
		 */
        onSubjectChange: function (args) {
            return;
        },

        /**
		 * Function: onClose Called after a room has been left/closed
		 * 
		 * Parameters: (Object) args - {roomJid}
		 */
        onClose: function (args) {
            return;
        },

        /**
		 * Function: onPresenceChange Called when presence of user changes
		 * (kick, ban)
		 * 
		 * Parameters: (Object) args - {roomJid, user, reason, type}
		 */
        onPresenceChange: function (args) {
            return;
        }
    };

    /**
	 * Class: Judoonge.View.Event.Roster Roster-related events
	 */
    self.Roster = {
        /**
		 * Function: onUpdate Called after a user have been added to the roster
		 * 
		 * Parameters: (Object) args - {roomJid, user, action, element}
		 */
        onUpdate: function (args) {
            return;
        },

        /**
		 * Function: onContextMenu Called when a user clicks on the action menu
		 * arrow. The return value is getting appended to the menulinks.
		 * 
		 * Parameters: (Object) args - {roomJid, user}
		 * 
		 * Returns: (Object) - containing menulinks
		 */
        onContextMenu: function (args) {
            return {};
        },

        /**
		 * Function: afterContextMenu Called when after a the context menu is
		 * rendered
		 * 
		 * Parameters: (Object) args - {roomJid, element, user}
		 */
        afterContextMenu: function (args) {
            return;
        }
    };

    /**
	 * Class: Judoonge.View.Event.Message Message-related events
	 */
    self.Message = {
        /**
		 * Function: beforeShow Called before a new message will be shown.
		 * 
		 * Parameters: (Object) args - {roomJid, nick, message}
		 * 
		 * Returns: (String) message
		 */
        beforeShow: function (args) {
            return args.message;
        },

        /**
		 * Function: onShow Called after a new message has been shown
		 * 
		 * Parameters: (Object) args - {roomJid, element, nick, message}
		 */
        onShow: function (args) {
            return;
        },

        /**
		 * Function: beforeSend Called before a message get sent
		 * 
		 * Parameters: (String) message
		 * 
		 * Returns: (String) message
		 */
        beforeSend: function (message) {
            return message;
        }
    };

    return self;
}(Judoonge.View.Event || {}, jQuery));
/**
 * File: observer.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.View.Observer Observes Judoonge core events
 * 
 * Parameters: (Judoonge.View.Observer) self - itself (jQuery) $ - jQuery
 */
Judoonge.View.Observer = (function (self, $) {
    /**
	 * Class: Judoonge.View.Observer.Chat Chat events
	 */

    self.Chat = {
        /**
		 * Function: update The update method gets called whenever an event to
		 * which "Chat" is subscribed.
		 * 
		 * Currently listens for connection status updates & admin messages /
		 * motd
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {type, connection or message & subject}
		 */
        update: function (obj, args) {
            // maverick
            Judoonge.Core
					.log("Judoonge.View.Observer.Chat update(obj, args) -> args.type : "
							+ args.type
							+ ", args.status : "
							+ args.status
							+ " , args.subject : "
							+ args.subject
							+ ", args.message" + args.message);
            if (args.type === 'connection') {
                switch (args.status) {
                    case Strophe.Status.CONNECTING:
                    case Strophe.Status.AUTHENTICATING:
                        Judoonge.View.Pane.Chat.Modal.show($.i18n
                                ._('statusConnecting'), false, true);
                        break;

                    case Strophe.Status.ATTACHED:
                    case Strophe.Status.CONNECTED:
                        Judoonge.View.Pane.Chat.Modal.show($.i18n
                                ._('statusConnected'));
                        Judoonge.View.Pane.Chat.Modal.hide();
                        break;

                    case Strophe.Status.DISCONNECTING:
                        Judoonge.View.Pane.Chat.Modal.show($.i18n
                                ._('statusDisconnecting'), false, true);
                        break;

                    case Strophe.Status.DISCONNECTED:
                        Judoonge.View.Pane.Login.showForm();
                        Judoonge.View.Event.Chat.onDisconnect();
                        break;

                    case Strophe.Status.AUTHFAIL:
                        Judoonge.View.Pane.Login.showForm();
                        Judoonge.View.Event.Chat.onAuthfail();
                        break;

                    default:
                        Judoonge.View.Pane.Chat.Modal.show($.i18n._('status',
                                args.status));
                        break;
                }
            } else if (args.type === 'message') {
                Judoonge.View.Pane.Chat.adminMessage((args.subject || ''),
						args.message);
            } else if (args.type === 'chat' || args.type === 'groupchat') {
                // use onInfoMessage as infos from the server shouldn't be
                // hidden by the infoMessage switch.
                Judoonge.View.Pane.Chat.onInfoMessage(Judoonge.View
						.getCurrent().roomJid, (args.subject || ''),
						args.message);
            }
        }
    };

    /**
	 * Class: Judoonge.View.Observer.Presence Presence update events
	 */
    self.Presence = {
        /**
		 * Function: update Every presence update gets dispatched from this
		 * method.
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - Arguments differ on each type
		 * 
		 * Uses: - <notifyPrivateChats>
		 */
        update: function (obj, args) {
            // maverick
            Judoonge.Core
					.log("Judoonge.View.Observer.Presence update(obj, args) start -> args.type : "
							+ args.type
							+ ", args.roomJid : "
							+ args.roomJid
							+ " , args.actor : "
							+ args.actor
							+ ", args.currentUser" + args.currentUser);

            // Client left
            if (args.type === 'leave') {
                Judoonge.Core
						.log("Judoonge.View.Observer.Presence chat close..here.. roomJid : "
								+ args.roomJid
								+ ", roomName : "
								+ args.roomName);
                for (var index in Judoonge.DEF.TalkRoomList) {
                    if (Judoonge.DEF.TalkRoomList[index] == args.roomJid) {
                        Judoonge.DEF.TalkRoomList.splice(index, 1);
                    }
                }
                ;
                $("#talkli-" + Strophe.getNodeFromJid(args.roomJid)).remove();
                if (Judoonge.DEF.TalkRoomList.length == 0) {
                    $("#chattingGrpTap").remove();
                    $("#chattingBoxmainnotice").show();
                }
                $("#chattingContent-" + Strophe.getNodeFromJid(args.roomJid))
						.remove();
                $("#inputBox-" + Strophe.getNodeFromJid(args.roomJid)).remove();
                $("#plusBox-" + Strophe.getNodeFromJid(args.roomJid)).remove();
                $("#locationBox-" + Strophe.getNodeFromJid(args.roomJid))
						.remove();
                $("#popAddFriendBox-" + Strophe.getNodeFromJid(args.roomJid))
						.remove();
                $(".chattingPeopleList li").css("width",
						(100 / --Judoonge.DEF.chattingTabCount) + "%");
                if ($(".roomSelected .talkselectonoff").attr("id") == undefined) {
                    $(".chattingPeopleList li:eq(0) div").addClass(
							"roomSelected");
                }
                if ($(".roomSelected").attr("class") != undefined) {
                    $(".roomSelected .talkselectonoff img").attr("src",
							"images/common/stateon.png");
                    $(".roomSelected .closeBtn img").attr("src",
							"images/common/x_black.png");
                    var roomJidarray = $(".roomSelected .talkselectonoff")
							.attr("id").split("-");
                    var roomJid = roomJidarray[1] + "-" + roomJidarray[2];

                    $("#chattingContent-" + roomJid).show();
                    $("#inputBox-" + roomJid).show();
                    $("#chattingInput-" + roomJid).focus();
                }
            } else if (args.type === Strophe.DEF.PRES_TYPE_UNAVAILABLE) {
                Judoonge.Core
						.log("Judoonge.View.Observer.Presence chat guest leave..here.. uJid : "
								+ args.uJid
								+ ", roomJid : "
								+ args.roomJid
								+ ", roomName : " + args.roomName);
                Judoonge.Core.Action.Jabber.discoMucRoomUsersGet(args.roomJid,
						Strophe.ID.DISCO_ITEM_ROOM_USERS_GET);

                // hwcho 2014-06-01 주둥이 화면 처리 제거 및 나도 방 나가기
                // Judoonge.View.Pane.Talk.showTalkNotice(args, "out");
            } else if (args.type === 'kick' || args.type === 'ban') {
                Judoonge.Core
						.log("Judoonge.View.Observer.Presence update(obj, args), type->'kick' or 'ban'  args.roomJid : "
								+ args.roomJid);
            } else {
                Judoonge.Core
						.log("Judoonge.View.Observer.Presence update(obj, args), Initialize -> args.roomName : "
								+ args.roomName
								+ ", args.roomJid : "
								+ args.roomJid);
                // 채팅 화면 띄우기, 채팅 설정이 완료 되었다면..status code 값 100 이면 성공
                if (args.nick == Strophe.getNodeFromJid(Judoonge.Core.getUser()
						.getJid())) {
                    Judoonge.Core
							.log('[Jabber:Room] Presence >> chat screen view...here2.... -> nick : '
									+ args.nick);
                    if (args.statusCode == Strophe.DEF.GROUPCHAT_SCODE_100
							|| args.affiliation == Strophe.DEF.GROUPCHAT_SCODE_OWNER) {
                        // 초대 요청을 받은 사람의 화면 처리 및 채팅방 생성자의 화면 처리
                        Judoonge.Core.Action.Jabber.discoMucRoomUsersGet(
								args.roomJid,
								Strophe.ID.DISCO_ITEM_ROOM_USERS_GET);
                        Judoonge.DEF.TalkRoomList.push(args.roomJid);

                        // hwcho 2014-06-01 전 화면 주석
                        //						Judoonge.View.Pane.Talk.showTalkTab(args);
                        //						$("#chattingBoxmainnotice").hide();
                    }
                } else {
                    if (args.affiliation != Strophe.DEF.GROUPCHAT_SCODE_OWNER) {
                        Judoonge.Core
								.log('[Jabber:Room] Presence >> group chat guest join...here3... -> nick : '
										+ args.nick);

                        // hwcho 2014-06-01 방 들어왔을 때 화면 처리 제거
                        //						Judoonge.View.Pane.Talk.showTalkNotice(args, "in");
                        Judoonge.Core.Action.Jabber.discoMucRoomUsersGet(
								args.roomJid,
								Strophe.ID.DISCO_ITEM_ROOM_USERS_GET);
                    }
                }
            }
            Judoonge.Core
					.log("Judoonge.View.Observer.Presence update(obj, args) end -> args.type : "
							+ args.type
							+ ", args.roomJid : "
							+ args.roomJid
							+ " , args.actor : "
							+ args.actor
							+ ", args.currentUser" + args.currentUser);
        },

        /**
		 * Function: notifyPrivateChats Notify private user chats if existing
		 * 
		 * Parameters: (Judoonge.Core.chatUser) user - User which has done the
		 * event (String) type - Event type (leave, join, kick/ban)
		 */
        notifyPrivateChats: function (user, type) {
            Judoonge.Core.log('[View:Observer] notify Private Chats');
            var roomJid;
            for (roomJid in Judoonge.View.Pane.Chat.rooms) {
                if (Judoonge.View.Pane.Chat.rooms.hasOwnProperty(roomJid)
						&& Judoonge.View.Pane.Room.getUser(roomJid)
						&& user.getJid() === Judoonge.View.Pane.Room.getUser(
								roomJid).getJid()) {
                    Judoonge.View.Pane.Roster.update(roomJid, user, type, user);
                    Judoonge.View.Pane.PrivateRoom.setStatus(roomJid, type);
                }
            }
        }
    };

    /**
	 * Class: Judoonge.View.Observer.PresenceError Presence error events
	 */
    self.PresenceError = {
        /**
		 * Function: update Presence errors get handled in this method
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {msg, type, roomJid, roomName}
		 */
        update: function (obj, args) {
            // maverick
            Judoonge.Core
					.log("Judoonge.View.Observer.PresenceError update(obj, args) -> args.type : "
							+ args.type
							+ ", args.roomJid : "
							+ args.roomJid
							+ " , args.roomName : " + args.roomName);
            switch (args.type) {
                case 'not-authorized':
                    var message;
                    if (args.msg.children('x').children('password').length > 0) {
                        message = $.i18n._('passwordEnteredInvalid',
                                [args.roomName]);
                    }
                    Judoonge.View.Pane.Chat.Modal.showEnterPasswordForm(
                            args.roomJid, args.roomName, message);
                    break;
                case 'conflict':
                    Judoonge.View.Pane.Chat.Modal
                            .showNicknameConflictForm(args.roomJid);
                    break;
                case 'registration-required':
                    Judoonge.View.Pane.Chat.Modal.showError('errorMembersOnly',
                            [args.roomName]);
                    break;
                case 'service-unavailable':
                    Judoonge.View.Pane.Chat.Modal.showError(
                            'errorMaxOccupantsReached', [args.roomName]);
                    break;
            }
        }
    };

    /**
	 * Class: Judoonge.View.Observer.Message Message related events
	 */
    self.Message = {
        /**
		 * Function: update Messages received get dispatched from this method.
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {message, roomJid}
		 */
        update: function (obj, args) {
            var msgBody;
            var shareInfo, shareVal;
            // maverick, 메세지 받아서 처리 하는 부분
            Judoonge.Core
					.log("Judoonge.View.Observer.Message update(obj, args) -> args.type : "
							+ args.type
							+ ", args.roomJid : "
							+ args.roomJid
							+ ", args.message.name : "
							+ args.message.name
							+ " , args.message.body : " + args.message.body);
            var time = Judoonge.Util.localizedTime(new Date().toGMTString());
            if (args.message.name) {
                msgBody = args.message.body;
                // create multi video chat
                if (args.message.type == Strophe.DEF.MESSAGE_TYPE_VIDEOCHAT) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] createMultiVideoChat start...-> "
									+ msgBody);
                    Judoonge.Core
							.log("createMultiVideoChat Info...-> roomJid : "
									+ args.roomJid + ", msg : " + msgBody);
                    if (confirm("멀티영상을 연결 하시겠습니까?")) {
                        window
								.open(
										"vedio_chatting.html?#" + msgBody,
										"",
										"width=440, height=545, menubar=0,location=no, resizable=0, scrollbars=0, status=0");
                    }
                    return true;
                }
                if (args.message.type == Strophe.DEF.MESSAGE_TYPE_AUDIOCHAT) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] createMultiAudioChat start...-> "
									+ msgBody);
                    Judoonge.Core
							.log("createMultiAudioChat Info...-> roomJid : "
									+ args.roomJid + ", msg : " + msgBody);
                    if (confirm("멀티음성을 연결 하시겠습니까?")) {
                        window
								.open(
										"audio_chatting.html?#" + msgBody,
										"",
										"width=340, height=183, menubar=0,location=no, resizable=0, scrollbars=0, status=0");
                    }
                    return true;
                }
                // audio/video device enable message
                if (msgBody == Strophe.DEF.DEVICE_ENABLE) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] UserDeviceEnable start...-> id : "
									+ args.message.name);
                    // hwcho 2014-05-28 내 영상 추가
                    webrtc.getUserMedia(Strophe.getNodeFromJid(args.roomJid));

                    return true;
                }
                // 문서 공유 화면 처리 부분
                if (msgBody.match(Strophe.DEF.SHARE_DOCUMENT)) {
                    // 문서공유 처리
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] ShareDocument start...-> "
									+ msgBody);
                    shareInfo = msgBody.split(Strophe.DEF.SHARE_SEPARATOR);
                    shareVal = shareInfo[1].split(Strophe.DEF.VALUE_SEPARATOR); // 파일이름#파일갯수
                    // split
                    shareVal[0] = shareVal[0].substring(0, shareVal[0]
							.lastIndexOf('.'));
                    Judoonge.Core.log("ShareDocument Info...-> roomJid : "
							+ args.roomJid + ", docName : " + shareVal[0]
							+ ", docTotalPage : " + shareVal[1]);
                    // bkpark
                    Judoonge.View.Pane.Talk.showTalkShareDocument(args,
							shareVal[0], shareVal[1]);
                    // Judoonge.View.Pane.ChatRoom.showdocumentView(args,
                    // shareVal[0], shareVal[1]);
                } else if (msgBody.match(Strophe.DEF.SHARE_DOCUMENT_PAGE)) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] ShardDocumentPage start...-> "
									+ msgBody);
                    shareInfo = msgBody.split(Strophe.DEF.SHARE_SEPARATOR);
                    shareVal = shareInfo[1].split(Strophe.DEF.VALUE_SEPARATOR); // 파일이름#파일갯수
                    // split
                    Judoonge.Core.log("ShardDocumentPage Info...-> roomJid : "
							+ args.roomJid + ", docName : " + shareVal[0]
							+ ", docCurPage : " + shareVal[1]
							+ ", docTotalPage : " + shareVal[2]);
                    $(
							"#documentViewImg-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.attr(
									"src",
									Judoonge.serverInfo.documentDomain
											+ shareVal[0] + "_" + shareVal[1]
											+ ".jpg");
                } else if (msgBody.match(Strophe.DEF.SHARE_DOCUMENT_END)) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] ShardDocumentEnd start...-> "
									+ msgBody);
                    $(
							"#documentViewList-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.remove();
                    $(
							"#chattingContent-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.css({
							    "height": "400px",
							    "margin-top": "0px"
							});
                    return true;
                } else if (msgBody.match(Strophe.DEF.AUDIO_CALL_END)) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] AudioCallEnd start...-> "
									+ msgBody);
                    $("#mainMenuList1-"
									+ Strophe.getNodeFromJid(args.roomJid)
									+ " li a").removeClass("chatMenuSelect");
                    $(
							"#chattingCategoryList-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.hide();
                    $(
							"#chattingContent-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.css({
							    "height": "400px",
							    "margin-top": "0px"
							});
                    return true;
                } else if (msgBody.match(Strophe.DEF.VIDEO_CALL_END)) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] VideoCallEnd start...-> "
									+ msgBody);
                    //$("#viewChatting-" + Strophe.getNodeFromJid(args.roomJid))
                    //		.empty();
                    //bye();
                    return true;
                } else if (msgBody.match(Strophe.DEF.MULTI_VIDEO_CALL)) {
                    Judoonge.Core
							.log("[Judoonge.View.Observer.Message update] MultiVideoCall start...-> "
									+ msgBody);
                    return true;
                }

                // 일반 메세지 처리 부분
                if (Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid()) == args.message.name) {
                    // 내글이면 오른쪽 bkpark
                    Judoonge.View.Pane.Talk.showTalkMessage(args, time);

                } else if (args.message.name == Strophe.DEF.AUDIO_CALL) {
                    Judoonge.Core
							.log("Judoonge.View.Observer.Message update AudioCall.. roomJid : "
									+ args.roomJid);
                    var tmpId = Strophe.getNodeFromJid(args.roomJid);
                    $("#mainMenuList1-" + tmpId + " li a").removeClass(
							"chatMenuSelect");
                    $(
							"#mainMenuList1-" + tmpId
									+ " li a[href='#voiceBox-" + tmpId + "']")
							.addClass("chatMenuSelect");
                    $("#chattingCategoryList-" + tmpId).show();
                    $("#chattingCategoryList-" + tmpId + " li").hide();
                    $("#voiceBox-" + tmpId).show();
                    $("#voiceBox-" + tmpId).css({
                        "background": "#333",
                        "height": "120px",
                        "opacity": 0.9
                    });
                    $("#chattingContent-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.css({
							    "height": "280px",
							    "margin-top": "130px"
							});

                } else if (args.message.name == Strophe.DEF.VIDEO_CALL) {
                    Judoonge.Core
							.log("Judoonge.View.Observer.Message update VideoCall.. roomJid : "
									+ args.roomJid);
                    var tmpId = Strophe.getNodeFromJid(args.roomJid);
                    $("#mainMenuList1-" + tmpId + " li a").removeClass(
							"chatMenuSelect");
                    $(
							"#mainMenuList1-" + tmpId
									+ " li a[href='#movieBox-" + tmpId + "']")
							.addClass("chatMenuSelect");
                    $("#chattingCategoryList-" + tmpId).show();
                    $("#chattingCategoryList-" + tmpId + " li").hide();
                    $("#movieBox-" + Strophe.getNodeFromJid(args.roomJid))
							.show();
                    $("#chattingContent-"
									+ Strophe.getNodeFromJid(args.roomJid))
							.css({
							    "height": "180px",
							    "margin-top": "230px"
							});
                } else if (args.message.name == Strophe.DEF.CALL_REJECT_MSG) {
                    Judoonge.Core
							.log("Judoonge.View.Observer.Message update CallReject.. roomJid : "
									+ args.roomJid);
                    //					stopRinging();
                    Judoonge.Util.timer.endTimer(Strophe
							.getNodeFromJid(args.roomJid));
                } else {
                    // 상대방 왼쪽
                    Judoonge.View.Pane.Talk.showTalkMessage(args, time);
                }
            }
        }
    };

    /**
	 * Class: Judoonge.View.Observer.Login Handles when display login window
	 * should appear
	 */
    self.Login = {
        /**
		 * Function: update The login event gets dispatched to this method
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {presetJid}
		 */
        update: function (obj, args) {
            Judoonge.Core
					.log("Judoonge.View.Observer.Login update(obj, args) -> args.type : "
							+ args.type
							+ ", args.presetJid : "
							+ args.presetJid);
            Judoonge.View.Pane.Login.showForm();
        }
    };

    /**
	 * Class: Judoonge.View.Observer.mainList Handles when display mainList
	 * window should appear
	 */
    self.mainList = {

        /**
		 * Function: update The login event gets dispatched to this method
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {type: connection, status: ATTACHED}
		 */
        update: function (obj, args) {
            Judoonge.Core
					.log("Judoonge.View.Observer.mainList update(obj, args) -> args.type : "
							+ args.type
							+ ", args.id : "
							+ args.id
							+ ", args.status : " + args.status);

            // main display : roster and group list view
            if (args.type == "result") {
                // 메인화면 친구리스트 화면 처리
                if (args.id == Strophe.ID.BUDDY_LIST) {
                    // 화면처리 부분 들어오면 됨(그룹 처리, 친구처리)
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList roster update -> gFlag : "
									+ args.gFlag
									+ ", group : "
									+ args.group
									+ ", jid : "
									+ args.jid
									+ ", name : "
									+ args.name
									+ ", subscription : "
									+ args.subscription);
                    // 메인화면 리스트 화면 처리
                    Judoonge.View.Pane.People.showPeople(args);

                } else if (args.id == Strophe.ID.BUDDY_MANAGER_LIST) {
                    // 친구 관리 화면에서 사용
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList friend manager update -> gFlag : "
									+ args.gFlag
									+ ", group : "
									+ args.group
									+ ", jid : "
									+ args.jid
									+ ", name : "
									+ args.name
									+ ", subscription : "
									+ args.subscription);
                    // 친구추가화면 리스트 화면 처리
                    Judoonge.View.Pane.Friend.showFriendList(obj, args);

                    for (var index in Judoonge.DEF.loginlist) {
                        if (Judoonge.DEF.loginlist[index] == args.jid) {
                            if (Strophe.getNodeFromJid(args.jid) != Strophe.DEF.FACEBOOK_FRIEND) {
                                $(
										"#friendimg-"
												+ Strophe
														.getNodeFromJid(args.jid))
										.attr("src",
												"images/main/onlineImg.png");
                            }

                        }
                        ;
                    }
                    var grouplistflag = false;
                    if (args.gFlag == "1") {
                        for (var i = 0; Judoonge.DEF.GroupList.length > i; i++) {
                            if (Judoonge.DEF.GroupList[i] == args.group) {
                                return grouplistflag = true;
                            }
                        }
                        if (!grouplistflag) {
                            Judoonge.DEF.GroupList.push(args.group);
                        }
                    }
                } else if (args.id == Strophe.ID.BUDDY_GROUP_LIST) {
                    // 친구 검색 화면에서 사용
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList friend search update -> gFlag : "
									+ args.gFlag
									+ ", group : "
									+ args.group
									+ ", jid : "
									+ args.jid
									+ ", name : "
									+ args.name
									+ ", subscription : "
									+ args.subscription);
                } else if (args.id == Strophe.ID.BUDDY_REGISTERVIEW) {
                    // 메인화면 최상단 내 정보
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList my register update -> username : "
									+ args.username
									+ ", name : "
									+ args.name
									+ ", email : " + args.email);
                    // 메인화면 내 정보 화면 처리
                    // Judoonge.View.Pane.Main.showMyProfile(args);
                } else if (args.id == Strophe.ID.VCARD_INFO_GET) {
                    // vcard 정보 가져온거 처리
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList vcard update -> jid : "
									+ args.vcJid
									+ ", nick : "
									+ args.vcNick
									+ ", phone : "
									+ args.vcPhone
									+ ", title : "
									+ args.vcTitle
									+ ", email : " + args.vcEmail);
                    if (args.vcJid === Judoonge.Core.getUser().getJid()) {
                        Judoonge.View.Pane.Main.showMyProfileBox(args);
                    } else {
                        $("#joojuli-" + Strophe.getNodeFromJid(args.vcJid))
								.text(args.vcTitle);
                        $("#email-" + Strophe.getNodeFromJid(args.vcJid)).text(
								args.vcEmail);
                        $("#phone-" + Strophe.getNodeFromJid(args.vcJid)).text(
								args.vcPhone);
                    }
                }

            } else if (args.type == "set") {
                // 친구 추가 / 삭제 / 수정 처리
                if (args.id == Strophe.ID.SET_REMOVE) {
                    // 친구 삭제처리
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList roster delete -> jid : "
									+ args.jid);
                    $("#people-" + Strophe.getNodeFromJid(args.jid)).remove();
                    if ($("#peopleList-NewFriend li").attr("id") == undefined) {
                        $("#pgTitleli-NewFriend").remove();
                    }

                    $(".peopleCount").text(
							"친구(" + --Judoonge.DEF.PeopleCount + "명)");
                } else if (args.id == Strophe.ID.SET_NONE) {
                    // 친구 추가 / 수정
                    Judoonge.Core
							.log("Judoonge.View.Observer.mainList roster Add/Modify -> jid : "
									+ args.jid
									+ ", name : "
									+ args.name
									+ ", group : " + args.group);
                }
            } else if (args.type == Strophe.DEF.PRES_LOGIN) {
                // login process
                Judoonge.Core
						.log("Judoonge.View.Observer.mainList login -> jid/res : "
								+ args.jid);

                // 온 상태일때
                // $("#peopleStatusimg-" +
                // Strophe.getNodeFromJid(args.jid)).attr("src",
                // "images/common/on.png");
                $("#studentList-" + Strophe.getNodeFromJid(args.jid)).attr(
						"status", "on");
                $("#studentList-" + Strophe.getNodeFromJid(args.jid) + " a img").attr("src", "image/student_on_image.png");

                var idflag = false;
                for (var i = 0; Judoonge.DEF.loginlist.length > i; i++) {
                    if (Judoonge.DEF.loginlist[i] == args.jid) {
                        return idflag = true;
                    }
                }
                ;
                if (!idflag) {
                    Judoonge.DEF.loginlist.push(args.jid);
                }
                ;
            } else if (args.type == Strophe.DEF.PRES_LOGOUT) {
                // logout process
                Judoonge.Core
						.log("Judoonge.View.Observer.mainList logout -> jid/res : "
								+ args.jid);
                $("#studentList-" + Strophe.getNodeFromJid(args.jid)).attr("status", "off");
                $("#studentList-" + Strophe.getNodeFromJid(args.jid) + " a img").attr("src", "image/student_off_image.png");


                //				$("#studentList-" + Strophe.getNodeFromJid(args.jid)).children(
                //						"a img").attr("src", "image/student_off_image.png");

                for (var index in Judoonge.DEF.loginlist) {
                    if (Judoonge.DEF.loginlist[index] == args.jid) {
                        Judoonge.DEF.loginlist.splice(index, 1);
                    }
                }
                ;
            } else if (args.type == Strophe.DEF.PRES_STATUS) {
                Judoonge.Core
						.log("Judoonge.View.Observer.mainList update(obj, args)...status.. jid : "
								+ args.jid + ", status : " + args.status);

                $("#peopleStatusimg-" + Strophe.getNodeFromJid(args.jid)).attr(
						"src", "images/common/" + args.status + ".png");

            } else {
                Judoonge.Core
						.log("Judoonge.View.Observer.mainList update(obj, args)...etc.. ");
            }

        }
    };

    /**
	 * Class: Judoonge.View.Observer.friendManager Handles when display
	 * friendManager window should appear
	 */
    self.friendManager = {
        /**
		 * Function: update The login event gets dispatched to this method
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {type: result, status: ATTACHED}
		 */
        update: function (obj, args) {
            Judoonge.Core
					.log("Judoonge.View.Observer.friendManager update(obj, args) -> args.type : "
							+ args.type
							+ ", args.id : "
							+ args.id
							+ ", args.status : " + args.status);

            // friendManager display : roster and group list view
            if (args.type == "result") {
                // 메인화면 친구리스트 화면 처리
                if (args.id == Strophe.ID.BUDDY_SEARCH
						|| args.id == Strophe.ID.BUDDY_SEARCH_ID) {
                    // 화면처리 부분 들어오면 됨(그룹 처리, 친구처리)
                    Judoonge.Core
							.log("Judoonge.View.Observer.friendManager roster update -> jid : "
									+ args.jid
									+ ", name : "
									+ args.name
									+ ", email : " + args.email);

                    if (args.jid != null || args.jid != "") {
                        $("#peopleImgList")
								.append(
										'<option style="width:100%;height:41px;" value="'
												+ args.name
												+ '" data-image="images/main/logo.png" data-fulljid="'
												+ args.jid + '">' + args.name
												+ '</option>');
                        $(".searchList").slideDown("normal");
                        // '<option style="width:100%;height:41px;"
                        // value="bbsmax"
                        // data-image="./images/main/logo.png">[가우스]막나가는
                        // 기업1</option>'
                    } else {
                        alert("없음");
                    }
                } else {
                    // etc id
                    Judoonge.Core
							.log("Judoonge.View.Observer.friendManager update(obj, args)...type == result etc.. ");
                }

            } else {
                Judoonge.Core
						.log("Judoonge.View.Observer.mainList update(obj, args)...etc.. ");
            }
        }
    };

    /**
	 * Class: Judoonge.View.Observer.chatInfo Handles when display chatInfo
	 * window should appear
	 */
    self.chatInfo = {
        /**
		 * Function: update The chat event gets dispatched to this method
		 * 
		 * Parameters: (Judoonge.Core.Event) obj - Judoonge core event object
		 * (Object) args - {type: result, status: CHATINFO}
		 */
        update: function (obj, args) {
            Judoonge.Core
					.log("Judoonge.View.Observer.chatInfo update(obj, args) -> args.type : "
							+ args.type
							+ ", args.id : "
							+ args.id
							+ ", args.status : " + args.status);

            // chatInfo display : chat room info list view
            if (args.type == "result") {
                if (args.id == Strophe.ID.MUC_ROOMS_GET) {
                    // 내가 채팅중인 방 정보
                    Judoonge.Core
							.log("Judoonge.View.Observer.chatInfo TalkRoomList update -> room jid : "
									+ args.roomJid
									+ ", room name : "
									+ args.roomName);
                } else if (args.id == Strophe.ID.DISCO_ITEM_ROOM_USERS_GET) {
                    // 채팅방에 포함된 사용자 정보
                    Judoonge.Core
							.log("Judoonge.View.Observer.chatInfo chatRoomUserInfo update -> room jid : "
									+ args.roomJid
									+ ", userNick : "
									+ args.userNick);

                    // Judoonge.View.Pane.ChatRoom.showChatUserListList(args.userNick,
                    // Strophe.getNodeFromJid(args.roomJid));
                } else {
                    // etc id
                    Judoonge.Core
							.log("Judoonge.View.Observer.chatInfo update(obj, args)...type == result etc.. id : "
									+ args.id);
                }

            } else {
                Judoonge.Core
						.log("Judoonge.View.Observer.mainList update(obj, args)...etc.. type : "
								+ args.type);
            }
        }
    };

    return self;
}(Judoonge.View.Observer || {}, jQuery));
/**
 * File: pane.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.View.Pane Judoonge view pane handles everything regarding DOM
 * updates etc.
 * 
 * Parameters: (Judoonge.View.Pane) self - itself (jQuery) $ - jQuery
 */
Judoonge.View.Pane = (function (self, $) {

    /**
	 * Class: Judoonge.View.Pane.Window Window related view updates
	 */
    self.Window = {
        /**
		 * PrivateVariable: _hasFocus Window has focus
		 */
        _hasFocus: true,
        /**
		 * PrivateVariable: _plainTitle Document title
		 */
        _plainTitle: document.title,
        /**
		 * PrivateVariable: _unreadMessagesCount Unread messages count
		 */
        _unreadMessagesCount: 0,

        /**
		 * Variable: autoscroll Boolean whether autoscroll is enabled
		 */
        autoscroll: true,

        /**
		 * Function: hasFocus Checks if window has focus
		 * 
		 * Returns: (Boolean)
		 */
        hasFocus: function () {
            return self.Window._hasFocus;
        },

        /**
		 * Function: increaseUnreadMessages Increases unread message count in
		 * window title by one.
		 */
        increaseUnreadMessages: function () {
            self.Window
					.renderUnreadMessages(++self.Window._unreadMessagesCount);
        },

        /**
		 * Function: reduceUnreadMessages Reduce unread message count in window
		 * title by `num`.
		 * 
		 * Parameters: (Integer) num - Unread message count will be reduced by
		 * this value
		 */
        reduceUnreadMessages: function (num) {
            self.Window._unreadMessagesCount -= num;
            if (self.Window._unreadMessagesCount <= 0) {
                self.Window.clearUnreadMessages();
            } else {
                self.Window
						.renderUnreadMessages(self.Window._unreadMessagesCount);
            }
        },

        /**
		 * Function: clearUnreadMessages Clear unread message count in window
		 * title.
		 */
        clearUnreadMessages: function () {
            self.Window._unreadMessagesCount = 0;
            document.title = self.Window._plainTitle;
        },

        /**
		 * Function: renderUnreadMessages Update window title to show message
		 * count.
		 * 
		 * Parameters: (Integer) count - Number of unread messages to show in
		 * window title
		 */
        renderUnreadMessages: function (count) {
            document.title = Judoonge.View.Template.Window.unreadmessages
					.replace('{{count}}', count).replace('{{title}}',
							self.Window._plainTitle);
        },

        /**
		 * Function: onFocus Window focus event handler.
		 */
        onFocus: function () {
            self.Window._hasFocus = true;
            if (Judoonge.View.getCurrent().roomJid) {
                self.Room.setFocusToForm(Judoonge.View.getCurrent().roomJid);
                self.Chat
						.clearUnreadMessages(Judoonge.View.getCurrent().roomJid);
            }
        },

        /**
		 * Function: onBlur Window blur event handler.
		 */
        onBlur: function () {
            self.Window._hasFocus = false;
        }
    };

    /**
	 * Class: Judoonge.View.Pane.Chat Chat-View related view updates
	 */
    self.Chat = {
        /**
		 * Variable: rooms Contains opened room elements
		 */
        rooms: [],

        /**
		 * Function: addTab Add a tab to the chat pane.
		 * 
		 * Parameters: (String) roomJid - JID of room (String) roomName - Tab
		 * label (String) roomType - Type of room: `groupchat` or `chat`
		 */
        addTab: function (roomJid, roomName, roomType) {
            var roomId = Judoonge.Util.jidToId(roomJid), html = Mustache
					.to_html(Judoonge.View.Template.Chat.tab, {
					    roomJid: roomJid,
					    roomId: roomId,
					    name: roomName || Strophe.getNodeFromJid(roomJid),
					    privateUserChat: function () {
					        return roomType === 'chat';
					    },
					    roomType: roomType
					}), tab = $(html).appendTo('#chat-tabs');

            tab.click(self.Chat.tabClick);
            // TODO: maybe we find a better way to get the close element.
            $('a.close', tab).click(self.Chat.tabClose);

            self.Chat.fitTabs();
        },

        /**
		 * Function: getTab Get tab by JID.
		 * 
		 * Parameters: (String) roomJid - JID of room
		 * 
		 * Returns: (jQuery object) - Tab element
		 */
        getTab: function (roomJid) {
            return $('#chat-tabs').children(
					'li[data-roomjid="' + roomJid + '"]');
        },

        /**
		 * Function: removeTab Remove tab element.
		 * 
		 * Parameters: (String) roomJid - JID of room
		 */
        removeTab: function (roomJid) {
            self.Chat.getTab(roomJid).remove();
            self.Chat.fitTabs();
        },

        /**
		 * Function: setActiveTab Set the active tab.
		 * 
		 * Add CSS classname `active` to the choosen tab and remove `active`
		 * from all other.
		 * 
		 * Parameters: (String) roomJid - JID of room
		 */
        setActiveTab: function (roomJid) {
            $('#chat-tabs').children().each(function () {
                var tab = $(this);
                if (tab.attr('data-roomjid') === roomJid) {
                    tab.addClass('active');
                } else {
                    tab.removeClass('active');
                }
            });
        },

        /**
		 * Function: increaseUnreadMessages Increase unread message count in a
		 * tab by one.
		 * 
		 * Parameters: (String) roomJid - JID of room
		 * 
		 * Uses: - <Window.increaseUnreadMessages>
		 */
        increaseUnreadMessages: function (roomJid) {
            var unreadElem = this.getTab(roomJid).find('.unread');
            unreadElem.show()
					.text(
							unreadElem.text() !== '' ? parseInt(unreadElem
									.text(), 10) + 1 : 1);
            // only increase window unread messages in private chats
            if (self.Chat.rooms[roomJid].type === 'chat') {
                self.Window.increaseUnreadMessages();
            }
        },

        /**
		 * Function: clearUnreadMessages Clear unread message count in a tab.
		 * 
		 * Parameters: (String) roomJid - JID of room
		 * 
		 * Uses: - <Window.reduceUnreadMessages>
		 */
        clearUnreadMessages: function (roomJid) {
            var unreadElem = self.Chat.getTab(roomJid).find('.unread');
            self.Window.reduceUnreadMessages(unreadElem.text());
            unreadElem.hide().text('');
        },

        /**
		 * Function: tabClick Tab click event: show the room associated with the
		 * tab and stops the event from doing the default.
		 */
        tabClick: function (e) {
            // remember scroll position of current room
            var currentRoomJid = Judoonge.View.getCurrent().roomJid;
            self.Chat.rooms[currentRoomJid].scrollPosition = self.Room.getPane(
					currentRoomJid, '.message-pane-wrapper').scrollTop();

            self.Room.show($(this).attr('data-roomjid'));
            e.preventDefault();
        },

        /**
		 * Function: tabClose Tab close (click) event: Leave the room
		 * (groupchat) or simply close the tab (chat).
		 * 
		 * Parameters: (DOMEvent) e - Event triggered
		 * 
		 * Returns: (Boolean) - false, this will stop the event from bubbling
		 */
        tabClose: function (e) {
            var roomJid = $(this).parent().attr('data-roomjid');
            // close private user tab
            if (self.Chat.rooms[roomJid].type === 'chat') {
                self.Room.close(roomJid);
                // close multi-user room tab
            } else {
                Judoonge.Core.Action.Jabber.Room.Leave(roomJid);
            }
            return false;
        },

        /**
		 * Function: allTabsClosed All tabs closed event: Disconnect from
		 * service. Hide sound control.
		 * 
		 * TODO: Handle window close
		 * 
		 * Returns: (Boolean) - false, this will stop the event from bubbling
		 */
        allTabsClosed: function () {
            Judoonge.Core.disconnect();
            self.Chat.Toolbar.hide();
            return;
        },

        /**
		 * Function: fitTabs Fit tab size according to window size
		 */
        fitTabs: function () {
            var availableWidth = $('#chat-tabs').innerWidth(), tabsWidth = 0, tabs = $(
					'#chat-tabs').children();
            tabs.each(function () {
                tabsWidth += $(this).css({
                    width: 'auto',
                    overflow: 'visible'
                }).outerWidth(true);
            });
            if (tabsWidth > availableWidth) {
                // tabs.[outer]Width() measures the first element in `tabs`.
                // It's no very readable but nearly two times faster than using
                // :first
                var tabDiffToRealWidth = tabs.outerWidth(true) - tabs.width(), tabWidth = Math
						.floor((availableWidth) / tabs.length)
						- tabDiffToRealWidth;
                tabs.css({
                    width: tabWidth,
                    overflow: 'hidden'
                });
            }
        },

        /**
		 * Function: updateToolbar Show toolbar
		 */
        updateToolbar: function (roomJid) {
            $('#chat-toolbar').find('.context').click(function (e) {
                self.Chat.Context.show(e.currentTarget, roomJid);
                e.stopPropagation();
            });
            Judoonge.View.Pane.Chat.Toolbar
					.updateUsercount(Judoonge.View.Pane.Chat.rooms[roomJid].usercount);
        },

        /**
		 * Function: adminMessage Display admin message
		 * 
		 * Parameters: (String) subject - Admin message subject (String) message -
		 * Message to be displayed
		 */
        adminMessage: function (subject, message) {
            if (Judoonge.View.getCurrent().roomJid) { // Simply dismiss admin
                // message if no room
                // joined so far. TODO:
                // maybe we should show
                // those messages on a
                // dedicated pane?
                var html = Mustache.to_html(
						Judoonge.View.Template.Chat.adminMessage, {
						    subject: subject,
						    message: message,
						    sender: $.i18n._('administratorMessageSubject'),
						    time: Judoonge.Util.localizedTime(new Date()
									.toGMTString())
						});
                $('#chat-rooms').children().each(
						function () {
						    self.Room.appendToMessagePane($(this).attr(
									'data-roomjid'), html);
						});
                self.Room.scrollToBottom(Judoonge.View.getCurrent().roomJid);

                Judoonge.View.Event.Chat.onAdminMessage({
                    'subject': subject,
                    'message': message
                });
            }
        },

        /**
		 * Function: infoMessage Display info message. This is a wrapper for
		 * <onInfoMessage> to be able to disable certain info messages.
		 * 
		 * Parameters: (String) roomJid - Room JID (String) subject - Subject
		 * (String) message - Message
		 */
        infoMessage: function (roomJid, subject, message) {
            self.Chat.onInfoMessage(roomJid, subject, message);
        },

        /**
		 * Function: onInfoMessage Display info message. Used by <infoMessage>
		 * and several other functions which do not wish that their info message
		 * can be disabled (such as kick/ban message or leave/join message in
		 * private chats).
		 * 
		 * Parameters: (String) roomJid - Room JID (String) subject - Subject
		 * (String) message - Message
		 */
        onInfoMessage: function (roomJid, subject, message) {
            // maverick
            if (Judoonge.View.getCurrent().roomJid) { // Simply dismiss info
                // message if no room
                // joined so far. TODO:
                // maybe we should show
                // those messages on a
                // dedicated pane?
                var html = Mustache.to_html(
						Judoonge.View.Template.Chat.infoMessage, {
						    subject: subject,
						    message: $.i18n._(message),
						    time: Judoonge.Util.localizedTime(new Date()
									.toGMTString())
						});
                self.Room.appendToMessagePane(roomJid, html);
                if (Judoonge.View.getCurrent().roomJid === roomJid) {
                    self.Room
							.scrollToBottom(Judoonge.View.getCurrent().roomJid);
                }
            }
        },

        /**
		 * Class: Judoonge.View.Pane.Toolbar Chat toolbar for things like
		 * emoticons toolbar, room management etc.
		 */
        Toolbar: {
            /**
			 * Function: show Show toolbar.
			 */
            show: function () {
                $('#chat-toolbar').show();
            },

            /**
			 * Function: hide Hide toolbar.
			 */
            hide: function () {
                $('#chat-toolbar').hide();
            },

            /**
			 * Function: playSound Play sound (default method).
			 */
            playSound: function () {
                self.Chat.Toolbar.onPlaySound();
            },

            /**
			 * Function: onPlaySound Sound play event handler.
			 * 
			 * Don't call this method directly. Call `playSound()` instead.
			 * `playSound()` will only call this method if sound is enabled.
			 */
            onPlaySound: function () {
                var chatSoundPlayer = document
						.getElementById('chat-sound-player');
                chatSoundPlayer.SetVariable('method:stop', '');
                chatSoundPlayer.SetVariable('method:play', '');
            },

            /**
			 * Function: updateUserCount Update usercount element with count.
			 * 
			 * Parameters: (Integer) count - Current usercount
			 */
            updateUsercount: function (count) {
                $('#chat-usercount').text(count);
            }
        },

        /**
		 * Class: Judoonge.View.Pane.Modal Modal window
		 */
        Modal: {
            /**
			 * Function: show Display modal window
			 * 
			 * Parameters: (String) html - HTML code to put into the modal
			 * window (Boolean) showCloseControl - set to true if a close button
			 * should be displayed [default false] (Boolean) showSpinner - set
			 * to true if a loading spinner should be shown [default false]
			 */
            show: function (html, showCloseControl, showSpinner) {
                if (showCloseControl) {
                    self.Chat.Modal.showCloseControl();
                } else {
                    self.Chat.Modal.hideCloseControl();
                }
                if (showSpinner) {
                    self.Chat.Modal.showSpinner();
                } else {
                    self.Chat.Modal.hideSpinner();
                }
                $('#chat-modal').stop(false, true);
                $('#chat-modal-body').html(html);
                $('#chat-modal').fadeIn('fast');
                $('#chat-modal-overlay').show();
            },

            /**
			 * Function: hide Hide modal window
			 * 
			 * Parameters: (Function) callback - Calls the specified function
			 * after modal window has been hidden.
			 */
            hide: function (callback) {
                $('#chat-modal').fadeOut('fast', function () {
                    $('#chat-modal-body').text('');
                    $('#chat-modal-overlay').hide();
                });
                // restore initial esc handling
                $(document).keydown(function (e) {
                    if (e.which === 27) {
                        e.preventDefault();
                    }
                });
                if (callback) {
                    callback();
                }
            },

            /**
			 * Function: showSpinner Show loading spinner
			 */
            showSpinner: function () {
                $('#chat-modal-spinner').show();
            },

            /**
			 * Function: hideSpinner Hide loading spinner
			 */
            hideSpinner: function () {
                $('#chat-modal-spinner').hide();
            },

            /**
			 * Function: showCloseControl Show a close button
			 */
            showCloseControl: function () {
                $('#admin-message-cancel').show().click(function (e) {
                    self.Chat.Modal.hide();
                    // some strange behaviour on IE7 (and maybe other browsers)
                    // triggers onWindowUnload when clicking on the close
                    // button.
                    // prevent this.
                    e.preventDefault();
                });

                // enable esc to close modal
                $(document).keydown(function (e) {
                    if (e.which === 27) {
                        self.Chat.Modal.hide();
                        e.preventDefault();
                    }
                });
            },

            /**
			 * Function: hideCloseControl Hide the close button
			 */
            hideCloseControl: function () {
                $('#admin-message-cancel').hide().click(function () {
                });
            },

            /**
			 * Function: showEnterPasswordForm Shows a form for entering room
			 * password
			 * 
			 * Parameters: (String) roomJid - Room jid to join (String) roomName -
			 * Room name (String) message - [optional] Message to show as the
			 * label
			 */
            showEnterPasswordForm: function (roomJid, roomName, message) {
                self.Chat.Modal.show(Mustache.to_html(
						Judoonge.View.Template.PresenceError.enterPasswordForm,
						{
						    roomName: roomName,
						    _labelPassword: $.i18n._('labelPassword'),
						    _label: (message ? message : $.i18n._(
									'enterRoomPassword', [roomName])),
						    _joinSubmit: $.i18n._('enterRoomPasswordSubmit')
						}), true);
                $('#password').focus();

                // register submit handler
                $('#enter-password-form').submit(
						function () {
						    var password = $('#password').val();

						    self.Chat.Modal.hide(function () {
						        Judoonge.Core.Action.Jabber.Room.Join(roomJid,
										password);
						    });
						    return false;
						});
            },

            /**
			 * Function: showError Show modal containing error message
			 * 
			 * Parameters: (String) message - key of translation to display
			 * (Array) replacements - array containing replacements for
			 * translation (%s)
			 */
            showError: function (message, replacements) {
                self.Chat.Modal.show(Mustache.to_html(
						Judoonge.View.Template.PresenceError.displayError, {
						    _error: $.i18n._(message, replacements)
						}), true);
            }
        },

        /**
		 * Class: Judoonge.View.Pane.Tooltip Class to display tooltips over
		 * specific elements
		 */
        Tooltip: {
            /**
			 * Function: show Show a tooltip on event.currentTarget with content
			 * specified or content within the target's attribute data-tooltip.
			 * 
			 * On mouseleave on the target, hide the tooltip.
			 * 
			 * Parameters: (Event) event - Triggered event (String) content -
			 * Content to display [optional]
			 */
            show: function (event, content) {
                var tooltip = $('#tooltip'), target = $(event.currentTarget);

                if (!content) {
                    content = target.attr('data-tooltip');
                }

                if (tooltip.length === 0) {
                    var html = Mustache
							.to_html(Judoonge.View.Template.Chat.tooltip);
                    $('#chat-pane').append(html);
                    tooltip = $('#tooltip');
                }

                $('#context-menu').hide();

                tooltip.stop(false, true);
                tooltip.children('div').html(content);

                var pos = target.offset(), posLeft = Judoonge.Util
						.getPosLeftAccordingToWindowBounds(tooltip, pos.left), posTop = Judoonge.Util
						.getPosTopAccordingToWindowBounds(tooltip, pos.top);

                tooltip
						.css(
								{
								    'left': posLeft.px,
								    'top': posTop.px,
								    backgroundPosition: posLeft.backgroundPositionAlignment
											+ ' '
											+ posTop.backgroundPositionAlignment
								}).fadeIn('fast');

                target.mouseleave(function (event) {
                    event.stopPropagation();
                    $('#tooltip').stop(false, true).fadeOut('fast', function () {
                        $(this).css({
                            'top': 0,
                            'left': 0
                        });
                    });
                });
            }
        },

        /**
		 * Class: Judoonge.View.Pane.Context Context menu for actions and
		 * settings
		 */
        Context: {
            /**
			 * Function: init Initialize context menu and setup mouseleave
			 * handler.
			 */
            init: function () {
                if ($('#context-menu').length === 0) {
                    var html = Mustache
							.to_html(Judoonge.View.Template.Chat.Context.menu);
                    $('#chat-pane').append(html);
                    $('#context-menu').mouseleave(function () {
                        $(this).fadeOut('fast');
                    });
                }
            },

            /**
			 * Function: show Show context menu (positions it according to the
			 * window height/width)
			 * 
			 * Uses: <getMenuLinks> for getting menulinks the user has access to
			 * <Judoonge.Util.getPosLeftAccordingToWindowBounds> for positioning
			 * <Judoonge.Util.getPosTopAccordingToWindowBounds> for positioning
			 * 
			 * Calls: <Judoonge.View.Event.Roster.afterContextMenu> after
			 * showing the context menu
			 * 
			 * Parameters: (Element) elem - On which element it should be shown
			 * (String) roomJid - Room Jid of the room it should be shown
			 * (Judoonge.Core.chatUser) user - User
			 */
            show: function (elem, roomJid, user) {
                elem = $(elem);
                var roomId = self.Chat.rooms[roomJid].id, menu = $('#context-menu'), links = $(
						'ul li', menu);

                $('#tooltip').hide();

                // add specific context-user class if a user is available (when
                // context menu should be opened next to a user)
                if (!user) {
                    user = Judoonge.Core.getUser();
                }

                links.remove();

                var menulinks = this.getMenuLinks(roomJid, user, elem), id, clickHandler = function (
						roomJid, user) {
                    return function (event) {
                        event.data.callback(event, roomJid, user);
                        $('#context-menu').hide();
                    };
                };

                for (id in menulinks) {
                    if (menulinks.hasOwnProperty(id)) {
                        var link = menulinks[id], html = Mustache.to_html(
								Judoonge.View.Template.Chat.Context.menulinks,
								{
								    'roomId': roomId,
								    'class': link['class'],
								    'id': id,
								    'label': link.label
								});
                        $('ul', menu).append(html);
                        $('#context-menu-' + id).bind('click', link,
								clickHandler(roomJid, user));
                    }
                }
                // if `id` is set the menu is not empty
                if (id) {
                    var pos = elem.offset(), posLeft = Judoonge.Util
							.getPosLeftAccordingToWindowBounds(menu, pos.left), posTop = Judoonge.Util
							.getPosTopAccordingToWindowBounds(menu, pos.top);

                    menu
							.css({
							    'left': posLeft.px,
							    'top': posTop.px,
							    backgroundPosition: posLeft.backgroundPositionAlignment
										+ ' '
										+ posTop.backgroundPositionAlignment
							});
                    menu.fadeIn('fast');

                    Judoonge.View.Event.Roster.afterContextMenu({
                        'roomJid': roomJid,
                        'user': user,
                        'element': menu
                    });

                    return true;
                }
            },

            /**
			 * Function: getMenuLinks Extends <initialMenuLinks> with
			 * <Judoonge.View.Event.Roster.onContextMenu> links and returns
			 * those.
			 * 
			 * Returns: (Object) - object containing the extended menulinks.
			 */
            getMenuLinks: function (roomJid, user, elem) {
                var menulinks = $.extend(this.initialMenuLinks(elem),
						Judoonge.View.Event.Roster.onContextMenu({
						    'roomJid': roomJid,
						    'user': user,
						    'elem': elem
						})), id;

                for (id in menulinks) {
                    if (menulinks.hasOwnProperty(id)
							&& menulinks[id].requiredPermission !== undefined
							&& !menulinks[id].requiredPermission(user,
									self.Room.getUser(roomJid), elem)) {
                        delete menulinks[id];
                    }
                }
                return menulinks;
            },

            /**
			 * Function: initialMenuLinks Returns initial menulinks. The
			 * following are initial: - Private Chat - Ignore - Unignore - Kick -
			 * Ban - Change Subject
			 * 
			 * Returns: (Object) - object containing those menulinks
			 */
            initialMenuLinks: function () {
                return {
                    'private': {
                        requiredPermission: function (user, me) {
                            return me.getNick() !== user.getNick()
									&& Judoonge.Core.getRoom(Judoonge.View
											.getCurrent().roomJid)
									&& !Judoonge.Core.getUser()
											.isInPrivacyList('ignore',
													user.getJid());
                        },
                        'class': 'private',
                        'label': $.i18n._('privateActionLabel'),
                        'callback': function (e, roomJid, user) {
                            $(
									'#user-'
											+ Judoonge.Util.jidToId(roomJid)
											+ '-'
											+ Judoonge.Util.jidToId(user
													.getJid())).click();
                        }
                    },
                    'ignore': {
                        requiredPermission: function (user, me) {
                            return me.getNick() !== user.getNick()
									&& !Judoonge.Core.getUser()
											.isInPrivacyList('ignore',
													user.getJid());
                        },
                        'class': 'ignore',
                        'label': $.i18n._('ignoreActionLabel'),
                        'callback': function (e, roomJid, user) {
                            Judoonge.View.Pane.Room.ignoreUser(roomJid, user
									.getJid());
                        }
                    },
                    'unignore': {
                        requiredPermission: function (user, me) {
                            return me.getNick() !== user.getNick()
									&& Judoonge.Core.getUser().isInPrivacyList(
											'ignore', user.getJid());
                        },
                        'class': 'unignore',
                        'label': $.i18n._('unignoreActionLabel'),
                        'callback': function (e, roomJid, user) {
                            Judoonge.View.Pane.Room.unignoreUser(roomJid, user
									.getJid());
                        }
                    },
                    'kick': {
                        requiredPermission: function (user, me) {
                            return me.getNick() !== user.getNick()
									&& me.isModerator() && !user.isModerator();
                        },
                        'class': 'kick',
                        'label': $.i18n._('kickActionLabel'),
                        'callback': function (e, roomJid, user) {
                            self.Chat.Modal
									.show(
											Mustache
													.to_html(
															Judoonge.View.Template.Chat.Context.contextModalForm,
															{
															    _label: $.i18n
																		._('reason'),
															    _submit: $.i18n
																		._('kickActionLabel')
															}), true);
                            $('#context-modal-field').focus();
                            $('#context-modal-form').submit(
									function (event) {
									    Judoonge.Core.Action.Jabber.Room.Admin
												.UserAction(roomJid, user
														.getJid(), 'kick', $(
														'#context-modal-field')
														.val());
									    self.Chat.Modal.hide();
									    return false; // stop propagation &
									    // preventDefault, as
									    // otherwise you get
									    // disconnected (wtf?)
									});
                        }
                    },
                    'ban': {
                        requiredPermission: function (user, me) {
                            return me.getNick() !== user.getNick()
									&& me.isModerator() && !user.isModerator();
                        },
                        'class': 'ban',
                        'label': $.i18n._('banActionLabel'),
                        'callback': function (e, roomJid, user) {
                            self.Chat.Modal
									.show(
											Mustache
													.to_html(
															Judoonge.View.Template.Chat.Context.contextModalForm,
															{
															    _label: $.i18n
																		._('reason'),
															    _submit: $.i18n
																		._('banActionLabel')
															}), true);
                            $('#context-modal-field').focus();
                            $('#context-modal-form').submit(
									function (e) {
									    Judoonge.Core.Action.Jabber.Room.Admin
												.UserAction(roomJid, user
														.getJid(), 'ban', $(
														'#context-modal-field')
														.val());
									    self.Chat.Modal.hide();
									    return false; // stop propagation &
									    // preventDefault, as
									    // otherwise you get
									    // disconnected (wtf?)
									});
                        }
                    },
                    'subject': {
                        requiredPermission: function (user, me) {
                            return me.getNick() === user.getNick()
									&& me.isModerator();
                        },
                        'class': 'subject',
                        'label': $.i18n._('setSubjectActionLabel'),
                        'callback': function (e, roomJid, user) {
                            self.Chat.Modal
									.show(
											Mustache
													.to_html(
															Judoonge.View.Template.Chat.Context.contextModalForm,
															{
															    _label: $.i18n
																		._('subject'),
															    _submit: $.i18n
																		._('setSubjectActionLabel')
															}), true);
                            $('#context-modal-field').focus();
                            $('#context-modal-form').submit(
									function (e) {
									    Judoonge.Core.Action.Jabber.Room.Admin
												.SetSubject(roomJid, $(
														'#context-modal-field')
														.val());
									    self.Chat.Modal.hide();
									    e.preventDefault();
									});
                        }
                    }
                };
            },
        }
    };

    // Login.showPane();
    self.Login = {
        showPane: function () {
        },
        showForm: function () {
            onLoad(); // webrtc 부분
        }
    };

    // Register.showPane();
    self.Register = {
        showPane: function () {
        },
        showForm: function () {

        }
    };

    // Main.showPane();
    self.Main = {
        showPane: function () {
        },
        showLogo: function () {
        },
        showMyProfile: function (args) {
            var myprofilehtml = Mustache.to_html(
					Judoonge.View.Template.Main.myprofile, {
					    username: args.username,
					    name: args.name,
					    email: args.email
					});
            Judoonge.Core.Action.Jabber.vCardInfoGet(Judoonge.Core.getUser()
					.getJid(), Strophe.ID.VCARD_INFO_GET);
            Judoonge.View.Pane.People.showPeopleGrpList();
        },
        showMyProfileBox: function (args) {
            // $(function(){
            // var frm1 = $('#avatar_upload');
            // frm1.ajaxForm( callback );
            // frm1.submit( function(){ return false; } );
            // });
        },
        showMainBodyPane: function () {
            // hana main
            // var mainBodyhtml =
            // Mustache.to_html(Judoonge.View.Template.Main.mainBodyPane, {
            // });
            // $(".mainBox").append(mainBodyhtml);
        }
    };

    self.People = {
        showPeopleBox: function () {
        },
        showPeopleListBox: function () {
        },
        showPeopleGrpList: function () {
        },
        showPeopleGrop: function (args) {
        },
        showPeopleList: function (args) {
        },
        showPeople: function (args) {
            Status = "off";
            for (var i = 0; Judoonge.DEF.loginlist.length > i; i++) {
                if (Judoonge.DEF.loginlist[i] == args.jid) {
                    Status = "on";
                }
            }

            var studentListHtml = Mustache.to_html(
					Judoonge.View.Template.People.people, {
					    fulljid: args.jid,
					    jid: Strophe.getNodeFromJid(args.jid),
					    name: args.name,
					    group: args.group,
					    status: Status
					});

            $("#student_list").append(studentListHtml);

            // hwcho 2014-05-28 학생 선택
            $("#studentList-" + Strophe.getNodeFromJid(args.jid) + " a img").click(function () {
                if ($(this).parent().parent().attr("status") == "on") {
                    clearTimeout(TIMMER);

                    var calltargetlist = [];
                    calltargetlist.push(Strophe.getNodeFromJid(args.jid));
                    roomNameAll = Strophe.DEF.TALK_WINDOW + "-" + Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid()) + Judoonge.Util.localTimeJudoonge(new Date().toGMTString());

                    for (var i = 0; i < 4; i++) {
                        var $now = $(".video_position ul li:eq(" + i + ") video");

                        if ($now.attr("status") == "off") {
                            $now.attr("status", "on");
                            $now.attr("id", "v_" + roomNameAll);
                            $now.attr("student", Strophe.getNodeFromJid(args.jid));

                            Judoonge.Core.Action.Jabber.chatStart(roomNameAll, calltargetlist);

                            break;
                        }
                    }

                    TIMMER = setTimeout(function () {
                        connectId = Strophe.getNodeFromJid(args.jid) + "," + Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid());
                        Judoonge.Core.Action.Jabber.messageDeviceEnable(roomNameAll + "@" + Judoonge.serverInfo.conferenDomain);
                    }, 500);
                }
            });
        },

        showPeopleDetail: function (args) {
        },

        showPeoplesearchBox: function () {
        }
    };

    self.Talk = {
        // 채팅 부분
    };

    self.Room = {};

    self.PrivateRoom = {};

    /**
	 * Class Judoonge.View.Pane.Roster Handles everyhing regarding roster
	 * updates.
	 */
    self.Roster = {
        /**
		 * Function: update Called by <Judoonge.View.Observer.Presence.update>
		 * to update the roster if needed. Adds/removes users from the roster
		 * list or updates informations on their items (roles, affiliations
		 * etc.)
		 * 
		 * TODO: Refactoring, this method has too much LOC.
		 * 
		 * Parameters: (String) roomJid - Room JID in which the update happens
		 * (Judoonge.Core.ChatUser) user - User on which the update happens
		 * (String) action - one of "join", "leave", "kick" and "ban"
		 * (Judoonge.Core.ChatUser) currentUser - Current user
		 */
        update: function (roomJid, user, action, currentUser) {
        },

        /**
		 * Function: userClick Click handler for opening a private room
		 */
        userClick: function () {
        },

        /**
		 * Function: joinAnimation Animates specified elementId on join
		 * 
		 * Parameters: (String) elementId - Specific element to do the animation
		 * on
		 */
        joinAnimation: function (elementId) {
        },

        /**
		 * Function: leaveAnimation Leave animation for specified element id and
		 * removes the DOM element on completion.
		 * 
		 * Parameters: (String) elementId - Specific element to do the animation
		 * on
		 */
        leaveAnimation: function (elementId) {
        }
    };

    /**
	 * Class: Judoonge.View.Pane.Message Message submit/show handling
	 */
    self.Message = {
        /**
		 * Function: submit on submit handler for message field sends the
		 * message to the server and if it's a private chat, shows the message
		 * immediately because the server doesn't send back those message.
		 * 
		 * Parameters: (Event) event - Triggered event
		 */
        submit: function (event) {
            event.preventDefault();
        },

        /**
		 * Function: show Show a message in the message pane
		 * 
		 * Parameters: (String) roomJid - room in which the message has been
		 * sent to (String) name - Name of the user which sent the message
		 * (String) message - Message (String) timestamp - [optional] Timestamp
		 * of the message, if not present, current date.
		 */
        show: function (roomJid, name, message, timestamp) {
        }
    };

    return self;
}(Judoonge.View.Pane || {}, jQuery));
/**
 * File: template.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.View.Template Contains mustache.js templates
 */
Judoonge.View.Template = (function (self) {
    self.Window = {
        /**
		 * Unread messages - used to extend the window title
		 */
        unreadmessages: '({{count}}) {{title}}'
    };

    self.Login = {};

    self.Register = {};

    self.Main = {};

    self.People = {
        people: '<li id="studentList-{{jid}}" data-jid="{{fulljid}}" group="{{group}}" status="{{status}}">\n'
				+ '<a href="#"><img src="image/student_{{status}}_image.png" alt="{{name}}"></a>\n'
				+ '<div class="btnWrap">\n'
				+ '<span><img src="image/holder_icon.png" alt="잠금버튼"></span>\n'
				+ '<span><img src="image/sBtn_icon.png" alt="S버튼"></span>\n'
				+ '</div>\n' + '<span>{{name}}</span>\n' + '</li>\n' + '\n',
    };

    self.Talk = {};

    self.Message = {
        pane: '<div class="message-pane-wrapper"><dl class="message-pane"></dl></div>',
        item: '<dt>{{time}}</dt><dd><span class="label"><a href="#" class="name">{{displayName}}</a></span>{{{message}}}</dd>'
    };

    self.PresenceError = {
        enterPasswordForm: '<strong>{{_label}}</strong>'
				+ '<form method="post" id="enter-password-form" class="enter-password-form">'
				+ '<label for="password">{{_labelPassword}}</label><input type="password" id="password" name="password" />'
				+ '<input type="submit" class="button" value="{{_joinSubmit}}" /></form>',
        nicknameConflictForm: '<strong>{{_label}}</strong>'
				+ '<form method="post" id="nickname-conflict-form" class="nickname-conflict-form">'
				+ '<label for="nickname">{{_labelNickname}}</label><input type="text" id="nickname" name="nickname" />'
				+ '<input type="submit" class="button" value="{{_loginSubmit}}" /></form>',
        displayError: '<strong>{{_error}}</strong>'
    };

    return self;
}(Judoonge.View.Template || {}));
/**
 * File: translation.js Judoonge - Chats are not dead yet.
 * 
 * Authors: - Patrick Stadler <patrick.stadler@gmail.com> - Michael Weibel
 * <michael.weibel@gmail.com>
 * 
 * Copyright: (c) 2011 Amiado Group AG. All rights reserved.
 */

/**
 * Class: Judoonge.View.Translation Contains translations
 */
Judoonge.View.Translation = {
    'en': {
        'status': 'Status: %s',
        'statusConnecting': 'Connecting...',
        'statusConnected': 'Connected',
        'statusDisconnecting': 'Disconnecting...',
        'statusDisconnected': 'Disconnected',
        'statusAuthfail': 'Authentication failed',

        'roomSubject': 'Subject:',
        'messageSubmit': 'Send',

        'labelUsername': 'Username:',
        'labelname': 'name:',
        'labelemail': 'email:',
        'labelPassword': 'Password:',
        'loginSubmit': 'Login',
        'loginInvalid': 'Invalid JID',

        'registerSubmit': 'Register',
        'registerCancle': 'Cancle',

        'reason': 'Reason:',
        'subject': 'Subject:',
        'reasonWas': 'Reason was: %s.',
        'kickActionLabel': 'Kick',
        'youHaveBeenKickedBy': 'You have been kicked from %2$s by %1$s',
        'youHaveBeenKicked': 'You have been kicked from %s',
        'banActionLabel': 'Ban',
        'youHaveBeenBannedBy': 'You have been banned from %1$s by %2$s',
        'youHaveBeenBanned': 'You have been banned from %s',

        'privateActionLabel': 'Private chat',
        'ignoreActionLabel': 'Ignore',
        'unignoreActionLabel': 'Unignore',

        'setSubjectActionLabel': 'Change Subject',

        'administratorMessageSubject': 'Administrator',

        'userJoinedRoom': '%s joined the room.',
        'userLeftRoom': '%s left the room.',
        'userHasBeenKickedFromRoom': '%s has been kicked from the room.',
        'userHasBeenBannedFromRoom': '%s has been banned from the room.',

        'presenceUnknownWarningSubject': 'Notice:',
        'presenceUnknownWarning': 'This user might be offline. We can\'t track his presence.',

        'dateFormat': 'dd.mm.yyyy',
        'timeFormat': 'HH:MM:ss',

        'tooltipRole': 'Moderator',
        'tooltipIgnored': 'You ignore this user',
        'tooltipEmoticons': 'Emoticons',
        'tooltipSound': 'Play sound for new private messages',
        'tooltipAutoscroll': 'Autoscroll',
        'tooltipStatusmessage': 'Display status messages',
        'tooltipAdministration': 'Room Administration',
        'tooltipUsercount': 'Room Occupants',

        'enterRoomPassword': 'Room "%s" is password protected.',
        'enterRoomPasswordSubmit': 'Join room',
        'passwordEnteredInvalid': 'Invalid password for room "%s".',

        'nicknameConflict': 'Username already in use. Please choose another one.',

        'errorMembersOnly': 'You can\'t join room "%s": Insufficient rights.',
        'errorMaxOccupantsReached': 'You can\'t join room "%s": Too many occupants.',

        'antiSpamMessage': 'Please do not spam. You have been blocked for a short-time.'
    }
};

var defaultStunServer = "stun:stun.l.google.com:19302";

var localVideo = remoteVideo = null;
var ws = null, interval = null;
var webrtc = null, remoteParty = null;
var sIdCounter = [];
var RTCSessionArray = [];

function onLoad() {
    // 하나하나하나
    init();
    webrtc = new WebRtcJingle();

    webrtc.startApp({

        sendPacket: function (packet) {
            console.log("sendPacket " + packet);
            ws.send(packet);
        },

        startRemoteMedia: function (url, from, roomJid) {
            // hwcho 2014-05-29 학생 영상 붙이기
            document.getElementById("v_" + roomJid).src = url;
            document.getElementById("v_" + roomJid).play();
            document.getElementById("v_" + roomJid).volume = 0.5;

            // hwcho 2014-05-30 학생 이미지 변경.
            $("#studentList-" + window.connectId.split(",")[0] + " a img").attr("src", "image/student_connect_image.png");
        },

        startLocalMedia: function (url, roomJid) {
            // hwcho 2014-05-29 카메라, 마이크 허용 시 바로 학생에게 콜
            $("#v_" + roomJid).show();

            var calluser = window.connectId.split(",");
            for (var i = 0; calluser.length > i; i++) {
                if (calluser[i] != Strophe.getNodeFromJid(Judoonge.Core.getUser().getJid()))
                    call(calluser[i]);
            }
        },

        incomingCall: function (farParty, roomJid) {
            remoteParty = farParty;
        },

        terminatedCall: function () {
            console.log("terminatedCall");
        }

    }, {
        "iceServers": [{
            "url": defaultStunServer
        }]
    });
}

function onBeforeUnload() {
    unRegister();
}

function register() {
    if (window.webkitNotifications) {
        window.webkitNotifications.requestPermission();
    }
    connect();
}

function connect(username, password) {
    var me = username, mepassword = password;

    ws = new WebSocket("ws://knowledgepoint.co.kr:7070/ws/server?username="
			+ username + "&password=" + mepassword + "&resource=" + me, "xmpp");
    ws.onopen = onOpen;
    ws.onmessage = onMessage;
    ws.onclose = onConnectionClose;

    webrtc.jid = me + "@knowledgepoint.co.kr/" + me;
}

function onOpen() {
    interval = setInterval(function () {
        if (ws != null)
            ws.send(" ");
    }, 10000);
    ws.send("<presence/>");

}

function onMessage(packet) {
    webrtc.onMessage(packet.data);
}

function onConnectionClose() {
    clearInterval(interval);
}

function unRegister() {
    webrtc.jingleTerminate();
    ws.close();
}

function call(to) {
    console.log("call(" + to + ")");
    userto = to + "@" + Judoonge.serverInfo.basicDomain + "/" + to;
    webrtc.jingleInitiate(userto);
}

function bye(sendParty) {
    // hwcho 2014-06-10 비디오 데이터 null로 변경.
    localVideo = remoteVideo = null;
    remoteParty = sendParty;

    webrtc.jingleTerminate(remoteParty);
}

function startRinging() {
    ringing.play();
}

function stopRinging() {
    ringing.pause();
}