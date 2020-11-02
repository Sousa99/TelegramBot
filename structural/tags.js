var moment = require('moment');

let classes = require('./classes.js');
let TagInterface = classes.TagInterface;

var fas = require('../modules/fas.js');
var date_module = require('../modules/date.js');

function description_registry_callback(tags, user) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    if (blacklistTag != undefined) blacklist = blacklistTag.getValue();
    else blacklist = [];

    var different_events = []
    fas.getRegistryDay(user.getFasFile(), date).then(function(info) {
        info.map(event_item => {
            if (!different_events.includes(event_item.description) && !blacklist.includes(event_item.state)) {
                different_events.push(event_item.description);

                opts['keyboard'].reply_markup.keyboard.push([event_item.description]);
            }
        });

        if (different_events.length == 0) {
            bot.sendMessage(user.getChatId(), 'No events available for that change!', opts['normal']);
            return true;
        } else {
            bot.sendMessage(user.getChatId(), 'Choose which event:', opts['keyboard']);
            return false;
        }    
    });
}

function class_description_callback(tags, user) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;

    fas.getTasks(user.getFasFile(), date).then(function(info) {
        info.map(class_item => {
            opts['keyboard'].reply_markup.keyboard.push([class_item.name]);
        });

        bot.sendMessage(user.getChatId(), 'Choose which class:', opts['keyboard']);
    });
}

function task_description_callback(tags, user) {
    var opts = modelForOpts();
    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(user.getChatId(), now, dateTag.getValue());
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    if (blacklistTag != undefined) blacklist = blacklistTag.getValue();
    else blacklist = [];

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let classDescription = classDescriptionTag.getValue();

    fas.getTasks(user.getFasFile(), date).then(function(info) {
        var class_item = info.find(item => item.name == classDescription);

        class_item.tasks.map(task => {
            if (!blacklist.includes(task.state))
                opts['keyboard'].reply_markup.keyboard.push([task.name]);
        });

        if (opts['keyboard'].reply_markup.keyboard.length == 0) {
            bot.sendMessage(user.getChatId(), 'No tasks available for that change!', opts['normal']);
            return true;
        } else {
            bot.sendMessage(user.getChatId(), 'Choose which task:', opts['keyboard']);
            return false;
        }   
    });
}

function phrase_callback(tags, user) {
    var opts = modelForOpts();

    bot.sendMessage(user.getChatId(), "What is the phrase?", opts['normal']);
}

function value_callback(tags, user) {
    var opts = modelForOpts();

    bot.sendMessage(user.getChatId(), "What value do you wish to place in the event?", opts['normal']);
}

function new_task_name_callback(tags, user) {
    var opts = modelForOpts();
    bot.sendMessage(user.getChatId(), "How do you wish to name the task?", opts['normal']);
}

class TotalTag extends TagInterface { constructor() { super("total", undefined, undefined, true) } };

class DateTag extends TagInterface { constructor(value) { super("date", undefined, undefined, value) } };
class ValueTag extends TagInterface { constructor(value) { super("value", value_callback, undefined, value) } };
class BlacklistTag extends TagInterface { constructor(value) { super("blacklist", undefined, undefined, value)}}
class DescriptionRegistryTag extends TagInterface { constructor(value) { super("description_registry", description_registry_callback, undefined, value) } };
class ClassDescriptionTag extends TagInterface { constructor(value) { super("class_description", class_description_callback, undefined, value) } };
class TaskDescriptionTag extends TagInterface { constructor(value) { super("task_description", task_description_callback, undefined, value) } };
class NewTaskNameCallback extends TagInterface { constructor(value) { super("new_task_name", new_task_name_callback, undefined, value) } };
class PhraseOfTheDayTag extends TagInterface { constructor(value) { super("phrase", phrase_callback, undefined, value) } };

const commands = {
    'date': DateTag,
    'total': TotalTag,
    'value': ValueTag,
    'blacklist': BlacklistTag,
    'description_registry': DescriptionRegistryTag,
    'class_description': ClassDescriptionTag,
    'task_description': TaskDescriptionTag,
    'new_task_name': NewTaskNameCallback,
    'phrase': PhraseOfTheDayTag,
}

module.exports = commands;