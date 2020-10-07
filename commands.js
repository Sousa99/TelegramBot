var moment = require('moment');

var commandsList = require('./commands.json');
var fas = require('./fas.js');
var date_module = require('./date.js');

let classes = require('./classes.js');
let CommandInterface = classes.CommandInterface;

function start_function(tags, opts, msg, match, bot) {
    let chatId = msg.chat.id;

    var message = 'Hello <b>' + msg.from.first_name + ' ' + msg.from.last_name + '</b>,\n';
    bot.sendMessage(chatId, message, opts);

    var message = 'This are all the available commands:\n'
    commandsList.available_commands.map(command => { 
        message += '<b>/' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(chatId, message, opts);
}

async function fas_setup_function(tags, opts, msg, match, bot) {
    let chatId = msg.chat.id;
    await fas.setupConst();
    bot.sendMessage(chatId, "Clean Setup Done", opts);
}

function fas_print_function(tags, opts, msg, match, bot) {
    let chatId = msg.chat.id;

    var message = "<b>Schedule Check-Registry:</b> " + schedule_check_registry;
    bot.sendMessage(chatId, message, opts);
    
    var messages = fas.printSchedule();
    for (message in messages)
        bot.sendMessage(chatId, messages[message], opts);
}

function show_registry_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    let now = moment();
    let dateTag = tags.find(element => element['tag'] == 'd');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag['value']);
    else date = now;
    
    var total = tags.find(element => element['tag'] == 't') != undefined;

    fas.getRegistryDay(date).then(function(info) {
        if (info.length == 0) {
            bot.sendMessage(chatId, 'There was nothing to register that day!');
            return;
        }

        var perfect = true;
        var message = '';
        for (var activity_index = 0; activity_index < info.length; activity_index++) {
            current_activity = info[activity_index]
            message += '<b>' + current_activity.description + '</b> - ' + current_activity.state + '\n'
            if (!['x', 'X', 'nao houve'].includes(current_activity.state)) perfect = false;
        }

        if (perfect && !total) bot.sendMessage(chatId, '<b>You attended everything!</b>', opts);
        else bot.sendMessage(chatId, message, opts);
    });
}

class StartCommand extends CommandInterface { constructor() { super("Start", start_function) } };
class FasSetupCommand extends CommandInterface { constructor() { super("Fas Setup", fas_setup_function) } };
class FasPrintCommand extends CommandInterface { constructor() { super("Fas Print", fas_print_function) } };
class ShowRegistryCommand extends CommandInterface { constructor() { super("Show Registry", show_registry_function) } };

const commands = {
    StartCommand: StartCommand,
    FasSetupCommand: FasSetupCommand,
    FasPrintCommand: FasPrintCommand,
    ShowRegistryCommand: ShowRegistryCommand
}

module.exports = commands;