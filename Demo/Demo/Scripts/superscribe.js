(function (factory) {

    // Support module loading scenarios
    if (typeof define === 'function' && define.amd) {
        // AMD Anonymous Module
        define(['jquery'], factory);
    } else {
        // No module loader (plain <script> tag) - put directly in global namespace
        window.ʃ = factory($);
    }

})(function ($) {

    var hasHistory = !!(window.history && history.pushState);
    var ʃ = function () { };

    // Return whether the event targets this window.
    ʃ.targetIsThisWindow = function targetIsThisWindow(event) {
        var targetWindow = $(event.target).attr('target');

        if (!targetWindow || targetWindow === window.name || targetWindow === '_self') { return true; }
        if (targetWindow === '_blank') { return false; }
        if (targetWindow === 'top' && window === window.top) { return true; }

        return false;
    };

    ʃ.DefaultLocationProxy = function (run_interval_every) {
        // set is native to false and start the poller immediately
        this.eventNamespace = function () { return "Superscribe"; };
    };

    ʃ.DefaultLocationProxy.fullPath = function (location_obj) {
        // Bypass the `window.location.hash` attribute.  If a question mark
        // appears in the hash IE6 will strip it and all of the following
        // characters from `window.location.hash`.
        var matches = location_obj.toString().match(/^[^#]*(#.+)$/);
        var hash = matches ? matches[1] : '';
        return [location_obj.pathname, location_obj.search, hash].join('');
    };

    ʃ.DefaultLocationProxy.prototype.bind = function () {
        var proxy = this;
        var lp = ʃ.DefaultLocationProxy;

        $(window).bind('hashchange.' + this.eventNamespace(), function (e) {
            locationChanged();
        });

        if (hasHistory) {

            // bind to popstate
            $(window).bind('popstate.' + this.eventNamespace(), function (e) {
                locationChanged();
            });

            // bind to link clicks that have routes
            $(document).delegate('a', 'click.history-' + this.eventNamespace(), function (e) {

                if (e.isDefaultPrevented() || e.metaKey || e.ctrlKey) {
                    return;
                }

                var full_path = lp.fullPath(this),
                  // Get anchor's host name in a cross browser compatible way.
                  // IE looses hostname property when setting href in JS 
                  // with a relative URL, e.g. a.setAttribute('href',"/whatever").
                  // Circumvent this problem by creating a new link with given URL and 
                  // querying that for a hostname. 
                  hostname = this.hostname ? this.hostname : function (a) {
                      var l = document.createElement("a");
                      l.href = a.href;
                      return l.hostname;
                  }(this);

                if (hostname == window.location.hostname && ʃ.targetIsThisWindow(e)) {

                    e.preventDefault();
                    proxy.setLocation(full_path);
                    return false;

                }

            });
        }

        if (!lp._bindings) {
            lp._bindings = 0;
        }
        lp._bindings++;

    };

    // unbind the proxy events from the current app
    ʃ.DefaultLocationProxy.prototype.unbind = function () {

        $(window).unbind('hashchange.' + this.eventNamespace());
        $(window).unbind('popstate.' + this.eventNamespace());
        $(document).undelegate('a', 'click.history-' + this.eventNamespace());

        ʃ.DefaultLocationProxy._bindings--;

        if (ʃ.DefaultLocationProxy._bindings <= 0) {
            window.clearInterval(ʃ.DefaultLocationProxy._interval);
            ʃ.DefaultLocationProxy._interval = null;
        }

    };

    // get the current location from the hash.
    ʃ.DefaultLocationProxy.prototype.getLocation = function () {
        return ʃ.DefaultLocationProxy.fullPath(window.location);
    };

    // set the current location to `new_location`
    ʃ.DefaultLocationProxy.prototype.setLocation = function (new_location) {

        if (/^([^#\/]|$)/.test(new_location)) { // non-prefixed url
            if (hasHistory) {
                new_location = '/' + new_location;
            } else {
                new_location = '#!/' + new_location;
            }
        }

        if (new_location != this.getLocation()) {
            // HTML5 History exists and new_location is a full path
            if (hasHistory && /^\//.test(new_location)) {
                history.pushState({ path: new_location }, window.title, new_location);
                locationChanged();
            } else {
                return (window.location = new_location);
            }
        }

    };

    var proxy = new ʃ.DefaultLocationProxy(10);
    proxy.bind();

    var locationChanged = function () {
        alert(proxy.getLocation());
    };

    return ʃ;

});