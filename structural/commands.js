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

    var message = "<b>Schedule Check-Registry:</b> " + shedule_check_registry_chatIds.includes(chatId);
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

    let descriptionTag = tags.find(element => element.getName() == 'description_registry');
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

function unmark_registry_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let descriptionTag = tags.find(element => element.getName() == 'description_registry');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getRegistryDay(date).then(function(info) {
        var indexes = []
        for (var event_index = 0; event_index < info.length; event_index++)
            if (info[event_index].description == descriptionTag.getValue())
                indexes.push(event_index);
        
        count = indexes.length;
        index = indexes[0];
    
        fas.changeValueRegistry(date, index, count, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(chatId, 'There was a problem unmarking the registry!', opts);
            else bot.sendMessage(chatId, 'Registry unmarked <b>successfully</b>!', opts);
        });
    });
}

function mark_task_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskDescriptionTag = tags.find(element => element.getName() == 'task_description');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getTasks(date).then(function(info) {
        var class_index = info.findIndex(item => item.name == classDescriptionTag.getValue());

        var class_item = info[class_index];
        var task_index = class_item.tasks.findIndex(item => item.name == taskDescriptionTag.getValue());


        fas.changeValueTask(date, class_index, task_index, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(chatId, 'There was a problem marking the task!', opts);
            else bot.sendMessage(chatId, 'Task marked <b>successfully</b>!', opts);
        });
    });
}

function unmark_task_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskDescriptionTag = tags.find(element => element.getName() == 'task_description');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getTasks(date).then(function(info) {
        var class_index = info.findIndex(item => item.name == classDescriptionTag.getValue());

        var class_item = info[class_index];
        var task_index = class_item.tasks.findIndex(item => item.name == taskDescriptionTag.getValue());


        fas.changeValueTask(date, class_index, task_index, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(chatId, 'There was a problem unmarking the task!', opts);
            else bot.sendMessage(chatId, 'Task unmarked <b>successfully</b>!', opts);
        });
    });
}

function schedule_function(tags, opts, msg, match, bot) {
    const chatId = msg.chat.id;

    var message = 'This are all the available schedules:\n'
    commandsList.schedules.map(command => { 
        message += '<b>/schedule ' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(chatId, message, opts);
}

var schedule_check_registry_chatIds = [];
function schedule_check_registry_function(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;

    schedule_check_registry_chatIds.push(msg.chat.id);
    
    schedule.scheduleJob('0 20 * * * *', undefined);
    schedule.scheduleJob('0 50 * * * *', undefined);
    bot.sendMessage(chatId, "Schedule check_registry activated");
}

class StartCommand extends CommandInterface { constructor() { super("Start", start_function) } };
class FasSetupCommand extends CommandInterface { constructor() { super("Fas Setup", fas_setup_function) } };
class FasPrintCommand extends CommandInterface { constructor() { super("Fas Print", fas_print_function) } };
class ShowRegistryCommand extends CommandInterface { constructor() { super("Show Registry", show_registry_function) } };
class ShowTasksCommand extends CommandInterface { constructor() { super("Show Tasks", show_tasks_function) } };
class ScheduleCommand extends CommandInterface { constructor() { super("Schedule", schedule_function) } };
class ScheduleCheckRegistryCommand extends CommandInterface { constructor() { super("Schedule Check Registry", schedule_check_registry_function) } };

let mark_registry_tags = [ new Tags.value_force('x'), new Tags.blacklist_force(['x', 'X']), new Tags.description_registry() ]
class MarkRegistryCommand extends CommandInterface { constructor() { super("Marking Registry", mark_registry_function, mark_registry_tags) } };
let unmark_registry_tags = [ new Tags.value_force(''), new Tags.blacklist_force(['']), new Tags.description_registry() ]
class UnmarkRegistryCommand extends CommandInterface { constructor() { super("Unmarking Registry", unmark_registry_function, unmark_registry_tags) } };
let mark_task_tags = [ new Tags.value_force('x'), new Tags.blacklist_force(['x', 'X']), new Tags.class_description(), new Tags.task_description() ]
class MarkTaskCommand extends CommandInterface { constructor() { super("Marking Tasks", mark_task_function, mark_task_tags) } };
let unmark_task_tags = [ new Tags.value_force(''), new Tags.blacklist_force(['']), new Tags.class_description(), new Tags.task_description() ]
class UnmarkTaskCommand extends CommandInterface { constructor() { super("Unmarking Tasks", unmark_task_function, unmark_task_tags) } };

const commands = {
    StartCommand: StartCommand,
    FasSetupCommand: FasSetupCommand,
    FasPrintCommand: FasPrintCommand,
    ShowRegistryCommand: ShowRegistryCommand,
    ShowTasksCommand: ShowTasksCommand,
    ScheduleCommand: ScheduleCommand,
    ScheduleCheckRegistryCommand: ScheduleCheckRegistryCommand,

    MarkRegistryCommand: MarkRegistryCommand,
    UnmarkRegistryCommand: UnmarkRegistryCommand,
    MarkTaskCommand: MarkTaskCommand,
    UnmarkTaskCommand: UnmarkTaskCommand,
}

module.exports = commands;