var commandsList = require('./commands.json');
var fas = require('./fas.js');

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

class StartCommand extends CommandInterface { constructor() { super("Start", start_function) } };
class FasSetupCommand extends CommandInterface { constructor() { super("Fas Setup", fas_setup_function) } };
class FasPrintCommand extends CommandInterface { constructor() { super("Fas Print", fas_print_function) } };

const commands = {
    StartCommand: StartCommand,
    FasSetupCommand: FasSetupCommand,
    FasPrintCommand: FasPrintCommand
}

module.exports = commands;