var fas = require('./fas.js');

var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./tokens.json');
var bot = new TelegramBot(tokens.telegram, {polling: true});

bot.onText(/\/fas registry(.*)/, function(msg, match) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };

    var date;
    if (match[1] == '' || match[1] == ' ') date = new Date();
    else if (validateDate(match[1])) date = new Date(match[1]);
    else {
        bot.sendMessage(chatId, "Date could not be parsed, showing <b>Today</b>!", opts);
        date = new Date();
    }

    fas.getRegistryDay(date).then(function(info) {
        if (info.length == 0) {
            bot.sendMessage(chatId, "There was nothing to register that day!");
            return;
        }

        var perfect = true;
        var message = '';
        for (var activity_index = 0; activity_index < info.length; activity_index++) {
            current_activity = info[activity_index]
            message += '<b>' + current_activity.description + '</b> - ' + current_activity.state + '\n'
            if (!['x', 'X', 'nao houve'].includes(current_activity.state)) perfect = false;
        }

        if (perfect) bot.sendMessage(chatId, "<b>You attended everything!</b>", opts);
        else bot.sendMessage(chatId, message, opts);
    });

});

bot.onText(/\/fas tasks(.*)/, function(msg, match) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };

    var date;
    if (match[1] == '' || match[1] == ' ') date = new Date();
    else if (validateDate(match[1])) date = new Date(match[1]);
    else {
        bot.sendMessage(chatId, "Date could not be parsed, showing <b>Today</b>!", opts);
        date = new Date();
    }

    fas.getTasks(date).then(function(info) {
        for (var class_index = 0; class_index < info.length; class_index++) {
            current_class = info[class_index];

            var message = '<b>' + current_class.name + '</b>\n';
            for (var task_index = 0; task_index < current_class.tasks.length; task_index++) {
                current_task = current_class.tasks[task_index];
                if (current_task.state != 'Done') message += current_task.name + ' - ' + current_task.state + '\n'
            }

            bot.sendMessage(chatId, message, opts);
        }
    });

});

// SUPPORT FUNCTIONS

function validateDate(dateString) {
    var date = new Date(dateString)
    return date instanceof Date && !isNaN(date);
}