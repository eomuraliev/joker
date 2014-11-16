/* jshint globalstrict: true */
/* global createInjector: false, setupModuleLoader: false, angular: false */
'use strict';

describe('injector', function() {

  beforeEach(function() {
    delete window.angular;
    setupModuleLoader(window);
  });

  it('can be created', function() {
    var injector = createInjector([]);
    expect(injector).toBeDefined();
  });

  it('has a constant that has been registered to a module', function() {
    var module = angular.module('myModule', []);
    module.constant('A', 42);
    var injector = createInjector(['myModule']);
    expect(injector.has('A')).toBe(true);
  });

  it('does not have a non-registered constant', function() {
    var module = angular.module('myModule', []),
        injector = createInjector([module.name]);
    expect(injector.has('A')).toBe(false);
  });

  it('does not allow constant called hasOwnProperty', function() {
    var module = angular.module('myModule', []);
    module.constant('hasOwnProperty', true);
    expect(function() {
      createInjector(['myModule']);
    }).toThrow();
  });
});