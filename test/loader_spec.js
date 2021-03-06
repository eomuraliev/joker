/* jshint globalstrict: true */
/* global setupModuleLoader: false */
'use strict';

describe('setupModuleLoader', function() {
  beforeEach(function() {
    delete window.angular;
  });

  it('exposes angular on the window', function() {
    setupModuleLoader(window);
    expect(window.angular).toBeDefined();
  });

  it('creates angular just once', function() {
    setupModuleLoader(window);
    var ng = window.angular;
    setupModuleLoader(window);
    expect(window.angular).toBe(ng);
  });

  it('exposes the angular module function', function() {
    setupModuleLoader(window);
    expect(window.angular.module).toBeDefined();
  });

  it('exposes the angular module function just once', function() {
    var module;
    setupModuleLoader(window);
    module = window.angular.module;
    setupModuleLoader(window);
    expect(window.angular.module).toBe(module);
  });

  describe('modules', function() {

    beforeEach(function() {
      setupModuleLoader(window);
    });

    it('allows registering a module', function() {
      var myModule = window.angular.module('myModule', []);
      expect(myModule).toBeDefined();
      expect(myModule.name).toEqual('myModule');
    });

    it('replaces a module when registered with the same name again', function() {
      var myModule = window.angular.module('myModule', []);
      var newModule = window.angular.module('myModule', []);
      expect(myModule).not.toBe(newModule);
    });

    it('attaches the requires array to the registered module', function() {
      var myModule = window.angular.module('myModule', ['anotherModule']);
      expect(myModule.requires).toEqual(['anotherModule']);
    });

    it('allows getting a module', function() {
      var myModule = window.angular.module('myModule', []);
      var receivedModule = window.angular.module('myModule');
      expect(myModule).toBe(receivedModule);
    });

    it('throws when trying to get a non-existing module', function() {
      expect(function() {
        window.angular.module('nonExistingModule');
      }).toThrow();
    });

    it('does not allow a module to be called `hasOwnProperty`', function() {
      expect(function() {
        window.angular.module('hasOwnProperty', []);
      }).toThrow();
    });
  });

});