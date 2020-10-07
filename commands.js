var logger = require('./logger.js');
var commandsList = require('./commands.json');

let classes = require('./classes.js');
let Tag = classes.Tag;
let Command = classes.Command;

function startFunction(tags, opts, msg, bot) {
    logger.log.info('Starting Bot!');
    let chatId = msg.chat.id;

    var message = 'Hello <b>' + msg.from.first_name + ' ' + msg.from.last_name + '</b>,\n';
    bot.sendMessage(chatId, message, opts);

    var message = 'This are all the available commands:\n'
    commandsList.available_commands.map(command => { 
        message += '<b>/' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(chatId, message, opts);
}

const commands = {
    startCommand: new Command(startFunction, [])
}

module.exports = commands;