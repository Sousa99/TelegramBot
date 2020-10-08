process.env.NTBA_FIX_319 = 1; // To disable telegram bot api deprecating warning

var schedule = require('node-schedule');
var logger = require('./modules/logger.js');

schedule_check_registry = false;

var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./json/tokens.json');
var bot = new TelegramBot(tokens.telegram, { polling: true });

const Commands = require('./structural/commands.js');
const Tags = require('./structural/tags.js');
const opts = { parse_mode: 'HTML' };

logger.log.warn("Initializing Bot");
var commandByChatId = {}

function createCommandAndRun(CommandReference, opts, msg, match, bot) {
    let command = new CommandReference();
    commandByChatId[msg.chat.id] = command;

    let inputTags = [];
    if (match[1] != undefined) inputTags = analyseInput(opts, match[1]);

    for (tagIndex in inputTags) {
        let tagName = inputTags[tagIndex]['tag'];
        let tagValue = inputTags[tagIndex]['value'];

        let tag = new Tags[tagName + "_input"](tagValue)
        command.setTag(tag);
    }

    if (command.run(opts, msg, match, bot))
        commandByChatId[msg.chat.id] = undefined;
}

bot.onText(/\/start(.*)/, function(msg, match) { createCommandAndRun(Commands.StartCommand, opts, msg, match, bot) });
bot.onText(/\/fas_setup/, function(msg, match) { createCommandAndRun(Commands.FasSetupCommand, opts, msg, match, bot) });
bot.onText(/\/fas_print/, async function(msg, match) { createCommandAndRun(Commands.FasPrintCommand, opts, msg, match, bot) });
bot.onText(/\/show_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowRegistryCommand, opts, msg, match, bot) });
bot.onText(/\/show_tasks(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowTasksCommand, opts, msg, match, bot) });

bot.onText(/\/mark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkRegistryCommand, opts, msg, match, bot) });
bot.onText(/\/unmark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkRegistryCommand, opts, msg, match, bot) });
bot.onText(/\/mark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkTaskCommand, opts, msg, match, bot) });
bot.onText(/\/unmark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkTaskCommand, opts, msg, match, bot) });

bot.on('message', function(msg) {

    if (commandByChatId[msg.chat.id] != undefined) {
        let command = commandByChatId[msg.chat.id];
        let activeTag = command.getActiveTag();

        activeTag.setValue(msg.text);
        activeTag.verify(command.getTags(), opts, msg, undefined, bot).then(function() {
            if (command.run(opts, msg, undefined, bot))
                commandByChatId[msg.chat.id] = undefined;
        })
    }
})

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