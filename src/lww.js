let LWWManager = require('./lww-manager');

let theManager = new LWWManager();
window.LWWManager = theManager;

module.exports = theManager;