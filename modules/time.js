var moment = require('moment');

function processRelativeKeywords(date, tagValue) {
    var array = tagValue.split(' ');

    if (array.length == 3 && array[0] == 'in' && (number = parseInt(array[1])) != NaN)
        date = date.add(number, array[2]);
    else if (array.length == 3 && array[2] == 'ago' && (number = parseInt(array[0])) != NaN)
        date = date.add(number, array[1]);
    else if (array.length == 2 && array[0] == 'last') {
        date = date.day(array[1]);
        if (!date.isBefore(moment(), 'day'))
            date = date.add(-7, 'day');
    } else if (array.length == 2 && array[0] == 'next') {
        date = date.day(array[1]);
        if (!date.isAfter(moment(), 'day'))
            date = date.add(7, 'day');
    }
    else return -1;
    
    return date;
}

var processDateTag = function(chatId, date, tagValue) {
    var opts = modelForOpts();
    switch(tagValue) {
        case 'yesterday':
            date = date.add(-1, 'day');
            break;
        case 'tomorrow':
            date = date.add(1, 'day');
            break;
        case 'last week':
        case 'previous week':
            date = date.add(-1, 'week');
            break;
        case 'next week':
            date = date.add(1, 'week');
            break;
        
        default:
            date = new moment(tagValue, moment.ISO_8601);
            if (date.isValid()) return;

            date = processRelativeKeywords(date, tagValue);
            if (date == -1) {
                bot.sendMessage(chatId, 'Date could not be parsed, showing <b>Today</b>!', opts['normal']);
                date = new moment();
            }
    }

    return date;
}

var processTimeString = function(str, format) {
    var date = new moment(str, format);
    return date;
}

var getDelta = function(date1, date2, time = 'days') {
    return date1.diff(date2, time);
}

exports.processDateTag = processDateTag;
exports.processTimeString = processTimeString;
exports.getDelta = getDelta;