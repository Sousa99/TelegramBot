var moment = require('moment');

var commandsList = require('../json/commands.json');
var fas = require('../modules/fas.js');
var date_module = require('../modules/date.js');

let classes = require('./classes.js');
let CommandInterface = classes.CommandInterface;

const Tags = require('./tags.js');

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
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;
    
    var total = tags.find(element => element.getName() == 'total') != undefined;

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

function show_tasks_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;
    
    var total = tags.find(element => element.getName() == 'total') != undefined;

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
}

function mark_registry_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let descriptionTag = tags.find(element => element.getName() == 'description');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getRegistryDay(date).then(function(info) {
        var indexes = []
        for (var event_index = 0; event_index < info.length; event_index++)
            if (info[event_index].description == descriptionTag.getValue())
                indexes.push(event_index);
        
        count = indexes.length;
        index = indexes[0];
    
        fas.changeValueRegistry(date, index, count, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(chatId, 'There was a problem marking the registry!', opts);
            else bot.sendMessage(chatId, 'Registry marked <b>successfully</b>!', opts);
        });
    });
}

class StartCommand extends CommandInterface { constructor() { super("Start", start_function) } };
class FasSetupCommand extends CommandInterface { constructor() { super("Fas Setup", fas_setup_function) } };
class FasPrintCommand extends CommandInterface { constructor() { super("Fas Print", fas_print_function) } };
class ShowRegistryCommand extends CommandInterface { constructor() { super("Show Registry", show_registry_function) } };
class ShowTasksCommand extends CommandInterface { constructor() { super("Show Tasks", show_tasks_function) } };

let mark_registry_tags = [ new Tags.value_force('x'), new Tags.blacklist_force(['x', 'X', 'Done']), new Tags.description() ]
class MarkRegistryCommand extends CommandInterface { constructor() { super("Show Tasks", mark_registry_function, mark_registry_tags) } };

const commands = {
    StartCommand: StartCommand,
    FasSetupCommand: FasSetupCommand,
    FasPrintCommand: FasPrintCommand,
    ShowRegistryCommand: ShowRegistryCommand,
    ShowTasksCommand: ShowTasksCommand,

    MarkRegistryCommand: MarkRegistryCommand
}

module.exports = commands;