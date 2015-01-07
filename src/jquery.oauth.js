(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'store'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery', 'store'));
    } else {
        root.returnExports = factory(root.jQuery, root.store);
    }
}(this, function ($, storage) {
    var options     = {};
    var data        = {};
    var intercept   = false;
    var refreshing  = false;
    var buffer      = [];

    var publicApi = {
        hasAccessToken: function() {
            return data.accessToken !== null;
        },
        hasAccessTokenExpiration: function() {
            return data.accessTokenExpiration !== null;
        },
        logout: function() {
            privateApi.resetData();
            privateApi.updateStorage();
            privateApi.deactivateInterceptor();
            privateApi.removeAjaxHeader("Authorization");
            privateApi.fireEvent("logout");
        },
        login: function(accessToken, accessTokenExpiration) {
            this.setAccessToken(accessToken, accessTokenExpiration);

            privateApi.activateInterceptor();
            privateApi.fireEvent("login");
        },
        initialize: function(inputOptions) {
            privateApi.resetOptions();
            privateApi.setupInterceptor();

            $.extend(options, inputOptions);

            if (privateApi.hasStoredData()) {
                privateApi.getStoredData();

                if (this.hasAccessToken() && this.hasAccessTokenExpiration()) {
                    this.login(data.accessToken, data.accessTokenExpiration);
                }
            } else {
                privateApi.resetData();
                privateApi.updateStorage();
            }

            if (options.csrfToken !== null) {
                privateApi.setCsrfHeader();
            }
        },
        setAccessToken: function(accessToken, accessTokenExpiration) {
            if (accessTokenExpiration === undefined) {
                accessTokenExpiration = null;
            }

            data.accessToken           = accessToken;
            data.accessTokenExpiration = accessTokenExpiration;

            privateApi.setAuthorizationHeader();
            privateApi.updateStorage();
        },
        setCsrfToken: function(csrfToken) {
            options.csrfToken = csrfToken;

            privateApi.setCsrfHeader();
        }
    };

    var privateApi = {
        activateInterceptor: function() {
            intercept = true;
        },
        addToBuffer: function(settings, deferred) {
            buffer.push({
                deferred: deferred,
                settings: settings
            });
        },
        clearBuffer: function() {
            buffer = [];
        },
        deactivateInterceptor: function() {
            intercept = false;
        },
        fireBuffer: function() {
            var self = this;
            var deferred;
            var promises = [];
            for(var i in buffer) {
                deferred = buffer[i].deferred;

                buffer[i].settings.refreshRetry = true;
                buffer[i].settings.headers["Authorization"] = $.ajaxSettings.headers["Authorization"];

                promises.push($.ajax(buffer[i].settings).then(deferred.resolve, deferred.reject));
            }

            self.clearBuffer();

            $.when.apply($, promises)
                    .done(function() {
                        self.setRefreshingFlag(false);
                    })
                    .fail(function(){
                        self.setRefreshingFlag(false);
                        publicApi.logout();
                    });
        },
        fireEvent: function(eventType) {
            if (this.hasEvent(eventType)) {
                return options.events[eventType]();
            }
        },
        getStoredData: function() {
            $.extend(data, storage.get("jquery.oauth"));
        },
        hasEvent: function(eventType) {
            return options.events[eventType] !== undefined && typeof options.events[eventType] === "function";
        },
        hasStoredData: function() {
            return storage.get("jquery.oauth") !== undefined;
        },
        isAjaxHeadersInitialized: function() {
            return $.ajaxSettings.headers !== undefined;
        },
        removeAjaxHeader: function(header) {
            if (!this.isAjaxHeadersInitialized()) {
                return true;
            }
            $.ajaxSettings.headers[header] = undefined;
        },
        removeAllAjaxHeaders: function() {
            this.removeAjaxHeader("Authorization");
            this.removeAjaxHeader("X-CSRF-Token");
        },
        resetData: function() {
            data = {
                accessToken: null,
                accessTokenExpiration: null
            };
        },
        resetOptions: function() {
            options = {
                csrfToken: null,
                events: {}
            };

            this.removeAllAjaxHeaders();
        },
        setAjaxHeader: function(header, value) {
            if (!this.isAjaxHeadersInitialized()) {
                $.ajaxSettings.headers = {};
            }

            $.ajaxSettings.headers[header] = value;
        },
        setAuthorizationHeader: function() {
            this.setAjaxHeader("Authorization", "Bearer " + data.accessToken);
        },
        setCsrfHeader: function() {
            this.setAjaxHeader("X-CSRF-Token", options.csrfToken);
        },
        setRefreshingFlag: function(newFlag) {
            refreshing = newFlag;
        },
        setupInterceptor: function() {
            var self = this;

            // Credits to gnarf @ http://stackoverflow.com/a/12446363/602488
            $.ajaxPrefilter(function(options, originalOptions, jqxhr) {
                if (options.refreshRetry === true) {
                    return;
                }

                var deferred = $.Deferred();

                jqxhr.done(deferred.resolve);
                jqxhr.fail(function() {
                    var args = Array.prototype.slice.call(arguments);

                    if (intercept && jqxhr.status === 401 && self.hasEvent("tokenExpiration")) {
                        self.addToBuffer(options, deferred);

                        if (!refreshing) {
                            self.setRefreshingFlag(true);
                            self.fireEvent("tokenExpiration")
                                .success(function () {
                                    self.fireBuffer();
                                })
                                .fail(function () {
                                    publicApi.logout();
                                });
                        }
                    } else {
                        deferred.rejectWith(jqxhr, args);
                    }
                });

                return deferred.promise(jqxhr);
            });
        },
        updateStorage: function() {
            storage.set("jquery.oauth", data);
        }
    };

    return publicApi;
}));
