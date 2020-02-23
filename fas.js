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

async function gsGet(range) {
    const gsapi = google.sheets({version: 'v4', auth: client});

    const opt = {
        spreadsheetId: FAS_ID,
        range: range
    };

    let data = await gsapi.spreadsheets.values.get(opt);
    return data;
}

async function gsPost(range, values) {
    const gsapi = google.sheets({version: 'v4', auth: client});

    const opt = {
        spreadsheetId: FAS_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: values}
    };

    let res = await gsapi.spreadsheets.values.update(opt);
    return res;
}

async function changeValueRegistry(date, index, count, value) {
    var data = await gsGet('REGISTO!C2')
    var base_date = new Date(data.data.values[0]);
    var delta_days = Math.floor(Math.abs(date - base_date) / (1000 * 60 * 60 * 24));
    
    var row = delta_days * 2 + 3;
    var letter = String.fromCharCode('F'.charCodeAt(0) +index);
    
    var range = 'REGISTO!' + letter + row.toString();
    var values = [];
    for (var x = 0; x < count; x++) values.push(value);

    res = await gsPost(range, [values]);
    if (res.statusText != 'OK') return -1;
    
    return 1;
}

async function changeValueTask(date, class_index, task_index, value) {
    var data = await gsGet('REGISTO!C2')
    var base_date = new Date(data.data.values[0]);
    var delta_weeks = Math.floor(Math.abs(date - base_date) / (1000 * 60 * 60 * 24 * 7));
    
    var row = delta_weeks * 12 + 5 + task_index;
    var letter = String.fromCharCode('C'.charCodeAt(0) + 2 * class_index);
    
    var range = 'TAREFAS!' + letter + row.toString();
    res = await gsPost(range, [[value]]);
    if (res.statusText != 'OK') return -1;
    
    return 1;
}

var getRegistryDay = async function(date) {
    var data = await gsGet('REGISTO!C2')

    var base_date = new Date(data.data.values[0]);
    var delta_days = Math.floor(Math.abs(date - base_date) / (1000 * 60 * 60 * 24));

    var row = delta_days * 2 + 2;
    var range = 'REGISTO!F' + row.toString() + ':N' + (row+1).toString();

    data = await gsGet(range);
    var info = []
    if (data.data.values != undefined) {
        for (event_index in data.data.values[0]){
            description = data.data.values[0][event_index];
            if (data.data.values[1] == undefined) state = '';
            else state = data.data.values[1][event_index];

            if (state == undefined) state = '';

            info.push({description: description, state: state})
        }
    }
    
    return info;
}

var markRegistry = async function(date, index, count) {
    return changeValueRegistry(date, index, count, 'x');
}

var unmarkRegistry = async function(date, index, count) {
    return changeValueRegistry(date, index, count, '');
}

var getTasks = async function(date) {
    var data = await gsGet('TAREFAS!B3:O3');
    var classes_name = data.data.values[0].filter(item => item.length != '');
    var classes = []
    for (index in classes_name) classes.push({name: classes_name[index], tasks: []});
    
    var data = await gsGet('REGISTO!C2')
    var base_date = new Date(data.data.values[0]);
    var delta_weeks = Math.floor(Math.abs(date - base_date) / (1000 * 60 * 60 * 24 * 7));
    
    var row = delta_weeks * 12 + 5;
    for (var index = 0; index < classes.length; index++) {
        var letter1 = String.fromCharCode('B'.charCodeAt(0) + 2 * index);
        var letter2 = String.fromCharCode('C'.charCodeAt(0) + 2 * index);
        
        var range = 'TAREFAS!' + letter1 + row.toString() + ':' + letter2 + (row+10).toString();
        data = await gsGet(range);
        if (data.data.values == undefined) continue;
        classes[index]['tasks'] = data.data.values.map(function(item) { 
            var state = item[1];
            if (state == 'x' || state == 'X') state = 'Done';
            else if (state == undefined) state = '';

            return {name: item[0], state: state}
        });
    };
    
    return classes;
}

var markTask = async function(date, class_index, task_index) {
    return changeValueTask(date, class_index, task_index, 'x');
}

var unmarkTask = async function(date, class_index, task_index) {
    return changeValueTask(date, class_index, task_index, '');
}

exports.getRegistryDay = getRegistryDay;
exports.markRegistry = markRegistry;
exports.unmarkRegistry = unmarkRegistry;
exports.getTasks = getTasks;
exports.markTask = markTask;
exports.unmarkTask = unmarkTask;