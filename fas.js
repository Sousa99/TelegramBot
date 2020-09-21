// FAS FUNCTIONS - GOOGLE SHEETS
var date_module = require('./date.js');
var moment = require('moment');

const {google} = require('googleapis');
const google_keys = require('./google_keys.json')
const FAS_ID = '1XRXbJt1blT-QBHnjzqKtUylu6uKbcjd-QSH-fRqMQdE'

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

var base_date;
var classes = [];
var schedule = {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}, "Sunday": {}};
setupConst();

function setupConst() {
    gsGet('REGISTO!D2').then(function(data) {
        base_date = date_module.processDateString(data.data.values[0], "DD-MMM-YYYY");
    });

    gsGet('TAREFAS!B3:O3').then(function(data) {
        var classes_name = data.data.values[0].filter(item => item.length != '');
        for (index in classes_name) classes.push({name: classes_name[index], tasks: []});
    });

    gsGet('HORÁRIO!B2:H2').then(function(data) {
        var weekDaysPortuguese = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
        var weekDaysEnglish = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        var weekDays = []

        data.data.values[0].map(function(element) {
            var indexOf = weekDaysPortuguese.findIndex(weekDay =>  weekDay == element);
            if (indexOf == -1) console.log("Something went terribly wrong processing weekDays!");

            weekDays.push(weekDaysEnglish[indexOf]);
        });

        gsGet('HORÁRIO!A3:H38').then(function(data_class) {
            gsGet('SALAS!A3:H38').then(function(data_room) {
                data_class = data_class.data.values;
                data_room = data_room.data.values;
                for (var line_index in data_class) {
                    let line_classes = data_class[line_index];
                    let line_rooms = data_room[line_index];
                    let time = line_classes[0];
                    let classes = line_classes.splice(1);
                    let rooms = line_rooms.splice(1);

                    for (var key in schedule) schedule[key][time] = null;
                    for (var index in classes) {
                        let event = { 'class': classes[index], 'room': rooms[index] };

                        if (classes[index] != '')
                            schedule[weekDays[index]][time] = event;
                    }
                }
            });
        });    
    });
    
}

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
    var delta_days = date_module.getDelta(date, base_date);
    
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
    var delta_weeks = date_module.getDelta(date, base_date, 'weeks');
    
    var row = delta_weeks * 12 + 5 + task_index;
    var letter = String.fromCharCode('C'.charCodeAt(0) + 2 * class_index);
    
    var range = 'TAREFAS!' + letter + row.toString();
    res = await gsPost(range, [[value]]);
    if (res.statusText != 'OK') return -1;
    
    return 1;
}

var getRegistryDay = async function(date) {
    var delta_days = date_module.getDelta(date, base_date);
    var row = delta_days * 2 + 2;
    var range = 'REGISTO!F' + row.toString() + ':O' + (row+1).toString();

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
    var delta_weeks = date_module.getDelta(date, base_date, 'weeks');;
    
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

var checkMarking = async function() {
    var day = schedule[moment().format('dddd')];
    var time_nextClass = moment().add(10, 'minutes');
    var time_beforeClass = moment().add(-20, 'minutes');

    var event = day[time_nextClass.format('HH:mm:00')];
    if (event == null || event == undefined) return null;

    var event_before = day[time_beforeClass.format('HH:mm:00')];
    if (event_before == null || event_before == undefined) return event;

    if (event['class'] != event_before['class']) return event;
    return null;
}

exports.getRegistryDay = getRegistryDay;
exports.markRegistry = markRegistry;
exports.unmarkRegistry = unmarkRegistry;
exports.getTasks = getTasks;
exports.markTask = markTask;
exports.unmarkTask = unmarkTask;
exports.checkMarking = checkMarking;