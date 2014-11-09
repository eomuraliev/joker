/* jshint globalstrict: true */
'use strict';

_.mixin({
  isArrayLike: function(obj) {
    if(obj === null || obj === undefined) {
      return false;
    }
    //TODO: Rewrite this. It is horrible.
    var length = obj.length;
    return length === 0 ||
      (_.isNumber(length) && length > 0 && (length - 1) in obj);
  }
});