var TelegramBot = require('node-telegram-bot-api');
var tokens = require('./tokens.json');
var bot = new TelegramBot(tokens.telegram, {polling: true});

bot.onText(/\/fas registry(.*)/, function(msg, match) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };

    var date;
    if (match[1] == '' || match[1] == ' ') date = new Date();
    else if (validateDate(match[1])) date = new Date(match[1]);
    else {
        bot.sendMessage(chatId, "Date could not be parsed, showing <b>Today</b>!", opts);
        date = new Date();
    }

    getRegistryDay(client, date).then(function(info) {
        if (info.length == 0) {
            bot.sendMessage(chatId, "There was nothing to register that day!");
            return;
        }

        var perfect = true;
        var message = '';
        for (var activity_index = 0; activity_index < info.length; activity_index++) {
            current_activity = info[activity_index]
            message += '<b>' + current_activity.description + '</b> - ' + current_activity.state + '\n'
            if (!['x', 'X', 'nao houve'].includes(current_activity.state)) perfect = false;
        }

        if (perfect) bot.sendMessage(chatId, "<b>You attended everything!</b>", opts);
        else bot.sendMessage(chatId, message, opts);
    });

});

bot.onText(/\/fas tasks(.*)/, function(msg, match) {
    var chatId = msg.chat.id;
    const opts = { parse_mode: 'HTML' };

    var date;
    if (match[1] == '' || match[1] == ' ') date = new Date();
    else if (validateDate(match[1])) date = new Date(match[1]);
    else {
        bot.sendMessage(chatId, "Date could not be parsed, showing <b>Today</b>!", opts);
        date = new Date();
    }

    getTasks(client, date).then(function(info) {
        for (var class_index = 0; class_index < info.length; class_index++) {
            current_class = info[class_index];

            var message = '<b>' + current_class.name + '</b>\n';
            for (var task_index = 0; task_index < current_class.tasks.length; task_index++) {
                current_task = current_class.tasks[task_index];
                if (current_task.state != 'Done') message += current_task.name + ' - ' + current_task.state + '\n'
            }

            bot.sendMessage(chatId, message, opts);
        }
    });

});

// SUPPORT FUNCTIONS

function validateDate(dateString) {
    var date = new Date(dateString)
    return date instanceof Date && !isNaN(date);
}

// FAS FUNCTIONS - GOOGLE SHEETS

const {google} = require('googleapis');
const google_keys = require('./google_keys.json')
const FAS_ID = '1WxSZyEqEAxok2joF_Mpckv8yo781pjuQi63kbvIRMmc'

const client = new google.auth.JWT(
    google_keys.client_email,
    null,
    google_keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

client.authorize(function(err, tokens) {
    if (err) {
        console.log(err);
        return;
    } else {
        console.log('Connected to Google API\'s!');
    }
});

async function gsGet(cl, range) {
    const gsapi = google.sheets({version:'v4', auth:cl});

    const opt = {
        spreadsheetId: FAS_ID,
        range: range
    };

    let data = await gsapi.spreadsheets.values.get(opt);
    return data;
}

async function getRegistryDay(cl, date) {
    var data = await gsGet(cl,'REGISTO!C2')

    var base_date = new Date(data.data.values[0]);
    var delta_days = Math.floor(Math.abs(date - base_date) / (1000 * 60 * 60 * 24));

    var row = delta_days * 2 + 2;
    var range = 'REGISTO!F' + row.toString() + ':N' + (row+1).toString();

    data = await gsGet(cl,range);
    var info = []
    if (data.data.values != undefined) {
        for (event_index in data.data.values[0]){
            description = data.data.values[0][event_index];
            state = data.data.values[1][event_index];

            if (state == undefined) state = '';

            info.push({description: description, state: state})
        }
    }
    
    return info;
}

async function getTasks(cl, date) {
    var data = await gsGet(cl, 'TAREFAS!B3:O3');
    var classes_name = data.data.values[0].filter(item => item.length != '');
    var classes = []
    for (index in classes_name) classes.push({name: classes_name[index], tasks: []});
    
    var data = await gsGet(cl,'REGISTO!C2')
    var base_date = new Date(data.data.values[0]);
    var delta_weeks = Math.floor(Math.abs(date - base_date) / (1000 * 60 * 60 * 24 * 7));
    
    var row = delta_weeks * 12 + 5;
    for (var index = 0; index < classes.length; index++) {
        var letter1 = String.fromCharCode('B'.charCodeAt(0) + 2 * index);
        var letter2 = String.fromCharCode('C'.charCodeAt(0) + 2 * index);
        
        var range = 'TAREFAS!' + letter1 + row.toString() + ':' + letter2 + (row+10).toString();
        data = await gsGet(cl,range);
        classes[index]['tasks'] = data.data.values.map(function(item) { 
            var state = item[1];
            if (state == 'x' || state == 'X') state = 'Done';
            else if (state == undefined) state = '';

            return {name: item[0], state: state}
        });
    };
    
    return classes;
}