/* jshint globalstrict: true */
'use strict';

function initWatchVal() {}

function Scope() {
  this.$$watchers = [];
}

Scope.prototype.$watch = function(watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    //TODO: find out if checking if listenerFn exists during $digest is better than calling no op
    listenerFn: listenerFn || function() {/* no op */},
    last: initWatchVal
  };
  this.$$watchers.push(watcher);
};

Scope.prototype.$$digestOnce = function() {
// TODO: use a normal for loop here instead of lodash
  var self = this,
      dirty = false,
      oldValue,
      newValue;

  _.each(this.$$watchers, function(watcher) {
    newValue = watcher.watchFn(self);
    oldValue = watcher.last;
    if (newValue !== oldValue) {
      watcher.last = newValue;
      watcher.listenerFn(newValue,
        (oldValue !== initWatchVal? oldValue : newValue),
        self);
      dirty = true;
    }
  });

  return dirty;
};

Scope.prototype.$digest = function() {
  var ttl = 10,
      dirty;
  do {
    dirty = this.$$digestOnce();
    if (dirty && !(ttl--)) {
      throw "10 iterations of digests reached";
    }
  } while(dirty);

};
