function validateDate(dateString) {
    var date = new Date(dateString)
    return date instanceof Date && !isNaN(date);
}

var processDate = function(chatId, opts, tags) {
    var date = new Date();
    var date_value = tags.find(item => item.tag == '-d')
    if (date_value != undefined) {
        switch(date_value.value) {
            case 'yesterday':
                date.setDate(date.getDate() - 1);
                break;
            case 'last week':
                date.setDate(date.getDate() - 7);
                break;
            
            default:
                if (validateDate(date_value.value)) date = new Date(date_value.value);
                else bot.sendMessage(chatId, 'Date could not be parsed, showing <b>Today</b>!', opts);
        }
    }

    return date;
}

exports.processDate = processDate;