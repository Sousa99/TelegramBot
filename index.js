var fas = require('./fas.js');

var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./tokens.json');
var bot = new TelegramBot(tokens.telegram, {polling: true});

bot.onText(/\/show_registry(.*)/, function(msg, match) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };
    const tags = analyseInput(match[1]);
    if (tags == -1) return;
    
    var date = new Date();
    var date_value = tags.find(item => item.tag == '-d')
    if (date_value != undefined) {
        if (validateDate(date_value.value)) date = new Date(date_value.value);
        else bot.sendMessage(chatId, "Date could not be parsed, showing <b>Today</b>!", opts);
    }
    
    var total = tags.find(item => item.tag == '-t') != undefined
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

        if (perfect && !total) bot.sendMessage(chatId, "<b>You attended everything!</b>", opts);
        else bot.sendMessage(chatId, message, opts);
    });

});

bot.onText(/\/show_tasks(.*)/, function(msg, match) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };
    const tags = analyseInput(match[1]);
    if (tags == -1) return;

    var date = new Date();
    var date_value = tags.find(item => item.tag == '-d')
    if (date_value != undefined) {
        if (validateDate(date_value.value)) date = new Date(date_value.value);
        else bot.sendMessage(chatId, "Date could not be parsed, showing <b>Today</b>!", opts);
    }

    var total = tags.find(item => item.tag == '-t') != undefined
    fas.getTasks(date).then(function(info) {
        for (var class_index = 0; class_index < info.length; class_index++) {
            var perfect = true;
            current_class = info[class_index];

            var message = '<b>' + current_class.name + '</b>\n';
            for (var task_index = 0; task_index < current_class.tasks.length; task_index++) {
                current_task = current_class.tasks[task_index];
                if (total || current_task.state != 'Done') {
                    message += current_task.name + ' - ' + current_task.state + '\n';
                    perfect = false;
                }
            }

            if (!perfect) bot.sendMessage(chatId, message, opts);
        }
    });

});

// SUPPORT FUNCTIONS

function validateDate(dateString) {
    var date = new Date(dateString)
    return date instanceof Date && !isNaN(date);
}

function analyseInput(string) {
    var array = string.split(" ").filter(item => item != '');
    var items = []
    
    for (var index = 0; index < array.length; index++) {
        if (array[index][0] != '-') {
            bot.sendMessage(chatId, "There was a problem, check your request!", opts);
            return -1;
        } else if (index == array.length - 1 || array[index+1][0] == '-') {
            items.push({"tag": array[index].toLowerCase()});
        } else {
            items.push({"tag": array[index].toLowerCase(), "value": array[index + 1]});
            index ++;
        }
    }

    return items;
}