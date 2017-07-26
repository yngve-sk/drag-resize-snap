let LWWManager = require('./lww-manager');

let theManager = new LWWManager();

if (typeof require !== 'function')
    window.LWWManager = theManager;

module.exports = theManager;