var moment = require('moment');
var schedule = require('node-schedule');
var fs = require('fs');

var commandsList = require('../json/commands.json');
var fas = require('../modules/fas.js');
var date_module = require('../modules/date.js');
var schedules = require('../modules/schedules.js');
var logger = require('../modules/logger.js');

let classes = require('./classes.js');
let CommandInterface = classes.CommandInterface;

const Tags = require('./tags.js');

function start_function(tags, chatInformation) {
    var opts = modelForOpts();
    var message = 'Hello <b>' + chatInformation.msg.from.first_name + ' ' + chatInformation.msg.from.last_name + '</b>,\n';
    bot.sendMessage(chatInformation.chatId, message, opts['normal']);

    var message = 'This are all the available commands:\n'
    commandsList.available_commands.map(command => { 
        message += '<b>/' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(chatInformation.chatId, message, opts['normal']);
}

async function fas_setup_function(tags, chatInformation) {
    var opts = modelForOpts();
    await fas.setupConst();
    bot.sendMessage(chatInformation.chatId, "Clean Setup Done", opts['normal']);
}

function fas_print_function(tags, chatInformation) {
    var opts = modelForOpts();
    var message = "<b>Schedule Check-Registry:</b> " + schedule_check_registry_chatIds.includes(chatInformation.chatId);
    bot.sendMessage(chatInformation.chatId, message, opts['normal']);
    
    var messages = fas.printSchedule();
    for (message in messages)
        bot.sendMessage(chatInformation.chatId, messages[message], opts['normal']);
}

function show_registry_function(tags, chatInformation) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatInformation.chatId, now, dateTag.getValue());
    else date = now;
    
    var total = tags.find(element => element.getName() == 'total') != undefined;

    fas.getRegistryDay(date).then(function(info) {
        if (info.length == 0) {
            bot.sendMessage(chatInformation.chatId, 'There was nothing to register that day!');
            return;
        }

        var perfect = true;
        var message = '';
        for (var activity_index = 0; activity_index < info.length; activity_index++) {
            current_activity = info[activity_index]
            message += '<b>' + current_activity.description + '</b> - ' + current_activity.state + '\n'
            if (!['x', 'X', 'nao houve'].includes(current_activity.state)) perfect = false;
        }

        if (perfect && !total) bot.sendMessage(chatInformation.chatId, '<b>You attended everything!</b>', opts['normal']);
        else bot.sendMessage(chatInformation.chatId, message, opts['normal']);
    });
}

function show_tasks_function(tags, chatInformation) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatInformation.chatId, now, dateTag.getValue());
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

            if (!perfect) bot.sendMessage(chatInformation.chatId, message, opts['normal']);
        }
    });
}

function mark_registry_function(tags, chatInformation) {
    let successMessage = 'Registry marked <b>successfully</b>!';
    let errorMessage = 'There was a problem marking the registry!';
    changeValueRegistry(tags, chatInformation, successMessage, errorMessage);
}

function unmark_registry_function(tags, chatInformation) {
    let successMessage = 'Registry unmarked <b>successfully</b>!';
    let errorMessage = 'There was a problem unmarking the registry!';
    changeValueRegistry(tags, chatInformation, successMessage, errorMessage);
}

function change_registry_function(tags, chatInformation) {
    let successMessage = 'Registry changed <b>successfully</b>!';
    let errorMessage = 'There was a problem changing the registry!';
    changeValueRegistry(tags, chatInformation, successMessage, errorMessage);
}

function mark_task_function(tags, chatInformation) {
    let successMessage = 'Task marked <b>successfully</b>!';
    let errorMessage = 'There was a problem marking the task!';
    changeValueTask(tags, chatInformation, successMessage, errorMessage);
}

function unmark_task_function(tags, chatInformation) {
    let successMessage = 'Task unmarked <b>successfully</b>!';
    let errorMessage = 'There was a problem unmarking the task!';
    changeValueTask(tags, chatInformation, successMessage, errorMessage);
}

function change_task_function(tags, chatInformation) {
    let successMessage = 'Task changed <b>successfully</b>!';
    let errorMessage = 'There was a problem changing the task!';
    changeValueTask(tags, chatInformation, successMessage, errorMessage);
}

function add_task_function(tags, chatInformation) {
    var opts = modelForOpts();

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatInformation.chatId, now, dateTag.getValue());
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskNameTag = tags.find(element => element.getName() == 'new_task_name');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getTasks(date).then(function(info) {
        var class_index = info.findIndex(item => item.name == classDescriptionTag.getValue());
        var class_item = info[class_index];

        var task_index = class_item.tasks.findIndex(item => ["", undefined, null].includes(item.name));
        if (task_index == -1)
            task_index = class_item.tasks.length

        if (task_index >= 11) {
            bot.sendMessage(chatInformation.chatId, 'There is no space for more tasks in that class!', opts['normal']);
        } else {
            fas.addTask(date, class_index, task_index, taskNameTag.getValue(), valueTag.getValue()).then(function(value) {
                if (value == -1) bot.sendMessage(chatInformation.chatId, 'There was a problem adding the task!', opts['normal']);
                else bot.sendMessage(chatInformation.chatId, 'Task added <b>successfully</b>!', opts['normal']);
            });
        }
    });
}

function schedule_function(tags, chatInformation) {
    var opts = modelForOpts();
    var message = 'This are all the available schedules:\n'
    commandsList.schedules.map(command => { 
        message += '<b>/schedule ' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(chatInformation.chatId, message, opts['normal']);
}

function add_phrase_of_the_day_function(tags, chatInformation) {
    var opts = modelForOpts();

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatInformation.chatId, now, dateTag.getValue());
    else date = now;
    
    let dateString = date.format('YYYY - MM - DD');
    let momentString = now.format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
    let phraseTag = tags.find(element => element.getName() == 'phrase');
    let phrase = phraseTag.getValue();

    let string = '{ \"day\": \"' + dateString + '\", \"time\": \"' + momentString + '\", \"phrase\": \"' + phrase + '\"},\n';

    fs.appendFile('./output/phrases.txt', string, function (err) {
        if (err) logger.log.error(err);
        else {
            logger.log.info('Saved phrase of the day');
            bot.sendMessage(chatInformation.chatId, "Phrase of the day saved!", opts['normal']);
        }
    });

}

global.schedule_check_registry_chatIds = [];
function schedule_check_registry_function(tags, chatInformation) {
    var opts = modelForOpts();
    
    if (!schedule_check_registry_chatIds.includes(chatInformation.chatId)) {
        schedule_check_registry_chatIds.push(chatInformation.chatId);
        schedule.scheduleJob('0 20 * * * *', schedules.autoRegistry);
        schedule.scheduleJob('0 50 * * * *', schedules.autoRegistry);
        bot.sendMessage(chatInformation.chatId, "Schedule check_registry activated", opts['normal']);
    } else {
        bot.sendMessage(chatInformation.chatId, "Schedule check_registry already activated", opts['normal']);
    }
}

class StartCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Start", start_function) } };
class FasSetupCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Fas Setup", fas_setup_function) } };
class FasPrintCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Fas Print", fas_print_function) } };
class ShowRegistryCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Show Registry", show_registry_function) } };
class ShowTasksCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Show Tasks", show_tasks_function) } };
class ScheduleCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Schedule", schedule_function) } };
class ScheduleCheckRegistryCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Schedule Check Registry", schedule_check_registry_function) } };

function mark_registry_tags() { return [ new Tags.value('x'), new Tags.blacklist(['x', 'X', 'Done']), new Tags.description_registry() ] };
class MarkRegistryCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Marking Registry", mark_registry_function, mark_registry_tags()) } };
function unmark_registry_tags() { return [ new Tags.value(''), new Tags.blacklist(['']), new Tags.description_registry() ] };
class UnmarkRegistryCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Unmarking Registry", unmark_registry_function, unmark_registry_tags()) } };
function change_registry_tags() { return [ new Tags.description_registry(), new Tags.value() ] };
class ChangeRegistryCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Changing Registry", change_registry_function, change_registry_tags()) } };
function mark_task_tags() { return [ new Tags.value('x'), new Tags.blacklist(['x', 'X', 'Done']), new Tags.class_description(), new Tags.task_description() ] };
class MarkTaskCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Marking Tasks", mark_task_function, mark_task_tags()) } };
function unmark_task_tags() { return [ new Tags.value(''), new Tags.blacklist(['']), new Tags.class_description(), new Tags.task_description() ] };
class UnmarkTaskCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Unmarking Tasks", unmark_task_function, unmark_task_tags()) } };
function change_task_tags() { return [ new Tags.class_description(), new Tags.task_description(), new Tags.value() ] };
class ChangeTaskCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Changing Tasks", change_task_function, change_task_tags()) } };
function new_task_tags() { return [ new Tags.class_description(), new Tags.new_task_name(), new Tags.value() ] };
class AddTaskCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Adding Task", add_task_function, new_task_tags()) } };

function add_phrase_of_the_day_tags() { return [ new Tags.phrase() ] };
class AddPhraseOfTheDayCommand extends CommandInterface { constructor(chatInformation) { super(chatInformation, "Adding Phrase Of The Day", add_phrase_of_the_day_function, add_phrase_of_the_day_tags()) } };

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
    ChangeRegistryCommand: ChangeRegistryCommand,
    MarkTaskCommand: MarkTaskCommand,
    UnmarkTaskCommand: UnmarkTaskCommand,
    ChangeTaskCommand: ChangeTaskCommand,
    AddTaskCommand: AddTaskCommand,

    AddPhraseOfTheDayCommand: AddPhraseOfTheDayCommand,
}

module.exports = commands;

function changeValueRegistry(tags, chatInformation, successMessage, errorMessage) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatInformation.chatId, now, dateTag.getValue());
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
            if (value == -1) bot.sendMessage(chatInformation.chatId, errorMessage, opts['normal']);
            else bot.sendMessage(chatInformation.chatId, successMessage, opts['normal']);
        });
    });
}

function changeValueTask(tags, chatInformation, successMessage, errorMessage) {
    var opts = modelForOpts();

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatInformation.chatId, now, dateTag.getValue());
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskDescriptionTag = tags.find(element => element.getName() == 'task_description');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getTasks(date).then(function(info) {
        var class_index = info.findIndex(item => item.name == classDescriptionTag.getValue());

        var class_item = info[class_index];
        var task_index = class_item.tasks.findIndex(item => item.name == taskDescriptionTag.getValue());
        
        fas.changeValueTask(date, class_index, task_index, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(chatInformation.chatId, errorMessage, opts['normal']);
            else bot.sendMessage(chatInformation.chatId, successMessage, opts['normal']);
        });
    });
}