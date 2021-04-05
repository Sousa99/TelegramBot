import moment from "moment";
import * as schedule from 'node-schedule';
import * as fs from 'fs';
import * as readline from 'readline';

import * as fas from '../modules/fas';
import * as time_module from '../modules/time';
import * as logger from '../modules/logger';
import * as rss_parser from '../modules/rss-parser';

var commandsList : { available_commands: { tag: string, description: string }[], schedules: { tag: string, description: string }[] } = require('../../json/commands.json');
import { CommandInterface, TagInterface } from './classes';
import { ChatInformation, User } from './user';
import { Tags } from './tags';

// --------------- COMMAND FUNCTIONS ---------------

function start_function(tags: TagInterface[], user : User) {
    var opts = global.modelForOpts();
    var message = 'Hello <b>' + user.getFirstName() + ' ' + user.getLastName() + '</b>,\n';
    global.bot.sendMessage(user.getChatId(), message, opts['normal']);

    var message = 'This are all the available commands:\n'
    commandsList.available_commands.map(command => { 
        message += '<b>/' + command.tag + '</b>: ' + command.description + '\n'; })
    global.bot.sendMessage(user.getChatId(), message, opts['normal']);
}

async function fas_setup_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    let fas_file : string | undefined = user.getFasFile();
    if (fas_file == undefined) return;

    fas.setupConst(fas_file).then(function(info) {
        user.setFasBaseDate(info.base_date);
        user.setFasClasses(info.classes);
        user.setFasSchedule(info.schedule);
        user.setRSSChannels(info.rss_channels);
        global.bot.sendMessage(user.getChatId(), "Clean Setup Done", opts['normal']);
    });
}

function fas_print_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    var message = "<b>Schedule Check-Registry:</b> " + user.getSchedules().includes('check-registry');
    global.bot.sendMessage(user.getChatId(), message, opts['normal']);
    var message = "<b>Schedule RSS-Channels:</b> " + user.getSchedules().includes('rss-channels');
    global.bot.sendMessage(user.getChatId(), message, opts['normal']);
    var message = "<b>Fas File:</b> " + user.getFasFile();
    global.bot.sendMessage(user.getChatId(), message, opts['normal']);
    
    let schedule: fas.schedule_type | undefined = user.getFasSchedule();
    if (schedule == undefined) return;

    var messages = fas.printSchedule(schedule);
    for (message in messages) global.bot.sendMessage(user.getChatId(), messages[message], opts['normal']);
}

function show_registry_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;
    
    var total = tags.find(element => element.getName() == 'total') != undefined;

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    if (fas_file == undefined || base_date == undefined || date == undefined) return;
    fas.getRegistryDay(fas_file, base_date, date).then(function(info) {
        if (info.length == 0) {
            global.bot.sendMessage(user.getChatId(), 'There was nothing to register that day!');
            return;
        }

        var perfect = true;
        var message = '';
        for (var activity_index = 0; activity_index < info.length; activity_index++) {
            let current_activity = info[activity_index]
            message += '<b>' + current_activity.description + '</b> - ' + current_activity.state + '\n'
            if (!['x', 'X', 'nao houve'].includes(current_activity.state)) perfect = false;
        }

        if (perfect && !total) global.bot.sendMessage(user.getChatId(), '<b>You attended everything!</b>', opts['normal']);
        else global.bot.sendMessage(user.getChatId(), message, opts['normal']);
    });
}

function show_tasks_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    
    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;

    var total = tags.find(element => element.getName() == 'total') != undefined;

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    let classes: fas.class_type[]| undefined = user.getFasClasses();
    if (fas_file == undefined || base_date == undefined || classes == undefined || date == undefined) return;
    fas.getTasks(fas_file, base_date, classes, date).then(function(info) {
        for (var class_index = 0; class_index < info.length; class_index++) {
            var perfect = true;
            let current_class = info[class_index];

            var message = '<b>' + current_class.name + '</b>\n';
            for (var task_index = 0; task_index < current_class.tasks.length; task_index++) {
                let current_task = current_class.tasks[task_index];
                if (total || current_task.state != 'Done') {
                    message += current_task.name + ' - ' + current_task.state + '\n';
                    perfect = false;
                }
            }

            if (!perfect) global.bot.sendMessage(user.getChatId(), message, opts['normal']);
        }
    });
}

function mark_registry_function(tags: TagInterface[], user: User) {
    let successMessage = 'Registry marked <b>successfully</b>!';
    let errorMessage = 'There was a problem marking the registry!';
    changeValueRegistry(tags, user, successMessage, errorMessage);
}

function unmark_registry_function(tags: TagInterface[], user: User) {
    let successMessage = 'Registry unmarked <b>successfully</b>!';
    let errorMessage = 'There was a problem unmarking the registry!';
    changeValueRegistry(tags, user, successMessage, errorMessage);
}

function change_registry_function(tags: TagInterface[], user: User) {
    let successMessage = 'Registry changed <b>successfully</b>!';
    let errorMessage = 'There was a problem changing the registry!';
    changeValueRegistry(tags, user, successMessage, errorMessage);
}

function mark_task_function(tags: TagInterface[], user: User) {
    let successMessage = 'Task marked <b>successfully</b>!';
    let errorMessage = 'There was a problem marking the task!';
    changeValueTask(tags, user, successMessage, errorMessage);
}

function unmark_task_function(tags: TagInterface[], user: User) {
    let successMessage = 'Task unmarked <b>successfully</b>!';
    let errorMessage = 'There was a problem unmarking the task!';
    changeValueTask(tags, user, successMessage, errorMessage);
}

function change_task_function(tags: TagInterface[], user: User) {
    let successMessage = 'Task changed <b>successfully</b>!';
    let errorMessage = 'There was a problem changing the task!';
    changeValueTask(tags, user, successMessage, errorMessage);
}

function add_task_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    
    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskNameTag = tags.find(element => element.getName() == 'new_task_name');
    let valueTag = tags.find(element => element.getName() == 'value');

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    let classes: fas.class_type[]| undefined = user.getFasClasses();
    if (fas_file == undefined || base_date == undefined || classes == undefined || date == undefined) return;
    fas.getTasks(fas_file, base_date, classes, date).then(function(info) {
        
        if (classDescriptionTag == undefined || taskNameTag == undefined || valueTag == undefined) return;
        let classDescriptionValue = classDescriptionTag.getValue();
        if (fas_file == undefined || base_date == undefined || date == undefined) return;

        var class_index = info.findIndex(item => item.name == classDescriptionValue);
        var class_item = info[class_index];

        var task_index = class_item.tasks.findIndex(item => ["", undefined, null].includes(item.name));
        if (task_index == -1) task_index = class_item.tasks.length

        if (task_index >= 11) {
            global.bot.sendMessage(user.getChatId(), 'There is no space for more tasks in that class!', opts['normal']);
        } else {
            fas.addTask(fas_file, base_date, date, class_index, task_index, taskNameTag.getValue() as string, valueTag.getValue() as string).then(function(value) {
                if (!value) global.bot.sendMessage(user.getChatId(), 'There was a problem adding the task!', opts['normal']);
                else global.bot.sendMessage(user.getChatId(), 'Task added <b>successfully</b>!', opts['normal']);
            });
        }
    });
}

function schedule_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    var message = 'This are all the available schedules:\n'
    commandsList.schedules.map(command => { 
        message += '<b>/schedule ' + command.tag + '</b>: ' + command.description + '\n'; })
    global.bot.sendMessage(user.getChatId(), message, opts['normal']);
}

function add_phrase_of_the_day_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;

    if (date == undefined) return;
    let dateString = date.format('YYYY - MM - DD');
    let momentString = now.format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
    let phraseTag = tags.find(element => element.getName() == 'phrase');
    if (phraseTag == undefined) return;
    let phrase = phraseTag.getValue();

    let string = '{ \"day\": \"' + dateString + '\", \"time\": \"' + momentString + '\", \"phrase\": \"' + phrase + '\"},\n';

    fs.appendFile('../output/phrases.txt', string, function (err) {
        if (err) logger.log.error(err);
        else {
            logger.log.info('Saved phrase of the day');
            global.bot.sendMessage(user.getChatId(), "Phrase of the day saved!", opts['normal']);
        }
    });

}

function schedule_check_registry_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    
    if (global.botInformation.addUserToSchedule('check-registry', user)) {
        user.addSchedule('check-registry');
        global.bot.sendMessage(user.getChatId(), "Schedule check-registry activated", opts['normal']);
    } else {
        global.bot.sendMessage(user.getChatId(), "Schedule check-registry already activated", opts['normal']);
    }
}

function schedule_rss_channels_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    
    if (global.botInformation.addUserToSchedule('rss-channels', user)) {
        user.addSchedule('rss-channels');
        global.bot.sendMessage(user.getChatId(), "Schedule rss-channels activated", opts['normal']);
    } else {
        global.bot.sendMessage(user.getChatId(), "Schedule rss-channels already activated", opts['normal']);
    }
}

function set_fas_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    let fas_file = user.getFasFile();
    let valueTag = tags.find(element => element.getName() == 'value');
    if (fas_file == undefined || valueTag == undefined) return;

    let valueValue = valueTag.getValue();
    user.setFasFile(valueValue as string);
    fas.setupConst(fas_file).then(function(info) {
        user.setFasBaseDate(info.base_date);
        user.setFasClasses(info.classes);
        user.setFasSchedule(info.schedule);
        user.setRSSChannels(info.rss_channels);
        global.bot.sendMessage(user.getChatId(), "Fas file set successfully", opts['normal']);
    });
}

function get_fas_function(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    const reader = readline.createInterface({
        input: fs.createReadStream('../json/setupFas.html'),
        output: process.stdout,
        terminal: false
    });

    reader.on('line', (line) => {
        global.bot.sendMessage(user.getChatId(), line, opts['normal']);
    });
}

// --------------- VERIFY FUNCTIONS ---------------

function command_fas_verify(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    if (user.getFasFile() == undefined) {
        let chatInformation = user.getChatInformation();
        if (chatInformation == undefined) chatInformation = new ChatInformation(user.getChatId(), null, null);

        global.bot.sendMessage(user.getChatId(), "Please set your FAS file first!", opts['normal']);
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

    let usersWithSchedule = global.botInformation.getUsersWithSchedule('check-registry');
    if (usersWithSchedule == undefined) return;

    usersWithSchedule.forEach(chatId => {
        let user = global.botInformation.getUser(chatId);
        if (user == undefined) return;
        let fas_file: string | undefined = user.getFasFile();
        let base_date: moment.Moment | undefined = user.getFasBaseDate();
        let schedule: fas.schedule_type | undefined = user.getFasSchedule();
        if (fas_file == undefined || base_date == undefined || schedule == undefined || date == undefined) return;

        fas.checkClassDay(fas_file, base_date, date).then(function(class_day) {
            if (!class_day || schedule == undefined) return;

            fas.checkMarking(schedule).then(function(event) {
                var opts = global.modelForOpts();
                if (event == null || user == undefined) return;

                var message = 'Do you wish to mark ' + event['class'] + ' class?\n';
                message += 'Room: ' + event['room'];
                let predefinedTags: TagInterface[] = [ new Tags.description_registry(event['class']) ];

                global.bot.sendMessage(user.getChatId(), message, opts['keyboard']);
                let chatInformation = user.getChatInformation();
                if (chatInformation == undefined) chatInformation = new ChatInformation(chatId, null, null);

                global.createCommandAndRun(ChangeRegistryCommand, chatInformation, predefinedTags);
            });
        });
    });
}

function getRSSMessages() {

    let usersWithSchedule = global.botInformation.getUsersWithSchedule('rss-channels');
    if (usersWithSchedule == undefined) return;

    usersWithSchedule.forEach(chatId => {
        let user = global.botInformation.getUser(chatId);
        if (user == undefined) return;
        let rss_channels = user.getRSSChannels();
        if (rss_channels == undefined) return;
        let previous_guids = user.getRSSGuids();

        rss_channels.forEach((channel) => {

            rss_parser.checkChannel(channel, previous_guids).then((rss_messages) => {

                rss_messages.forEach((rss_message) => {
    
                    var opts = global.modelForOpts();
                    if (user == undefined) return;
                    user.addRSSGuid(rss_message.guid);
    
                    let message = "<b>" + rss_message.channel + "</b>\n"
                    message += rss_message.title + "\n"
                    message += "--------------------------------\n"
                    message += rss_message.timestamp.format("Do MMMM YYYY, HH:mm:ss") + "\n"
                    message += rss_message.link
    
                    global.bot.sendMessage(user.getChatId(), message, opts['keyboard']);
                });
            });
        });
    });
}

export class StartCommand extends CommandInterface { constructor(user: User) { super(user, "Start", null, start_function) } };
export class FasSetupCommand extends CommandInterface { constructor(user: User) { super(user, "Fas Setup", command_fas_verify, fas_setup_function) } };
export class FasPrintCommand extends CommandInterface { constructor(user: User) { super(user, "Fas Print", command_fas_verify, fas_print_function) } };
export class ShowRegistryCommand extends CommandInterface { constructor(user: User) { super(user, "Show Registry", command_fas_verify, show_registry_function) } };
export class ShowTasksCommand extends CommandInterface { constructor(user: User) { super(user, "Show Tasks", command_fas_verify, show_tasks_function) } };
export class ScheduleCommand extends CommandInterface { constructor(user: User) { super(user, "Schedule", null, schedule_function) } };
export class ScheduleCheckRegistryCommand extends CommandInterface { constructor(user: User) { super(user, "Schedule Check Registry", command_fas_verify, schedule_check_registry_function) } };
export class ScheduleRSSChannelsCommand extends CommandInterface { constructor(user: User) { super(user, "Schedule RSS Channels", command_fas_verify, schedule_rss_channels_function) } };

function mark_registry_tags() { return [ new Tags.value('x'), new Tags.blacklist(['x', 'X', 'Done']), new Tags.description_registry() ] };
export class MarkRegistryCommand extends CommandInterface { constructor(user: User) { super(user, "Marking Registry", command_fas_verify, mark_registry_function, mark_registry_tags()) } };
function unmark_registry_tags() { return [ new Tags.value(''), new Tags.blacklist(['']), new Tags.description_registry() ] };
export class UnmarkRegistryCommand extends CommandInterface { constructor(user: User) { super(user, "Unmarking Registry", command_fas_verify, unmark_registry_function, unmark_registry_tags()) } };
function change_registry_tags() { return [ new Tags.description_registry(), new Tags.values_list(['x', 'não houve', '']), new Tags.value() ] };
export class ChangeRegistryCommand extends CommandInterface { constructor(user: User) { super(user, "Changing Registry", command_fas_verify, change_registry_function, change_registry_tags()) } };
function mark_task_tags() { return [ new Tags.value('x'), new Tags.blacklist(['x', 'X', 'Done']), new Tags.class_description(), new Tags.task_description() ] };
export class MarkTaskCommand extends CommandInterface { constructor(user: User) { super(user, "Marking Tasks", command_fas_verify, mark_task_function, mark_task_tags()) } };
function unmark_task_tags() { return [ new Tags.value(''), new Tags.blacklist(['']), new Tags.class_description(), new Tags.task_description() ] };
export class UnmarkTaskCommand extends CommandInterface { constructor(user: User) { super(user, "Unmarking Tasks", command_fas_verify, unmark_task_function, unmark_task_tags()) } };
function change_task_tags() { return [ new Tags.class_description(), new Tags.task_description(), new Tags.values_list(['x', '']), new Tags.value() ] };
export class ChangeTaskCommand extends CommandInterface { constructor(user: User) { super(user, "Changing Tasks", command_fas_verify, change_task_function, change_task_tags()) } };
function new_task_tags() { return [ new Tags.class_description(), new Tags.new_task_name(), new Tags.values_list(['x', '']), new Tags.value() ] };
export class AddTaskCommand extends CommandInterface { constructor(user: User) { super(user, "Adding Task", command_fas_verify, add_task_function, new_task_tags()) } };


function add_phrase_of_the_day_tags() { return [ new Tags.phrase() ] };
export class AddPhraseOfTheDayCommand extends CommandInterface { constructor(user: User) { super(user, "Adding Phrase Of The Day", null, add_phrase_of_the_day_function, add_phrase_of_the_day_tags()) } };
function set_fas_tags() { return [ new Tags.value_string('What is the ID of your FAS file?'), new Tags.value() ] };
export class SetFasCommand extends CommandInterface { constructor(user: User) { super(user, "Set Fas File", null, set_fas_function, set_fas_tags()) } };
export class GetFasCommand extends CommandInterface { constructor(user: User) { super(user, "Get Fas File", null, get_fas_function, undefined) } };

function set_mockup(tags: TagInterface[], user: User) {}
export class MockUpCommand extends CommandInterface { constructor(user: User) { super(user, "Mock Up Command", null, set_mockup) } }

function changeValueRegistry(tags: TagInterface[], user: User, successMessage: string, errorMessage: string) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;
    
    let descriptionTag = tags.find(element => element.getName() == 'description_registry');
    let valueTag = tags.find(element => element.getName() == 'value');

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    if (fas_file == undefined || base_date == undefined || date == undefined) return;

    fas.getRegistryDay(fas_file, base_date, date).then(function(info) {
        var indexes = []
        if (descriptionTag == undefined || valueTag == undefined) return;

        for (var event_index = 0; event_index < info.length; event_index++)
            if (info[event_index].description == descriptionTag.getValue())
                indexes.push(event_index);
        
        let count = indexes.length;
        let index = indexes[0];
        if (fas_file == undefined || base_date == undefined || date == undefined) return;
    
        fas.changeValueRegistry(fas_file, base_date, date, index, count, valueTag.getValue() as string).then(function(value) {
            if (!value) global.bot.sendMessage(user.getChatId(), errorMessage, opts['normal']);
            else global.bot.sendMessage(user.getChatId(), successMessage, opts['normal']);
        });
    });
}

function changeValueTask(tags: TagInterface[], user: User, successMessage: string, errorMessage: string) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;
    
    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let taskDescriptionTag = tags.find(element => element.getName() == 'task_description');
    let valueTag = tags.find(element => element.getName() == 'value');

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    let classes: fas.class_type[] | undefined = user.getFasClasses();
    if (fas_file == undefined || base_date == undefined || classes == undefined || date == undefined) return;

    fas.getTasks(fas_file, base_date, classes, date).then(function(info) {

        if (classDescriptionTag == undefined || taskDescriptionTag == undefined || valueTag == undefined) return;
        let classDescriptionValue = classDescriptionTag.getValue();
        let taskDescriptionValue = taskDescriptionTag.getValue();
        let valueValue = valueTag.getValue() as string;
        var class_index = info.findIndex(item => item.name == classDescriptionValue);

        var class_item = info[class_index];
        var task_index = class_item.tasks.findIndex(item => item.name == taskDescriptionValue);
        
        if (fas_file == undefined || base_date == undefined || date == undefined) return;
        fas.changeValueTask(fas_file, base_date, date, class_index, task_index, valueValue).then(function(value) {
            if (!value) global.bot.sendMessage(user.getChatId(), errorMessage, opts['normal']);
            else global.bot.sendMessage(user.getChatId(), successMessage, opts['normal']);
        });
    });
}