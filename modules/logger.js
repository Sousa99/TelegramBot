const log = require('simple-node-logger').createRollingFileLogger({
    logDirectory:'logs',
    fileNamePattern:'roll-<DATE>.log',
    dateFormat:'YYYY.MM.DD'
});

exports.log = log;