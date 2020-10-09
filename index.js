process.env.NTBA_FIX_319 = 1; // To disable telegram bot api deprecating warning

var schedule = require('node-schedule');
var logger = require('./modules/logger.js');

schedule_check_registry = false;

var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./json/tokens.json');
var bot = new TelegramBot(tokens.telegram, { polling: true });

const ChatInformation = require('./structural/classes.js').ChatInformation;
const Commands = require('./structural/commands.js');
const Tags = require('./structural/tags.js');

function createTextOpts() {
    var opts = { 
        'normal': {parse_mode: 'HTML' },
        'keyboard': {
            parse_mode: 'HTML',
            'reply_markup': {
                hide_keyboard: true,
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: []
            }
        }

    }

    return opts;
};

logger.log.warn("Initializing Bot");
var commandByChatId = {}

function createCommandAndRun(CommandReference, chatInformation) {
    let command = new CommandReference(chatInformation);
    let match = chatInformation.match;

    commandByChatId[chatInformation.chatId] = command;

    let inputTags = [];
    if (match != undefined && match[1] != undefined)
        inputTags = analyseInput(chatInformation.opts, match[1], chatInformation.bot);

    for (tagIndex in inputTags) {
        let tagName = inputTags[tagIndex]['tag'];
        let tagValue = inputTags[tagIndex]['value'];

        let tag = new Tags[tagName](tagValue)
        command.setTag(tag);
    }

    if (command.run())
        commandByChatId[chatInformation.chatId] = undefined;
}

bot.onText(/\/start(.*)/, function(msg, match) { createCommandAndRun(Commands.StartCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/fas_setup/, function(msg, match) { createCommandAndRun(Commands.FasSetupCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/fas_print/, async function(msg, match) { createCommandAndRun(Commands.FasPrintCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/show_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowRegistryCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/show_tasks(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowTasksCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/schedule$/, function(msg) { createCommandAndRun(Commands.ScheduleCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, undefined, bot)) });
bot.onText(/\/schedule check-registry/, function(msg) { createCommandAndRun(Commands.ScheduleCheckRegistryCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, undefined, bot)) });

bot.onText(/\/mark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkRegistryCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/unmark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkRegistryCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/mark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkTaskCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });
bot.onText(/\/unmark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkTaskCommand, new ChatInformation(createTextOpts(), msg.chat.id, msg, match, bot)) });

bot.on('message', function(msg) {

    if (commandByChatId[msg.chat.id] != undefined) {
        let command = commandByChatId[msg.chat.id];
        let activeTag = command.getActiveTag();

        activeTag.setValue(msg.text);
        activeTag.verify(command.getTags(), new ChatInformation(createTextOpts(), msg.chat.id, msg, undefined, bot)).then(function() {
            if (command.run())
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
            bot.sendMessage(chatId, 'There was a problem, check your request!', opts['normal']);
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