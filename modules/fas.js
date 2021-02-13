// FAS FUNCTIONS - GOOGLE SHEETS
var logger = require('./logger.js');
var date_module = require('./date.js');
var moment = require('moment');

const {google} = require('googleapis');
const google_keys = require('../json/google_keys.json')

const client = new google.auth.JWT(
    google_keys.client_email,
    null,
    google_keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);
client.authorize(function(err, tokens) {
    if (err) {
        logger.log.error('FAS: ', err);
        return;
    } else {
        logger.log.info('FAS: Connected to Google API\'s!');
    }
});

var weekDaysPortuguese = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
var weekDaysEnglish = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

async function setupConst(fas_id) {
    base_date = null;
    classes = [];
    schedule = {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}, "Sunday": {}};

    const promise = new Promise((resolve, reject) => {
        gsGet(fas_id, 'REGISTO!D2').then(function(data) {
            base_date = date_module.processDateString(data.data.values[0], "DD-MMM-YYYY");
        });
    
        gsGet(fas_id, 'TAREFAS!B3:O3').then(function(data) {
            var classes_name = data.data.values[0].filter(item => item.length != '');
            for (index in classes_name) classes.push({name: classes_name[index], tasks: []});
        });
    
        gsGet(fas_id, 'HORÁRIO!B2:H2').then(function(data) {
            var weekDays = []
    
            data.data.values[0].map(function(element) {
                var indexOf = weekDaysPortuguese.findIndex(weekDay =>  weekDay == element);
                if (indexOf == -1) logger.log.error("Something went terribly wrong processing weekDays!");
    
                weekDays.push(weekDaysEnglish[indexOf]);
            });
    
            gsGet(fas_id, 'HORÁRIO!A3:H38').then(function(data_class) {
                gsGet(fas_id, 'SALAS!A3:H38').then(function(data_room) {
                    data_class = data_class.data.values;
                    data_room = data_room.data.values;
                    for (var line_index in data_class) {
                        let line_classes = data_class[line_index];
                        let line_rooms = data_room[line_index];
                        let time = line_classes[0];
                        let classes_temp = line_classes.splice(1);
                        let rooms = line_rooms.splice(1);
    
                        for (var key in schedule) schedule[key][time] = null;
                        for (var index in classes_temp) {
                            let event = { 'class': classes_temp[index], 'room': rooms[index] };
    
                            if (classes_temp[index] != '')
                                schedule[weekDays[index]][time] = event;
                        }
                    }
                    
                    info = [base_date, classes, schedule]
                    resolve(info);
                });
            }); 
        });
    });

    return promise;
}

async function gsGet(fas_id, range) {
    const gsapi = google.sheets({version: 'v4', auth: client});

    const opt = {
        spreadsheetId: fas_id,
        range: range
    };

    let data = await gsapi.spreadsheets.values.get(opt);
    return data;
}

async function gsPostUpdate(fas_id, range, values) {
    const gsapi = google.sheets({version: 'v4', auth: client});

    const opt = {
        spreadsheetId: fas_id,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: values}
    };

    let res = await gsapi.spreadsheets.values.update(opt);
    return res;
}

async function gsPostAppend(fas_id, range, values) {
    const gsapi = google.sheets({version: 'v4', auth: client});

    const opt = {
        spreadsheetId: fas_id,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: values}
    };

    let res = await gsapi.spreadsheets.values.append(opt);
    return res;
}

async function changeValueRegistry(fas_id, base_date, date, index, count, value) {
    var delta_days = date_module.getDelta(date, base_date);
    
    var row = delta_days * 2 + 3;
    var letter = String.fromCharCode('F'.charCodeAt(0) + index);
    
    var range = 'REGISTO!' + letter + row.toString();
    var values = [];
    for (var x = 0; x < count; x++) values.push(value);

    res = await gsPostUpdate(fas_id, range, [values]);
    if (res.statusText != 'OK') return -1;
    
    return 1;
}

async function changeValueTask(fas_id, base_date, date, class_index, task_index, value) {
    var delta_weeks = date_module.getDelta(date, base_date, 'weeks');
    
    var row = delta_weeks * 12 + 5 + task_index;
    var letter = String.fromCharCode('C'.charCodeAt(0) + 2 * class_index);
    
    var range = 'TAREFAS!' + letter + row.toString();
    res = await gsPostUpdate(fas_id, range, [[value]]);
    if (res.statusText != 'OK') return -1;
    
    return 1;
}

async function addTask(fas_id, base_date, date, class_index, task_index, task, state) {
    var delta_weeks = date_module.getDelta(date, base_date, 'weeks');
    
    var row = delta_weeks * 12 + 5 + task_index;
    var letter1 = String.fromCharCode('B'.charCodeAt(0) + 2 * class_index);
    var letter2 = String.fromCharCode('C'.charCodeAt(0) + 2 * class_index);
    
    var range = 'TAREFAS!' + letter1 + row.toString() + ':' + letter2 + row.toString();
    res = await gsPostUpdate(fas_id, range, [[task, state]]);
    if (res.statusText != 'OK') return -1;
    
    return 1;
}

var getRegistryDay = async function(fas_id, base_date, date) {
    var delta_days = date_module.getDelta(date, base_date);
    var row = delta_days * 2 + 2;
    var range = 'REGISTO!F' + row.toString() + ':O' + (row+1).toString();

    data = await gsGet(fas_id, range);
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

var checkClassDay = async function(fas_id, base_date, date) {
    var delta_days = date_module.getDelta(date, base_date);
    var row = delta_days * 2 + 2;
    var range = 'REGISTO!C' + row.toString();

    data = await gsGet(fas_id, range);
    var class_day = data.data.values.flat()[0] == 'Aulas';
    return class_day;
}

var getTasks = async function(fas_id, base_date, classes, date) {
    var delta_weeks = date_module.getDelta(date, base_date, 'weeks');;
    
    var row = delta_weeks * 12 + 5;
    for (var index = 0; index < classes.length; index++) {
        var letter1 = String.fromCharCode('B'.charCodeAt(0) + 2 * index);
        var letter2 = String.fromCharCode('C'.charCodeAt(0) + 2 * index);
        
        var range = 'TAREFAS!' + letter1 + row.toString() + ':' + letter2 + (row+10).toString();
        data = await gsGet(fas_id, range);
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

var checkMarking = async function(schedule) {
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

function printSchedule(schedule) {
    var messages = [];
    
    for(var dayIndex in weekDaysEnglish) {
        var day = weekDaysEnglish[dayIndex];
        var newDay = "<b>" + day + "</b>\n";
        
        var lastClass = '';
        for(var time of Object.keys(schedule[day])) {
            if (schedule[day][time] != null && lastClass != schedule[day][time]['class']) {
                lastClass = schedule[day][time]['class'];

                newDay += "\t" + time + ": " + schedule[day][time]['class'];
                if (schedule[day][time]['room'] != null)
                    newDay += " ( <a href=\"" + schedule[day][time]['room'] + "\">Zoom Link</a> )";
                newDay += "\n";
            }
        }

        messages.push(newDay);
    }
    return messages;
}

exports.setupConst = setupConst;
exports.getRegistryDay = getRegistryDay;
exports.checkClassDay = checkClassDay;
exports.getTasks = getTasks;
exports.changeValueRegistry = changeValueRegistry;
exports.changeValueTask = changeValueTask;
exports.addTask = addTask;
exports.checkMarking = checkMarking;
exports.printSchedule =printSchedule;