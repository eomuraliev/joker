/* jshint globalstrict: true */
'use strict';

function setupModuleLoader(window) {
  var ensure = function(obj, name, factory) {
    return obj[name] || (obj[name] = factory());
  };
  var angular = ensure(window, 'angular', Object);

  function createModule(name, requires, modules) {
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid module name';
    }
    var moduleInstance = {
      name: name,
      requires: requires,
      //TODO: constant should be a prototype property
      constant: function(key, value) {
        //TODO: should use `this` instead of referencing `moduleInstance`
        moduleInstance._invokeQueue.push(['constant', [key, value]]);
      },
      _invokeQueue: []
    };
    modules[name] = moduleInstance;
    return moduleInstance;
  }

  function getModule(name, modules) {
    if (modules.hasOwnProperty(name)) {
      return modules[name];
    }
    else {
      throw 'Module ' + name + ' is not available!';
    }
  }

  ensure(angular, 'module', function() {
    var modules = {};
    return function(name, requires) {
      if (requires) {
        return createModule(name, requires, modules);
      }
      else {
        return getModule(name, modules);
      }
    };
  });
}