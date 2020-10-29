process.env.NTBA_FIX_319 = 1; // To disable telegram bot api deprecating warning
var logger = require('./modules/logger.js');

var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./json/tokens.json');

let telegramToken = tokens['telegram'];
const isDebugEnvFlag = process.env.NODE_ENV === 'debug';
if (isDebugEnvFlag) telegramToken = tokens['telegram-debug'];

const BotInformation = require('./structural/user.js').BotInformation;
const User = require('./structural/user.js').User;
const ChatInformation = require('./structural/user.js').ChatInformation;

const Commands = require('./structural/commands.js');
const Tags = require('./structural/tags.js');
const { chat } = require('googleapis/build/src/apis/chat');

availableSchedules = ['check-registry']
global.botInformation = new BotInformation(availableSchedules);
global.bot = new TelegramBot(telegramToken, { polling: true });
global.modelForOpts = function() {
    return {
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
}

logger.log.warn("Initializing Bot");

function createCommandAndRun(CommandReference, chatInformation, predefinedTags) {
    let user = botInformation.getUser(chatInformation.chatId);
    if (user == undefined) botInformation.addUser(new User(
            chatInformation.chatId,
            chatInformation.msg.from.first_name,
            chatInformation.msg.from.last_name
        ));

    user.setChatInformation(chatInformation);
    let command = new CommandReference(user);
    let match = chatInformation.match;

    botInformation.setCommandToChatId(user.getChatId(), command);

    let inputTags = [];
    if (match != undefined && match[1] != undefined)
        inputTags = analyseInput(match[1]);

    for (tagIndex in inputTags) {
        let tagName = inputTags[tagIndex]['tag'];
        let tagValue = inputTags[tagIndex]['value'];

        let tag = new Tags[tagName](tagValue)
        command.setTag(tag);
    }

    for (tagIndex in predefinedTags) command.setTag(predefinedTags[tagIndex]);
    if (command.run()) botInformation.setCommandToChatId(user.getChatId(), undefined);
}
global.createCommandAndRun = createCommandAndRun;

bot.onText(/\/start(.*)/, function(msg, match) { createCommandAndRun(Commands.StartCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/fas_setup/, function(msg, match) { createCommandAndRun(Commands.FasSetupCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/fas_print/, async function(msg, match) { createCommandAndRun(Commands.FasPrintCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/show_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/show_tasks(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowTasksCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/schedule$/, function(msg) { createCommandAndRun(Commands.ScheduleCommand, new ChatInformation(msg.chat.id, msg, undefined)) });
bot.onText(/\/schedule check-registry/, function(msg) { createCommandAndRun(Commands.ScheduleCheckRegistryCommand, new ChatInformation(msg.chat.id, msg, undefined)) });

bot.onText(/\/mark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/unmark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/change_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ChangeRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/mark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/unmark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/change_task(.*)/, function(msg, match) { createCommandAndRun(Commands.ChangeTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/add_task(.*)/, function(msg, match) { createCommandAndRun(Commands.AddTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });

bot.onText(/\phrase_of_the_day(.*)/, function(msg, match) { createCommandAndRun(Commands.AddPhraseOfTheDayCommand, new ChatInformation(msg.chat.id, msg, match)) });

bot.on('message', function(msg) {
    let user = botInformation.getUser(chatInformation.chatId);
    if (user == undefined) botInformation.addUser(new User(
            chatInformation.chatId,
            chatInformation.msg.from.first_name,
            chatInformation.msg.from.last_name
        ));

    if (msg.text[0] == '/') {
        botInformation.setCommandToChatId(user.getChatId(), undefined);
    } else if ((command = botInformation.getCommandByChatId(user.getChatId())) != undefined) {
        let activeTag = command.getActiveTag();
        
        activeTag.setValue(msg.text);
        activeTag.verify(command.getTags(), new ChatInformation(msg.chat.id, msg, undefined)).then(function() {
            if (command.run())
                botInformation.setCommandToChatId(user.getChatId(), undefined);
        })
    }
})

// SUPPORT FUNCTIONS
bot.on('polling_error', (err) => logger.log.error(err));

function analyseInput(string) {
    var array = string.split(' ').filter(item => item != '');
    var items = [];
    var opts = modelForOpts();
    
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