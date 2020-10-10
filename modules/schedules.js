var fas = require('../modules/fas.js');

function autoRegistry() {
    var opts = modelForOpts();
    fas.checkMarking().then(function(event) {
        if (event == null) return;
        
        var button = '/mark_registry -description_registry ' + event['class'] + ' -value x';
        opts['keyboard'].reply_markup.keyboard.push([button]);
        var button = '/mark_registry -description_registry ' + event['class'] + ' -value não houve';
        opts['keyboard'].reply_markup.keyboard.push([button]);
        var button = 'No Thanks';
        opts['keyboard'].reply_markup.keyboard.push([button]);

        var message = 'Do you wish to mark ' + event['class'] + ' class?\n';
        message += 'Room: ' + event['room'];

        for (index in schedule_check_registry_chatIds)
            bot.sendMessage(schedule_check_registry_chatIds[index], message, opts['keyboard']);
    });
}

module.exports = {
    autoRegistry: autoRegistry,
}