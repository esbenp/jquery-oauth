(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'store'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery', 'store'));
    } else {
        factory(jQuery);
    }
}(this, function ($, storage) {
    var options = {};
    var data    = {};

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
            privateApi.fireEvent("logout");
        },
        login: function(accessToken, accessTokenExpiration) {
            data.accessToken = accessToken;
            data.accessTokenExpiration = accessTokenExpiration;

            privateApi.setAuthorizationHeader();
            privateApi.updateStorage();
            privateApi.fireEvent("login");
        },
        initialize: function(inputOptions) {
            privateApi.resetOptions();

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
        }
    };

    var privateApi = {
        fireEvent: function(eventType) {
            if (this.hasEvent(eventType)) {
                options.events[eventType]();
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
        updateStorage: function() {
            storage.set("jquery.oauth", data);
        }
    };

    return publicApi;
}));
