/* jshint globalstrict: true */
'use strict';

function initWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
  this.$$postDigestQueue = [];
  this.$$root = this;
  this.$$children = [];
  this.$$phase = null;
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var self = this;
  var watcher = {
    watchFn: watchFn,
    //TODO: find out if checking if listenerFn exists during $digest is better than calling no op
    listenerFn: listenerFn || function() {/* no op */},
    last: initWatchVal,
    valueEq: !!valueEq
  };
  this.$$watchers.unshift(watcher);
  this.$$root.$$lastDirtyWatch = null; // so that watches added in the middle of a digest are not ignored
  return function() {
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$root.$$lastDirtyWatch = null;
    }
  };
};

Scope.prototype.$$digestOnce = function() {
// TODO: use a normal for loop here instead of lodash
  var self = this,
      dirty = false;

  this.$$everyScope(function(scope) {
    var oldValue,
        newValue,
        continueLoop = true;

    _.forEachRight(scope.$$watchers, function(watcher) {
      try {
        if( watcher) {
          newValue = watcher.watchFn(scope);
          oldValue = watcher.last;
          if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
            self.$$root.$$lastDirtyWatch = watcher;
            watcher.last = ( watcher.valueEq ? _.cloneDeep(newValue) : newValue );
            watcher.listenerFn(newValue,
              (oldValue !== initWatchVal ? oldValue : newValue),
              scope);
            dirty = true;
          }
          // if the watcher is clean, and it's the last watch we saw that was dirty stop the digest
          else if (watcher === self.$$root.$$lastDirtyWatch) {
            continueLoop = false;
            return false; //this will break lodash out of the _.each loop
          }
        }
      }
      catch(e) {
        console.error(e);
      }
    });
    return continueLoop;
  });

  return dirty;
};

Scope.prototype.$digest = function() {
  var ttl = 10,
      dirty,
      asyncTask;
  this.$$root.$$lastDirtyWatch = null;
  this.beginPhase('$digest');
  do {
    while (this.$$asyncQueue.length) {
      try {
        asyncTask = this.$$asyncQueue.shift();
        asyncTask.scope.$eval(asyncTask.expression);
      }
      catch (e) {
        console.error(e);
      }
    }
    dirty = this.$$digestOnce();
    if (( dirty || this.$$asyncQueue.length ) && !(ttl--)) {
      throw "10 iterations of digests reached";
    }
  } while(dirty || this.$$asyncQueue.length);
  this.clearPhase();

  while (this.$$postDigestQueue.length) {
    try {
      this.$$postDigestQueue.shift()();
    }
    catch (e) {
      console.error(e);
    }
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
    this.$$root.$digest();
  }
};

Scope.prototype.$evalAsync = function(expr) {
  var self = this;
  if (!self.$$phase && !self.$$asyncQueue.length) {
    //if we are not in a phase and there are no async tasks in queue, schedule a $digest
    setTimeout(function() {
      if (self.$$asyncQueue.length) {
        self.$$root.$digest();
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

Scope.prototype.$watchGroup = function(watchFns, listenerFn) {
  var self = this,
      newValues = new Array(watchFns.length),
      oldValues = new Array(watchFns.length),
      listenerScheduled = false,
      firstRun = true,
      watchRemovers = new Array(watchFns.length),
      skipListenerExecution = false;

  function watchGroupListener() {
    if (skipListenerExecution) {
      return;
    }
    if (firstRun) {
      firstRun = false;
      listenerFn(newValues, newValues, self);
    }
    else {
      listenerFn(newValues, oldValues, self);
    }
    listenerScheduled = false;
  }

  function removeAllWatches() {
    if (watchRemovers.length === 0) {
      // we have a zero watch listenere scheduled. let's have it noop
      skipListenerExecution = true;
    }
    for (var i=0; i < watchRemovers.length; i++) {
      watchRemovers[i]();
    }
  }
  if (watchFns.length === 0) {
    listenerScheduled = true;
    self.$evalAsync(watchGroupListener);
  }

  _.forEach(watchFns, function(watchFn, i) {
    var watchRemover = self.$watch(watchFn, function(newValue, oldValue) {
      newValues[i] = newValue;
      oldValues[i] = oldValue;
      if(listenerScheduled === false) {
        listenerScheduled = true;
        self.$evalAsync(watchGroupListener);
      }
    });
    watchRemovers[i] = watchRemover;
  });

  return removeAllWatches;
};

Scope.prototype.$new = function(isolated) {
  var child,
      ChildScope = function() {};
  if (isolated) {
    child = new Scope();
    child.$$root = this.$$root;
    child.$$asyncQueue = this.$$root.$$asyncQueue;
    child.$$postDigestQueue = this.$$root.$$postDigestQueue;
  }
  else {
    ChildScope.prototype = this;
    child = new ChildScope();
  }
  this.$$children.push(child);
  child.$parent = this;
  child.$$watchers = [];
  child.$$children = [];
  return child;
};

Scope.prototype.$$everyScope = function(fn) {
  if (fn(this)) {
    return this.$$children.every(function(child) {
      return child.$$everyScope(fn);
    });
  }
  else {
    return false;
  }
};

Scope.prototype.$destroy = function() {
  if (this.$$root === this) {
    return;
  }
  var siblings = this.$parent.$$children;
  var indexOfThis = siblings.indexOf(this);
  if (indexOfThis >= 0) {
    siblings.splice(indexOfThis, 1);
  }
};

Scope.prototype.$watchCollection = function(watchFn, listenerFn) {
  var self = this,
      newValue,
      oldValue,
      changeCount = 0;

  var internalWatchFn = function(scope) {
    newValue = watchFn(scope);
    if (_.isObject(newValue)) {
      if(_.isArray(newValue)) {
        if(!_.isArray(oldValue)) {
          changeCount++;
          oldValue = [];
        }
        if(newValue.length !== oldValue.length) {
          changeCount++;
          oldValue.length = newValue.length;
        }
        _.forEach(newValue, function(newItem, i) {
          if (!self.$$areEqual(newItem, oldValue[i], false)) {
            changeCount++;
            oldValue[i] = newItem;
          }
        });
      }
      else {

      }
    }
    else {
      if (!self.$$areEqual(newValue, oldValue, false)) {
        changeCount++;
      }
      oldValue = newValue;
    }

    return changeCount;
  };

  var internalListenerFn = function() {
    listenerFn(newValue, oldValue, self);
  };

  return this.$watch(internalWatchFn, internalListenerFn);
};