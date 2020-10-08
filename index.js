process.env.NTBA_FIX_319 = 1; // To disable telegram bot api deprecating warning

var schedule = require('node-schedule');
var logger = require('./modules/logger.js');

schedule_check_registry = false;

var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./json/tokens.json');
var bot = new TelegramBot(tokens.telegram, { polling: true });

const Commands = require('./structural/commands.js');
const opts = { parse_mode: 'HTML' };

logger.log.warn("Initializing Bot");

function createCommandAndRun(CommandReference, opts, msg, match, bot) {
    let command = new CommandReference();

    let inputTags = [];
    if (match[1] != undefined) inputTags = analyseInput(opts, match[1]);

    for (tagIndex in inputTags) {
        let tagName = inputTags[tagIndex]['tag'];
        let tagValue = inputTags[tagIndex]['value'];
        command.setTag(tagName, tagValue);
    }

    command.run(opts, msg, match, bot);
}

bot.onText(/\/start(.*)/, function(msg, match) { createCommandAndRun(Commands.StartCommand, opts, msg, match, bot) });
bot.onText(/\/fas_setup/, function(msg, match) { createCommandAndRun(Commands.FasSetupCommand, opts, msg, match, bot) });
bot.onText(/\/fas_print/, async function(msg, match) { createCommandAndRun(Commands.FasPrintCommand, opts, msg, match, bot) });
bot.onText(/\/show_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowRegistryCommand, opts, msg, match, bot) });
bot.onText(/\/show_tasks(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowTasksCommand, opts, msg, match, bot) });

// SUPPORT FUNCTIONS
bot.on('polling_error', (err) => logger.log.error(err));

function analyseInput(opts, string, bot) {
    var array = string.split(' ').filter(item => item != '');
    var items = [];
    
    for (var index = 0; index < array.length; index++) {
        if (array[index][0] != '-') {
            bot.sendMessage(chatId, 'There was a problem, check your request!', opts);
            return -1;
        } else if (index == array.length - 1 || array[index+1][0] == '-') {
            items.push({'tag': (array[index]).substring(1).toLowerCase()});
        } else {
            var counter = 1;
            var value = '';
            while (index < array.length - counter && array[index + counter][0] != '-') {
                value = value + array[index + counter] + ' ';
                counter++;
            }

            value = value.slice(0, -1);
            items.push({'tag': (array[index]).substring(1).toLowerCase(), 'value': value});
            index += counter - 1;
        }
    }

    return items;
}
/*

bot.onText(/\/mark_registry(.*)/, function(msg, match) {
    logger.log.info('Marking Event on Registry!');
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };
    const tags = analyseInput(chatId, match[1]);
    if (tags == -1) return;

    var date = date_module.processDateTag(chatId, opts, tags);
    fas.getRegistryDay(date).then(function(info) {
        tags.push({'tag': '-value', 'value': 'x'});
        if (info.length == 0) bot.sendMessage(chatId, 'The schedule is empty! Nothing to mark!', opts);
        else getEventDescription(chatId, msg, tags, info, fas.changeValueRegistry, ['x', 'X', 'Done']);
    });
})

bot.onText(/\/unmark_registry(.*)/, function(msg, match) {
    logger.log.info('Unmarking Event on Registry!');
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };
    const tags = analyseInput(chatId, match[1]);
    if (tags == -1) return;

    var date = date_module.processDateTag(chatId, opts, tags);
    fas.getRegistryDay(date).then(function(info) {
        tags.push({'tag': '-value', 'value': ''});
        if (info.length == 0) bot.sendMessage(chatId, 'The schedule is empty! Nothing to unmark!', opts);
        else getEventDescription(chatId, msg, tags, info, fas.changeValueRegistry, ['']);
    });
})

bot.onText(/\/mark_task(.*)/, function(msg, match) {
    logger.log.info('Marking Task!');
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };
    const tags = analyseInput(chatId, match[1]);
    if (tags == -1) return;

    var date = date_module.processDateTag(chatId, opts, tags);
    fas.getTasks(date).then(function(info) {
        tags.push({'tag': '-value', 'value': 'x'});
        getClassTask(chatId, msg, tags, info, fas.changeValueTask, ['x', 'X', 'Done']);
    });
});

bot.onText(/\/unmark_task(.*)/, function(msg, match) {
    logger.log.info('Unmarking Task!');
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };
    const tags = analyseInput(chatId, match[1]);
    if (tags == -1) return;

    var date = date_module.processDateTag(chatId, opts, tags);
    fas.getTasks(date).then(function(info) {
        tags.push({'tag': '-value', 'value': ''});
        getClassTask(chatId, msg, tags, info, fas.changeValueTask, [''])
    });

});

var predefined_chatId;
bot.onText(/\/schedule check-registry/, function(msg) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };

    logger.log.info("Schedule check_registry");
    predefined_chatId = msg.chat.id;
    schedule_check_registry = true;
    
    schedule.scheduleJob('0 20 * * * *', autoRegistry);
    schedule.scheduleJob('0 50 * * * *', autoRegistry);
    bot.sendMessage(chatId, "Schedule check_registry activated");
});

bot.onText(/\/schedule$/, function(msg) {
    logger.log.info('Showing schedules!');
    const opts = { parse_mode: 'HTML' };
    const chatId = msg.chat.id;

    var message = 'This are all the available schedules:\n'
    commands.schedules.map(command => { 
        message += '<b>/schedule ' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(chatId, message, opts);
});

function analyseInput(chatId, string) {
    var array = string.split(' ').filter(item => item != '');
    var items = []
    const opts = { parse_mode: 'HTML' };
    
    for (var index = 0; index < array.length; index++) {
        if (array[index][0] != '-') {
            bot.sendMessage(chatId, 'There was a problem, check your request!', opts);
            return -1;
        } else if (index == array.length - 1 || array[index+1][0] == '-') {
            items.push({'tag': array[index].toLowerCase()});
        } else {
            var counter = 1;
            var value = '';
            while (index < array.length - counter && array[index + counter][0] != '-') {
                value = value + array[index + counter] + ' ';
                counter++;
            }

            value = value.slice(0, -1);
            items.push({'tag': array[index].toLowerCase(), 'value': value});
            index += counter - 1;
        }
    }

    return items;
}

function getClassTask(chatId, msg, tags, info, callback, blacklist = []) {
    const opts = { parse_mode: 'HTML' };
    const opts_keyboard = { parse_mode: 'HTML',
        'reply_markup': {
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: []
        }};

    var date = date_module.processDateTag(chatId, opts, tags);

    var class_tag = tags.find(item => item.tag == '-class');
    var task_tag = tags.find(item => item.tag == '-task');
    var value_tag = tags.find(item => item.tag == '-value');

    if (class_tag == undefined) {
        info.map(class_item => {
            var button = msg.text + ' -class ' + class_item.name;
            opts_keyboard.reply_markup.keyboard.push([button]);
        });

        bot.sendMessage(chatId, 'Choose to which class you wish to mark / unmark a task:', opts_keyboard);

    } else if (task_tag == undefined) {
        var class_item = info.find(item => item.name == class_tag.value);

        class_item.tasks.map(task => {
            if (!blacklist.includes(task.state)) {
                var button = msg.text + ' -task ' + task.name;
                opts_keyboard.reply_markup.keyboard.push([button]);
            }
        });

        if (opts_keyboard.reply_markup.keyboard.length == 0) bot.sendMessage(chatId, 'No tasks available for that change!', opts);
        else bot.sendMessage(chatId, 'Choose which task you wish to mark / unmark :', opts_keyboard);

    } else {
        var class_index = info.findIndex(item => item.name == class_tag.value);
        if (class_index == -1) {
            bot.sendMessage(chatId, 'There was a problem finding the class!', opts);
            return;
        }
        
        var class_item = info[class_index];
        var task_index = class_item.tasks.findIndex(item => item.name == task_tag.value);
        if (task_index == -1) {
            bot.sendMessage(chatId, 'There was a problem finding the task!', opts);
            return;
        }

        if (value_tag == undefined) {
            bot.sendMessage(chatId, 'There was a problem with the value you wish to input!', opts);
            return -1;
        }

        callback(date, class_index, task_index, value_tag.value).then(function(value) {
            if (value == -1) bot.sendMessage(chatId, 'There was a problem marking / unmarking the task!', opts);
            else bot.sendMessage(chatId, 'Task marked / unmarked <b>successfully</b>!', opts);
        })
    }
}

function getEventDescription(chatId, msg, tags, info, callback, blacklist = []) {
    const opts = { parse_mode: 'HTML' };
    const opts_keyboard = { parse_mode: 'HTML',
        'reply_markup': {
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: []
        }};

    var date = date_module.processDateTag(chatId, opts, tags);
    var description_tag = tags.find(item => item.tag == '-desc');
    var value_tag = tags.find(item => item.tag == '-value');

    if (description_tag == undefined) {
        var different_events = []
        info.map(event_item => {
            if (!different_events.includes(event_item.description) && !blacklist.includes(event_item.state)) {
                different_events.push(event_item.description);

                var button = msg.text + ' -desc ' + event_item.description;
                opts_keyboard.reply_markup.keyboard.push([button]);
            }
        });

        if (different_events.length == 0) bot.sendMessage(chatId, 'No events available for that change!', opts);
        else bot.sendMessage(chatId, 'Choose which event you wish to mark / unmark:', opts_keyboard);

    } else {
        var index = []
        for (var event_index = 0; event_index < info.length; event_index++)
            if (info[event_index].description == description_tag.value)
                index.push(event_index);

        if (index == []) {
            bot.sendMessage(chatId, 'There was a problem finding the event!', opts);
            return -1;
        }

        if (value_tag == undefined) {
            bot.sendMessage(chatId, 'There was a problem with the value you wish to input!', opts);
            return -1;
        }

        callback(date, index[0], index.length, value_tag.value).then(function(value) {
            if (value == -1) bot.sendMessage(chatId, 'There was a problem marking / unmarking the task!', opts);
            else bot.sendMessage(chatId, 'Value changed <b>successfully</b>!', opts);
        })
    }
}

function autoRegistry() {
    const opts = { parse_mode: 'HTML' };
    const opts_keyboard = { parse_mode: 'HTML',
        'reply_markup': {
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: []
        }};
    
    fas.checkMarking().then(function(event) {
        if (event == null) return;
        
        var button = '/mark_registry -desc ' + event['class'] + ' -value x';
        opts_keyboard.reply_markup.keyboard.push([button]);
        var button = '/mark_registry -desc ' + event['class'] + ' -value não houve';
        opts_keyboard.reply_markup.keyboard.push([button]);
        var button = 'No Thanks';
        opts_keyboard.reply_markup.keyboard.push([button]);

        var message = 'Do you wish to mark ' + event['class'] + ' class?\n';
        message += 'Room: ' + event['room'];

        bot.sendMessage(predefined_chatId, message, opts_keyboard);
    });
}
*/