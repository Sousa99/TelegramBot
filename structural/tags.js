var moment = require('moment');

let classes = require('./classes.js');
let TagInterface = classes.TagInterface;

var fas = require('../modules/fas.js');

function description_callback(tags, opts, msg, match, bot) {
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
        else bot.sendMessage(chatId, 'Choose which event you wish to mark:', opts_keyboard);
    });
}

class DateInputTag extends TagInterface { constructor(value) { super("date", undefined, undefined, value) } };
class TotalInputTag extends TagInterface { constructor() { super("total", undefined, undefined, true) } };

class ValueForceTag extends TagInterface { constructor(value) { super("value", undefined, undefined, value) } };
class BlacklistForceTag extends TagInterface { constructor(value) { super("blacklist", undefined, undefined, value)}}

class DescriptionTag extends TagInterface { constructor() { super("description", description_callback, undefined, undefined) } };

const commands = {
    'date_input': DateInputTag,
    'total_input': TotalInputTag,

    'value_force': ValueForceTag,
    'blacklist_force': BlacklistForceTag,

    'description': DescriptionTag,
}

module.exports = commands;