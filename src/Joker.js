/* jshint globalstrict: true */
'use strict';

_.mixin({
  isArrayLike: function(obj) {
    if(obj === null || obj === undefined) {
      return false;
    }
    return _.isNumber(obj.length);
  }
});