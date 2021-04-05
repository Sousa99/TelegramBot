import moment from "moment";
import { SendMessageOptions } from "node-telegram-bot-api";
import * as fas from '../modules/fas';
import * as time_module from '../modules/time';

import { TagInterface } from './classes';
import { User } from "./user";

function description_registry_callback(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    let blacklist : string[] = blacklistTag != undefined ? blacklistTag.getValue() as string[] : [];

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    if (fas_file == undefined || base_date == undefined || date == undefined) return;

    var different_events: string[] = []
    fas.getRegistryDay(fas_file, base_date, date).then(function(info) {
        info.map(event_item => {
            if (!different_events.includes(event_item.description) && !blacklist.includes(event_item.state)) {
                different_events.push(event_item.description);

                opts['keyboard'].reply_markup.keyboard.push([{ text: event_item.description }]);
            }
        });

        if (different_events.length == 0) {
            global.bot.sendMessage(user.getChatId(), 'No events available for that change!', opts['normal']);
            return true;
        } else {
            let test: SendMessageOptions
            global.bot.sendMessage(user.getChatId(), 'Choose which event:', opts['keyboard']);
            return false;
        }    
    });
}

function class_description_callback(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    let classes: fas.class_type[] | undefined = user.getFasClasses();
    if (fas_file == undefined || base_date == undefined || classes == undefined || date == undefined) return;

    fas.getTasks(fas_file, base_date, classes, date).then(function(info) {
        info.map(class_item => {
            opts['keyboard'].reply_markup.keyboard.push([{ text: class_item.name }]);
        });

        global.bot.sendMessage(user.getChatId(), 'Choose which class:', opts['keyboard']);
    });
}

function task_description_callback(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();

    let now = time_module.createNowMoment();
    let date: moment.Moment | undefined;

    let dateTag = tags.find(element => element.getName() == 'date');
    if (dateTag != undefined) date = time_module.processDateTag(user.getChatId(), now, dateTag.getValue() as string);
    else date = now;

    let blacklistTag = tags.find(element => element.getName() == 'blacklist');
    let blacklist : string[] = blacklistTag != undefined ? blacklistTag.getValue() as string[] : [];

    let classDescriptionTag = tags.find(element => element.getName() == 'class_description');
    if (classDescriptionTag == undefined) return;
    let classDescription = classDescriptionTag.getValue();

    let fas_file: string | undefined = user.getFasFile();
    let base_date: moment.Moment | undefined = user.getFasBaseDate();
    let classes: fas.class_type[] | undefined = user.getFasClasses();
    if (fas_file == undefined || base_date == undefined || classes == undefined || date == undefined) return;

    fas.getTasks(fas_file, base_date, classes, date).then(function(info) {
        var class_item = info.find(item => item.name == classDescription);
        if (class_item == undefined) return;

        class_item.tasks.map(task => {
            if (!blacklist.includes(task.state))
                opts['keyboard'].reply_markup.keyboard.push([{ text: task.name }]);
        });

        if (opts['keyboard'].reply_markup.keyboard.length == 0) {
            global.bot.sendMessage(user.getChatId(), 'No tasks available for that change!', opts['normal']);
            return true;
        } else {
            global.bot.sendMessage(user.getChatId(), 'Choose which task:', opts['keyboard']);
            return false;
        }   
    });
}

function phrase_callback(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    global.bot.sendMessage(user.getChatId(), "What is the phrase?", opts['normal']);
}

function value_callback(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    var query = "What value do you wish to place in the event?";
    let valuesListTag = tags.find(element => element.getName() == 'values_list');
    let valueStringTag = tags.find(element => element.getName() == 'value_string');

    if (valueStringTag != undefined) query = valueStringTag.getValue() as string;

    if (valuesListTag != undefined && valuesListTag.getValue() != undefined) {
        let values = valuesListTag.getValue() as string[];
        values.map(valueItem => {
            opts['keyboard'].reply_markup.keyboard.push([{ text: valueItem }]);
        });

        global.bot.sendMessage(user.getChatId(), query, opts['keyboard']);
    } else {
        global.bot.sendMessage(user.getChatId(), query, opts['normal']);
    }
}

function new_task_name_callback(tags: TagInterface[], user: User) {
    var opts = global.modelForOpts();
    global.bot.sendMessage(user.getChatId(), "How do you wish to name the task?", opts['normal']);
}

class TotalTag extends TagInterface { constructor() { super("total", null, null, 'true') } };

class ValuesListTag extends TagInterface { constructor(value: string[] | undefined = undefined) { super("values_list", null, null, value) } };
class ValueStringTag extends TagInterface { constructor(value: string | undefined = undefined) { super("value_string", null, null, value) } };

class DateTag extends TagInterface { constructor(value: string | undefined = undefined) { super("date", null, null, value) } };
class ValueTag extends TagInterface { constructor(value: string | undefined = undefined) { super("value", value_callback, null, value) } };
class BlacklistTag extends TagInterface { constructor(value: string[] | undefined = undefined) { super("blacklist", null, null, value)}}
class DescriptionRegistryTag extends TagInterface { constructor(value: string | undefined = undefined) { super("description_registry", description_registry_callback, null, value) } };
class ClassDescriptionTag extends TagInterface { constructor(value: string | undefined = undefined) { super("class_description", class_description_callback, null, value) } };
class TaskDescriptionTag extends TagInterface { constructor(value: string | undefined = undefined) { super("task_description", task_description_callback, null, value) } };
class NewTaskNameCallback extends TagInterface { constructor(value: string | undefined = undefined) { super("new_task_name", new_task_name_callback, null, value) } };
class PhraseOfTheDayTag extends TagInterface { constructor(value: string | undefined = undefined) { super("phrase", phrase_callback, null, value) } };


type available_tags = 'date' | 'total' | 'value' | 'values_list' | 'value_string' | 'blacklist' | 'description_registry' | 'class_description' | 'task_description' | 'new_task_name' | 'phrase'
type Tags_type = { [k in available_tags]?: any }

export var Tags: Tags_type = {
    ['date']: DateTag,
    ['total']: TotalTag,
    ['value']: ValueTag,
    ['values_list']: ValuesListTag,
    ['value_string']: ValueStringTag,
    ['blacklist']: BlacklistTag,
    ['description_registry']: DescriptionRegistryTag,
    ['class_description']: ClassDescriptionTag,
    ['task_description']: TaskDescriptionTag,
    ['new_task_name']: NewTaskNameCallback,
    ['phrase']: PhraseOfTheDayTag,
}