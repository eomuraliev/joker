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

  it('can return a registered constant', function() {
    var module = angular.module('myModule', []);
    module.constant('A', 42);
    var injector = createInjector([module.name]);
    expect(injector.get('A')).toBe(42);
  });

  it('loads multiple modules', function() {
    var module1 = angular.module('module1', []),
        module2 = angular.module('module2', []);
    module1.constant('A', 42);
    module2.constant('B', 67);
    var injector = createInjector([module1.name, module2.name]);

    expect(injector.has('A')).toBe(true);
    expect(injector.has('B')).toBe(true);
  });

  it('loads required modules of a module', function() {
    var module1 = angular.module('module1', []),
        module2 = angular.module('module2', [module1.name]);
    module1.constant('A', 42);
    module2.constant('B', 67);
    var injector = createInjector([module2.name]);

    expect(injector.has('A')).toBe(true);
    expect(injector.has('B')).toBe(true);
  });

  it('loads the transitively required modules of a module', function() {
    var module1 = angular.module('module1', []),
        module2 = angular.module('module2', [module1.name]),
        module3 = angular.module('module3', [module2.name]);
    module1.constant('A', 42);
    module2.constant('B', 67);
    module3.constant('C', 104);
    var injector = createInjector([module3.name]);

    expect(injector.has('A')).toBe(true);
    expect(injector.has('B')).toBe(true);
    expect(injector.has('B')).toBe(true);
  });

  it('loads each module only once, thus handling circular dependencies', function() {
    var module1 = angular.module('module1', ['module2']),
        module2 = angular.module('module2', [module1.name]);
    createInjector([module1.name]);
  });
});