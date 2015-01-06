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

            if (privateApi.hasStoredData()) {
                privateApi.getStoredData();

                if (this.hasAccessToken() && this.hasAccessTokenExpiration()) {
                    this.login(data.accessToken, data.accessTokenExpiration);
                }
            } else {
                privateApi.resetData();
                privateApi.updateStorage();
            }

            $.extend(options, inputOptions);

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
        }
    };

    var privateApi = {
        activateInterceptor: function() {
            intercept = true;
        },
        deactivateInterceptor: function() {
            intercept = false;
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
            $(document).ajaxError(function(event, jqxhr, settings){
                if (intercept && jqxhr.status === 401 && self.hasEvent("tokenExpiration")) {
                    setTimeout(function(){
                        if (!refreshing) {
                            self.setRefreshingFlag(true);
                            self.fireEvent("tokenExpiration").done(function(response, status, xhr){
                                switch(xhr.status) {
                                    case 200:
                                        // fire and clear buffer
                                        break;
                                    case 401:
                                        publicApi.logout();
                                        break;
                                }
                            });
                        }
                    }, 100);

                    // add to buffer
                }
            });
        },
        updateStorage: function() {
            storage.set("jquery.oauth", data);
        }
    };

    return publicApi;
}));
