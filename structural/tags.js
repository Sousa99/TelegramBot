var moment = require('moment');

let classes = require('./classes.js');
let TagInterface = classes.TagInterface;

var fas = require('../modules/fas.js');

function description_registry_callback(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;
    const opts_keyboard = { parse_mode: 'HTML',
        'reply_markup': {
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: []
    }};

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    if (blacklistTag != undefined) blacklist = blacklistTag.getValue();
    else blacklist = [];

    var different_events = []
    fas.getRegistryDay(date).then(function(info) {
        info.map(event_item => {
            if (!different_events.includes(event_item.description) && !blacklist.includes(event_item.state)) {
                different_events.push(event_item.description);

                opts_keyboard.reply_markup.keyboard.push([event_item.description]);
            }
        });

        if (different_events.length == 0) bot.sendMessage(chatId, 'No events available for that change!', opts);
        else bot.sendMessage(chatId, 'Choose which event:', opts_keyboard);
    });
}

function class_description_callback(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;
    const opts_keyboard = { parse_mode: 'HTML',
        'reply_markup': {
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: []
    }};

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    if (blacklistTag != undefined) blacklist = blacklistTag.getValue();
    else blacklist = [];

    fas.getTasks(date).then(function(info) {
        info.map(class_item => {
            opts_keyboard.reply_markup.keyboard.push([class_item.name]);
        });

        bot.sendMessage(chatId, 'Choose which class:', opts_keyboard);
    });
}

function task_description_callback(tags, opts, msg, match, bot) {
    var chatId = msg.chat.id;
    const opts_keyboard = { parse_mode: 'HTML',
        'reply_markup': {
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: []
    }};

    let now = moment();
    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = date_module.processDateTag(chatId, opts, now, dateTag.getValue());
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    if (blacklistTag != undefined) blacklist = blacklistTag.getValue();
    else blacklist = [];

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    let classDescription = classDescriptionTag.getValue();

    fas.getTasks(date).then(function(info) {
        var class_item = info.find(item => item.name == classDescription);

        class_item.tasks.map(task => {
            if (!blacklist.includes(task.state))
                opts_keyboard.reply_markup.keyboard.push([task.name]);
        });

        if (opts_keyboard.reply_markup.keyboard.length == 0) bot.sendMessage(chatId, 'No tasks available for that change!', opts);
        else bot.sendMessage(chatId, 'Choose which task:', opts_keyboard);
    });
}

class DateInputTag extends TagInterface { constructor(value) { super("date", undefined, undefined, value) } };
class TotalInputTag extends TagInterface { constructor() { super("total", undefined, undefined, true) } };

class ValueForceTag extends TagInterface { constructor(value) { super("value", undefined, undefined, value) } };
class BlacklistForceTag extends TagInterface { constructor(value) { super("blacklist", undefined, undefined, value)}}

class DescriptionRegistryTag extends TagInterface { constructor() { super("description_registry", description_registry_callback, undefined, undefined) } };
class ClassDescriptionTag extends TagInterface { constructor() { super("class_description", class_description_callback, undefined, undefined) } };
class TaskDescriptionTag extends TagInterface { constructor() { super("task_description", task_description_callback, undefined, undefined) } };

const commands = {
    'date_input': DateInputTag,
    'total_input': TotalInputTag,

    'value_force': ValueForceTag,
    'blacklist_force': BlacklistForceTag,

    'description_registry': DescriptionRegistryTag,
    'class_description': ClassDescriptionTag,
    'task_description': TaskDescriptionTag,
}

module.exports = commands;