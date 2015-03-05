(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        window.ʃ = factory($);
    }
})(function ($) {
    // fields

    var defaultLocationProxy;
    var hasHistory = !!(window.history && history.pushState);

    var onLocationChanged = function () { };

    // private methods

    var arrayFirst = function (array, predicate, predicateOwner) {
        for (var i = 0, j = array.length; i < j; i++)
            if (predicate.call(predicateOwner, array[i]))
                return array[i];
        return null;
    };

    var targetIsThisWindow = function (event) {
        var targetWindow = $(event.target).attr('target');

        if (!targetWindow || targetWindow === window.name || targetWindow === '_self') { return true; }
        if (targetWindow === '_blank') { return false; }
        if (targetWindow === 'top' && window === window.top) { return true; }

        return false;
    };

    var runRoute = function (route) {
        var info = {};
        var walker = new ʃ.RouteWalker(route, info);
        return walker.walkRoute();
    };

    var locationChanged = function () {
        var route = proxy.getLocation();
        onLocationChanged(route);
        runRoute(route);
    };

    // location proxy setup a la sammy.js

    defaultLocationProxy = function (run_interval_every) {
        // set is native to false and start the poller immediately
        this.eventNamespace = function () { return "Superscribe"; };
    };

    defaultLocationProxy.fullPath = function (location_obj) {
        // Bypass the `window.location.hash` attribute.  If a question mark
        // appears in the hash IE6 will strip it and all of the following
        // characters from `window.location.hash`.
        var matches = location_obj.toString().match(/^[^#]*(#.+)$/);
        var hash = matches ? matches[1] : '';
        return [location_obj.pathname, location_obj.search, hash].join('');
    };

    defaultLocationProxy.prototype.bind = function () {
        var proxy = this;
        var lp = defaultLocationProxy;

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

                if (hostname == window.location.hostname && targetIsThisWindow(e)) {
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

    defaultLocationProxy.prototype.unbind = function () {
        $(window).unbind('hashchange.' + this.eventNamespace());
        $(window).unbind('popstate.' + this.eventNamespace());
        $(document).undelegate('a', 'click.history-' + this.eventNamespace());

        defaultLocationProxy._bindings--;

        if (defaultLocationProxy._bindings <= 0) {
            window.clearInterval(defaultLocationProxy._interval);
            defaultLocationProxy._interval = null;
        }
    };

    defaultLocationProxy.prototype.getLocation = function () {
        return defaultLocationProxy.fullPath(window.location);
    };

    defaultLocationProxy.prototype.setLocation = function (new_location) {
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

    defaultLocationProxy.prototype.replaceLocation = function (new_location) {
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
                history.replaceState({ path: new_location }, window.title, new_location);
                locationChanged();
            } else {
                return (window.location = new_location);
            }
        }
    };

    defaultLocationProxy.prototype.runRoute = runRoute;

    var proxy = new defaultLocationProxy(10);

    // Define superscribe object

    var ʃ = function (arg) {
        if (typeof arg == "string") {
            var node = new ʃ.SuperscribeNode();
            node.template = arg;

            return node;
        }
    };

    ʃ.RouteWalker = function (route) {
        var properties = {};
        properties.route = route;
        properties.querystring = "";
        properties.info = {
            parameters: {}
        };

        var parts = route.split("?");
        if (parts.length > 0) {
            route = parts[0];
        }
        if (parts.length > 1) {
            properties.querystring = parts[1];
        }

        if (properties.querystring.length > 0) {
            var queries = properties.querystring.split("&");
            for (var index in queries) {
                var query = queries[index];
                if (query.indexOf("=") >= 0) {
                    var operands = query.split("=");
                    properties.info.parameters[operands[0]] = operands[1];
                }
            }
        }

        properties.remainingSegments = route.split('/');

        var peekNextSegment = function () {
            if (properties.remainingSegments.length > 0) {
                return properties.remainingSegments[0];
            }
            return "";
        };

        var findNextMatch = function (segment, states) {
            return !!(segment) ?
                arrayFirst(states, function (o) {
                    return o.activationFunction(properties.info, segment);
                })
                : null;
        };

        var walkRoute = function () {
            var match = ʃ.baseNode;
            var onComplete = null;

            while (match != null) {
                if (match.actionFunction != null) {
                    match.actionFunction(properties.info, peekNextSegment());
                }

                if (!match.nonConsuming) {
                    if (properties.remainingSegments.length > 0) {
                        properties.remainingSegments.shift();
                    }
                }

                if (match.finalFunction) {
                    onComplete = match.finalFunction;
                }

                var nextMatch = findNextMatch(peekNextSegment(), match.edges);

                if (nextMatch == null
                    && !match.finalFunction
                    && match.edges
                    && match.edges.length > 0
                    && arrayFirst(match.edges, function (o) { return (o.isOptional || o.nonConsuming); }) == null) {
                    alert('incomplete match');
                    return;
                }

                match = nextMatch;
            }

            if (arrayFirst(properties.remainingSegments, function (o) { return !!o; }) != null) {
                alert('extraneous match');
                return;
            }

            if (onComplete && typeof onComplete == "function") {
                return onComplete(properties.info);
            }
        };

        this.walkRoute = walkRoute;
    };

    ʃ.SuperscribeNode = function () {
        this.parent = null;
        this.isOptional = false;
        this.edges = [];
        this.querystring = [];

        this.pattern = "";
        this.template = "";

        this.activationFunction = function (info, segment) {
            if (this.pattern) {
                return this.pattern.test(segment);
            }

            return this.template === segment;
        };
        this.actionFunction = function (info, segment) { };
        this.finalFunction = null;
    };

    ʃ.SuperscribeNode.prototype.slash = function (nextNode) {
        nextNode.parent = this;
        this.edges.push(nextNode);
        return nextNode;
    };

    ʃ.SuperscribeNode.prototype.optional = function () {
        this.isOptional = true;
        return this;
    };

    ʃ.SuperscribeNode.prototype.base = function () {
        var baseRecursive = function (node, parent) {
            if (parent == null) {
                return node;
            }

            return baseRecursive(parent, parent.parent);
        };

        return baseRecursive(this, this.parent);
    };

    ʃ.baseNode = new ʃ.SuperscribeNode();

    ʃ.proxy = function () {
        return proxy;
    };

    ʃ.listen = function () {
        proxy.bind();
        locationChanged();
        return proxy;
    };

    ʃ.reset = function () {
        ʃ.baseNode = new ʃ.SuperscribeNode();
    };

    ʃ.letters = function (name) {
        var node = new ʃ.SuperscribeNode();
        node.pattern = /^[a-zA-Z]+$/;
        node.actionFunction = function (info, segment) {
            info.parameters[name] = segment;
        };

        return node;
    };

    ʃ.alpha = function (name) {
        var node = new ʃ.SuperscribeNode();
        node.pattern = /^[a-zA-Z0-9-_]+$/;
        node.actionFunction = function (info, segment) {
            info.parameters[name] = segment;
        };

        return node;
    };

    ʃ.final = function (func) {
        this.func = func;
    };

    ʃ.action = function (func) {
        this.func = func;
    };

    ʃ.route = function (func) {
        var context = {};
        ʃ.SuperscribeNode.prototype.valueOf = function () {
            if (context.leftOperand) {
                context.leftOperand.slash(this);
            }

            context.leftOperand = this;
        };

        ʃ.final.prototype.valueOf = function () {
            if (context.leftOperand) {
                context.leftOperand.finalFunction = this.func;
            }
        };

        ʃ.action.prototype.valueOf = function () {
            if (context.leftOperand) {
                context.leftOperand.actionFunction = this.func;
            }
        };

        func(ʃ.baseNode);
        return context.leftOperand;
    };

    ʃ.runRoute = function (route) {
        return proxy.runRoute(route);
    };

    ʃ.setLocation = function (route) {
        proxy.setLocation(route);
    };

    ʃ.replaceLocation = function (route) {
        proxy.replaceLocation(route);
    };

    ʃ.onLocationChanged = function (func) {
        onLocationChanged = func;
    };

    return ʃ;
});