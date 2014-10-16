/* jshint globalstrict: true */
'use strict';

function initWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
  this.$$postDigestQueue = [];
  this.$$phase = null;
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var watcher = {
    watchFn: watchFn,
    //TODO: find out if checking if listenerFn exists during $digest is better than calling no op
    listenerFn: listenerFn || function() {/* no op */},
    last: initWatchVal,
    valueEq: !!valueEq
  };
  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null; // so that watches added in the middle of a digest are not ignored
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
    if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
      self.$$lastDirtyWatch = watcher;
      watcher.last = ( watcher.valueEq ? _.cloneDeep(newValue) : newValue );
      watcher.listenerFn(newValue,
        (oldValue !== initWatchVal? oldValue : newValue),
        self);
      dirty = true;
    }
    // if the watcher is clean, and it's the last watch we saw that was dirty stop the digest
    else if (watcher === self.$$lastDirtyWatch) {
      return false; //this will break lodash out of the _.each loop
    }
  });

  return dirty;
};

Scope.prototype.$digest = function() {
  var ttl = 10,
      dirty,
      asyncTask;
  this.$$lastDirtyWatch = null;
  this.beginPhase('$digest');
  do {
    while (this.$$asyncQueue.length) {
      asyncTask = this.$$asyncQueue.shift();
      asyncTask.scope.$eval(asyncTask.expression);
    }
    dirty = this.$$digestOnce();
    if (( dirty || this.$$asyncQueue.length ) && !(ttl--)) {
      throw "10 iterations of digests reached";
    }
  } while(dirty || this.$$asyncQueue.length);
  this.clearPhase();

  while (this.$$postDigestQueue.length) {
    this.$$postDigestQueue.shift()();
  }
};


Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  }
  else {
    return newValue === oldValue ||
      (typeof newValue === 'number' && typeof oldValue === 'number' &&
        isNaN(newValue) && isNaN(oldValue));
  }
};

Scope.prototype.$eval = function(expr, locals) {
  return expr(this, locals);
};

Scope.prototype.$apply = function(expr) {
  try {
    this.beginPhase('$apply');
    return this.$eval(expr);
  }
  finally {
    this.clearPhase();
    this.$digest();
  }
};

Scope.prototype.$evalAsync = function(expr) {
  var self = this;
  if (!self.$$phase && !self.$$asyncQueue.length) {
    //if we are not in a phase and there are no async tasks in queue, schedule a $digest
    setTimeout(function() {
      if (self.$$asyncQueue.length) {
        self.$digest();
      }
    }, 0);
  }
  this.$$asyncQueue.push({scope: this, expression: expr});
};

Scope.prototype.beginPhase = function(phase) {
  if (this.$$phase) {
    throw this.$$phase + ' already in progress';
  }
  this.$$phase = phase;
};

Scope.prototype.clearPhase = function() {
  this.$$phase = null;
};

Scope.prototype.$$postDigest = function(expr) {
  this.$$postDigestQueue.push(expr);
};