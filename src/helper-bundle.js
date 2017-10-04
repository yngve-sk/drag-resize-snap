/* Copypaste from underscorejs source */

let _ = {};

_.isObject = function (obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
};


module.exports = {
    _: _
}