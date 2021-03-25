var moment = require('moment');
var schedule = require('node-schedule');
var fs = require('fs');
var readline = require('readline');

var commandsList = require('../json/commands.json');
var fas = require('../modules/fas.js');
var time_module = require('../modules/time.js');
var logger = require('../modules/logger.js');
var rss_parser = require('../modules/rss-parser.js')

let classes = require('./classes.js');
let CommandInterface = classes.CommandInterface;

const Tags = require('./tags.js');
const ChatInformation = require('./user').ChatInformation;

// --------------- COMMAND FUNCTIONS ---------------

function start_function(tags, user) {
    var opts = modelForOpts();
    var message = 'Hello <b>' + user.getFirstName() + ' ' + user.getLastName() + '</b>,\n';
    bot.sendMessage(user.getChatId(), message, opts['normal']);

    var message = 'This are all the available commands:\n'
    commandsList.available_commands.map(command => { 
        message += '<b>/' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(user.getChatId(), message, opts['normal']);
}

async function fas_setup_function(tags, user) {
    var opts = modelForOpts();
    fas.setupConst(user.getFasFile()).then(function(info) {
        user.setFasBaseDate(info[0]);
        user.setFasClasses(info[1]);
        user.setFasSchedule(info[2]);
        user.setRSSChannels(info[3]);
        bot.sendMessage(user.getChatId(), "Clean Setup Done", opts['normal']);
    });
}

function fas_print_function(tags, user) {
    var opts = modelForOpts();

    var message = "<b>Schedule Check-Registry:</b> " + user.getSchedules().includes('check-registry');
    bot.sendMessage(user.getChatId(), message, opts['normal']);
    var message = "<b>Fas File:</b> " + user.getFasFile();
    bot.sendMessage(user.getChatId(), message, opts['normal']);
    
    var messages = fas.printSchedule(user.getFasSchedule());
    for (message in messages)
        bot.sendMessage(user.getChatId(), messages[message], opts['normal']);
}

function show_registry_function(tags, user) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;
    
    var total = tags.find(element => element.getName() == 'total') != undefined;

    fas.getRegistryDay(user.getFasFile(), user.getFasBaseDate(), date).then(function(info) {
        if (info.length == 0) {
            bot.sendMessage(user.getChatId(), 'There was nothing to register that day!');
            return;
        }

        var perfect = true;
        var message = '';
        for (var activity_index = 0; activity_index < info.length; activity_index++) {
            current_activity = info[activity_index]
            message += '<b>' + current_activity.description + '</b> - ' + current_activity.state + '\n'
            if (!['x', 'X', 'nao houve'].includes(current_activity.state)) perfect = false;
        }

        if (perfect && !total) bot.sendMessage(user.getChatId(), '<b>You attended everything!</b>', opts['normal']);
        else bot.sendMessage(user.getChatId(), message, opts['normal']);
    });
}

function show_tasks_function(tags, user) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;
    
    var total = tags.find(element => element.getName() == 'total') != undefined;

    fas.getTasks(user.getFasFile(), user.getFasBaseDate(), user.getFasClasses(), date).then(function(info) {
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

            if (!perfect) bot.sendMessage(user.getChatId(), message, opts['normal']);
        }
    });
}

function mark_registry_function(tags, user) {
    let successMessage = 'Registry marked <b>successfully</b>!';
    let errorMessage = 'There was a problem marking the registry!';
    changeValueRegistry(tags, user, successMessage, errorMessage);
}

function unmark_registry_function(tags, user) {
    let successMessage = 'Registry unmarked <b>successfully</b>!';
    let errorMessage = 'There was a problem unmarking the registry!';
    changeValueRegistry(tags, user, successMessage, errorMessage);
}

function change_registry_function(tags, user) {
    let successMessage = 'Registry changed <b>successfully</b>!';
    let errorMessage = 'There was a problem changing the registry!';
    changeValueRegistry(tags, user, successMessage, errorMessage);
}

function mark_task_function(tags, user) {
    let successMessage = 'Task marked <b>successfully</b>!';
    let errorMessage = 'There was a problem marking the task!';
    changeValueTask(tags, user, successMessage, errorMessage);
}

function unmark_task_function(tags, user) {
    let successMessage = 'Task unmarked <b>successfully</b>!';
    let errorMessage = 'There was a problem unmarking the task!';
    changeValueTask(tags, user, successMessage, errorMessage);
}

function change_task_function(tags, user) {
    let successMessage = 'Task changed <b>successfully</b>!';
    let errorMessage = 'There was a problem changing the task!';
    changeValueTask(tags, user, successMessage, errorMessage);
}

function add_task_function(tags, user) {
    var opts = modelForOpts();

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskNameTag = tags.find(element => element.getName() == 'new_task_name');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getTasks(user.getFasFile(), user.getFasBaseDate(), user.getFasClasses(), date).then(function(info) {
        var class_index = info.findIndex(item => item.name == classDescriptionTag.getValue());
        var class_item = info[class_index];

        var task_index = class_item.tasks.findIndex(item => ["", undefined, null].includes(item.name));
        if (task_index == -1)
            task_index = class_item.tasks.length

        if (task_index >= 11) {
            bot.sendMessage(user.getChatId(), 'There is no space for more tasks in that class!', opts['normal']);
        } else {
            fas.addTask(user.getFasFile(), user.getFasBaseDate(), date, class_index, task_index, taskNameTag.getValue(), valueTag.getValue()).then(function(value) {
                if (value == -1) bot.sendMessage(user.getChatId(), 'There was a problem adding the task!', opts['normal']);
                else bot.sendMessage(user.getChatId(), 'Task added <b>successfully</b>!', opts['normal']);
            });
        }
    });
}

function schedule_function(tags, user) {
    var opts = modelForOpts();
    var message = 'This are all the available schedules:\n'
    commandsList.schedules.map(command => { 
        message += '<b>/schedule ' + command.tag + '</b>: ' + command.description + '\n'; })
    bot.sendMessage(user.getChatId(), message, opts['normal']);
}

function add_phrase_of_the_day_function(tags, user) {
    var opts = modelForOpts();

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue());
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
            bot.sendMessage(user.getChatId(), "Phrase of the day saved!", opts['normal']);
        }
    });

}

function schedule_check_registry_function(tags, user) {
    var opts = modelForOpts();
    
    if (botInformation.addUserToSchedule('check-registry', user)) {
        user.addSchedule('check-registry');
        bot.sendMessage(user.getChatId(), "Schedule check-registry activated", opts['normal']);
    } else {
        bot.sendMessage(user.getChatId(), "Schedule check-registry already activated", opts['normal']);
    }
}

function schedule_rss_channels_function(tags, user) {
    var opts = modelForOpts();
    
    if (botInformation.addUserToSchedule('rss-channels', user)) {
        user.addSchedule('rss-channels');
        bot.sendMessage(user.getChatId(), "Schedule rss-channels activated", opts['normal']);
    } else {
        bot.sendMessage(user.getChatId(), "Schedule rss-channels already activated", opts['normal']);
    }
}

function set_fas_function(tags, user) {
    var opts = modelForOpts();

    let valueTag = tags.find(element => element.getName() == 'value');
    user.setFasFile(valueTag.getValue());
    fas.setupConst(user.getFasFile()).then(function(info) {
        user.setFasBaseDate(info[0]);
        user.setFasClasses(info[1]);
        user.setFasSchedule(info[2]);
        bot.sendMessage(user.getChatId(), "Fas file set successfully", opts['normal']);
    });
}

function get_fas_function(tags, user) {
    var opts = modelForOpts();

    const reader = readline.createInterface({
        input: fs.createReadStream('./json/setupFas.html'),
        output: process.stdout,
        terminal: false
    });

    reader.on('line', (line) => {
        bot.sendMessage(user.getChatId(), line, opts['normal']);
    });
}

// --------------- VERIFY FUNCTIONS ---------------

function command_fas_verify(tags, user) {
    var opts = modelForOpts();

    if (user.getFasFile() == undefined) {
        chatInformation = user.getChatInformation();
        if (chatInformation == undefined | chatInformation == null)
            chatInformation = new ChatInformation(chatId, undefined, undefined);

        bot.sendMessage(user.getChatId(), "Please set your FAS file first!", opts['normal']);
        global.createCommandAndRun(SetFasCommand, chatInformation, undefined);
        return false;

    } else {
        return true;
    }
}

// --------------- STARTING SCHEDULES ---------------
schedule.scheduleJob('0 20 * * * *', autoRegistry);
schedule.scheduleJob('0 50 * * * *', autoRegistry);
schedule.scheduleJob('0 */5 * * * *', getRSSMessages);

// --------------- SCHEDULE FUNCTIONS ---------------
function autoRegistry() {
    let date = moment();

    usersWithSchedule = botInformation.getUsersWithSchedule('check-registry');
    usersWithSchedule.forEach(chatId => {
        let user = botInformation.getUser(chatId);

        fas.checkClassDay(user.getFasFile(), user.getFasBaseDate(), date).then(function(class_day) {
            if (!class_day) return;

            fas.checkMarking(user.getFasSchedule()).then(function(event) {
                var opts = modelForOpts();
                if (event == null) return;

                var message = 'Do you wish to mark ' + event['class'] + ' class?\n';
                message += 'Room: ' + event['room'];
                let predefinedTags = [ new Tags.description_registry(event['class']) ];

                bot.sendMessage(user.getChatId(), message, opts['keyboard']);
                chatInformation = user.getChatInformation();
                if (chatInformation == undefined | chatInformation == null)
                    chatInformation = new ChatInformation(chatId, undefined, undefined);

                global.createCommandAndRun(ChangeRegistryCommand, chatInformation, predefinedTags);
            });
        });
    });
}

function getRSSMessages() {

    usersWithSchedule = botInformation.getUsersWithSchedule('rss-channels');
    usersWithSchedule.forEach(chatId => {
        let user = botInformation.getUser(chatId);
        let rss_channels = user.getRSSChannels();
        let previous_guids = user.getRSSGuids();

        rss_channels.forEach((channel) => {

            rss_parser.checkChannel(channel, previous_guids).then((rss_messages) => {

                rss_messages.forEach((rss_message) => {
    
                    var opts = modelForOpts();
                    user.addRSSGuid(rss_message.guid);
    
                    message = "<b>" + rss_message.channel + "</b>\n"
                    message += rss_message.title + "\n"
                    message += "--------------------------------\n"
                    message += rss_message.timestamp.format("Do MMMM YYYY, HH:mm:ss") + "\n"
                    message += rss_message.link
    
                    bot.sendMessage(user.getChatId(), message, opts['keyboard']);
                });
            });
        });
    });
}

class StartCommand extends CommandInterface { constructor(user) { super(user, "Start", undefined, start_function) } };
class FasSetupCommand extends CommandInterface { constructor(user) { super(user, "Fas Setup", command_fas_verify, fas_setup_function) } };
class FasPrintCommand extends CommandInterface { constructor(user) { super(user, "Fas Print", command_fas_verify, fas_print_function) } };
class ShowRegistryCommand extends CommandInterface { constructor(user) { super(user, "Show Registry", command_fas_verify, show_registry_function) } };
class ShowTasksCommand extends CommandInterface { constructor(user) { super(user, "Show Tasks", command_fas_verify, show_tasks_function) } };
class ScheduleCommand extends CommandInterface { constructor(user) { super(user, "Schedule", undefined, schedule_function) } };
class ScheduleCheckRegistryCommand extends CommandInterface { constructor(user) { super(user, "Schedule Check Registry", command_fas_verify, schedule_check_registry_function) } };
class ScheduleRSSChannelsCommand extends CommandInterface { constructor(user) { super(user, "Schedule RSS Channels", command_fas_verify, schedule_rss_channels_function) } };

function mark_registry_tags() { return [ new Tags.value('x'), new Tags.blacklist(['x', 'X', 'Done']), new Tags.description_registry() ] };
class MarkRegistryCommand extends CommandInterface { constructor(user) { super(user, "Marking Registry", command_fas_verify, mark_registry_function, mark_registry_tags()) } };
function unmark_registry_tags() { return [ new Tags.value(''), new Tags.blacklist(['']), new Tags.description_registry() ] };
class UnmarkRegistryCommand extends CommandInterface { constructor(user) { super(user, "Unmarking Registry", command_fas_verify, unmark_registry_function, unmark_registry_tags()) } };
function change_registry_tags() { return [ new Tags.description_registry(), new Tags.values_list(['x', 'não houve', '']), new Tags.value() ] };
class ChangeRegistryCommand extends CommandInterface { constructor(user) { super(user, "Changing Registry", command_fas_verify, change_registry_function, change_registry_tags()) } };
function mark_task_tags() { return [ new Tags.value('x'), new Tags.blacklist(['x', 'X', 'Done']), new Tags.class_description(), new Tags.task_description() ] };
class MarkTaskCommand extends CommandInterface { constructor(user) { super(user, "Marking Tasks", command_fas_verify, mark_task_function, mark_task_tags()) } };
function unmark_task_tags() { return [ new Tags.value(''), new Tags.blacklist(['']), new Tags.class_description(), new Tags.task_description() ] };
class UnmarkTaskCommand extends CommandInterface { constructor(user) { super(user, "Unmarking Tasks", command_fas_verify, unmark_task_function, unmark_task_tags()) } };
function change_task_tags() { return [ new Tags.class_description(), new Tags.task_description(), new Tags.values_list(['x', '']), new Tags.value() ] };
class ChangeTaskCommand extends CommandInterface { constructor(user) { super(user, "Changing Tasks", command_fas_verify, change_task_function, change_task_tags()) } };
function new_task_tags() { return [ new Tags.class_description(), new Tags.new_task_name(), new Tags.values_list(['x', '']), new Tags.value() ] };
class AddTaskCommand extends CommandInterface { constructor(user) { super(user, "Adding Task", command_fas_verify, add_task_function, new_task_tags()) } };


function add_phrase_of_the_day_tags() { return [ new Tags.phrase() ] };
class AddPhraseOfTheDayCommand extends CommandInterface { constructor(user) { super(user, "Adding Phrase Of The Day", undefined, add_phrase_of_the_day_function, add_phrase_of_the_day_tags()) } };
function set_fas_tags() { return [ new Tags.value_string('What is the ID of your FAS file?'), new Tags.value() ] };
class SetFasCommand extends CommandInterface { constructor(user) { super(user, "Set Fas File", undefined, set_fas_function, set_fas_tags()) } };
class GetFasCommand extends CommandInterface { constructor(user) { super(user, "Get Fas File", undefined, get_fas_function, undefined) } };

const commands = {
    StartCommand: StartCommand,
    FasSetupCommand: FasSetupCommand,
    FasPrintCommand: FasPrintCommand,
    ShowRegistryCommand: ShowRegistryCommand,
    ShowTasksCommand: ShowTasksCommand,
    ScheduleCommand: ScheduleCommand,
    ScheduleCheckRegistryCommand: ScheduleCheckRegistryCommand,
    ScheduleRSSChannelsCommand: ScheduleRSSChannelsCommand,

    MarkRegistryCommand: MarkRegistryCommand,
    UnmarkRegistryCommand: UnmarkRegistryCommand,
    ChangeRegistryCommand: ChangeRegistryCommand,
    MarkTaskCommand: MarkTaskCommand,
    UnmarkTaskCommand: UnmarkTaskCommand,
    ChangeTaskCommand: ChangeTaskCommand,
    AddTaskCommand: AddTaskCommand,

    AddPhraseOfTheDayCommand: AddPhraseOfTheDayCommand,
    SetFasCommand: SetFasCommand,
    GetFasCommand: GetFasCommand
}

module.exports = commands;

function changeValueRegistry(tags, user, successMessage, errorMessage) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;

    let descriptionTag = tags.find(element => element.getName() == 'description_registry');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getRegistryDay(user.getFasFile(), user.getFasBaseDate(), date).then(function(info) {
        var indexes = []
        for (var event_index = 0; event_index < info.length; event_index++)
            if (info[event_index].description == descriptionTag.getValue())
                indexes.push(event_index);
        
        count = indexes.length;
        index = indexes[0];
    
        fas.changeValueRegistry(user.getFasFile(), user.getFasBaseDate(), date, index, count, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(user.getChatId(), errorMessage, opts['normal']);
            else bot.sendMessage(user.getChatId(), successMessage, opts['normal']);
        });
    });
}

function changeValueTask(tags, user, successMessage, errorMessage) {
    var opts = modelForOpts();

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskDescriptionTag = tags.find(element => element.getName() == 'task_description');
    let valueTag = tags.find(element => element.getName() == 'value');

    fas.getTasks(user.getFasFile(), user.getFasBaseDate(), user.getFasClasses(), date).then(function(info) {
        var class_index = info.findIndex(item => item.name == classDescriptionTag.getValue());

        var class_item = info[class_index];
        var task_index = class_item.tasks.findIndex(item => item.name == taskDescriptionTag.getValue());
        
        fas.changeValueTask(user.getFasFile(), user.getFasBaseDate(), date, class_index, task_index, valueTag.getValue()).then(function(value) {
            if (value == -1) bot.sendMessage(user.getChatId(), errorMessage, opts['normal']);
            else bot.sendMessage(user.getChatId(), successMessage, opts['normal']);
        });
    });
}