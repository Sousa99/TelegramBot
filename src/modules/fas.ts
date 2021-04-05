// FAS FUNCTIONS - GOOGLE SHEETS
import moment from "moment";
import * as logger from './logger';
import * as time_module from './time';
import {google} from 'googleapis';

const google_keys = require('../../json/google_keys.json')

const client = new google.auth.JWT(
    google_keys.client_email,
    undefined,
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

type task_type = { name: string, state: string };
export type class_type = { name: string, tasks: task_type[] };
type event_type = { class: string, room: string };
export type schedule_type = Map<string, Map<string, event_type>>
type registry_info_type = { description: string, state: string };
type info_type = { base_date: moment.Moment, classes: class_type[], schedule: schedule_type, rss_channels: string[] }

export async function setupConst(fas_id: string) : Promise<info_type> {
    let base_date: moment.Moment;
    let classes: class_type[] = [];
    let schedule: schedule_type = new Map<string, Map<string, event_type>>();
    let rss_channels: string[] = [];

    const promise = new Promise<info_type>((resolve, reject) => {
        gsGet(fas_id, 'REGISTO!D2').then(function(data) {
            if (data.data.values != undefined) base_date = time_module.processTimeString(data.data.values[0][0], "DD-MMM-YYYY");
        });
    
        gsGet(fas_id, 'TAREFAS!B3:O3').then(function(data) {
            if (data.data.values != undefined) {
                var classes_name = data.data.values[0].filter(item => item.length != '');
                for (let index in classes_name) classes.push({name: classes_name[index], tasks: []});
            }
        });

        gsGet(fas_id, 'CONFIG!G3:G72').then(function(data) {
            if (data.data.values != undefined) {
                data.data.values.forEach(values_line => {
                    values_line.forEach(value => rss_channels.push(value))
                });
            }
        });
    
        gsGet(fas_id, 'HORÁRIO!B2:H2').then(function(data) {
            var weekDays: string[] = []
    
            if (data.data.values != undefined) {
                data.data.values[0].map(function(element) {
                    var indexOf = weekDaysPortuguese.findIndex(weekDay =>  weekDay == element);
                    if (indexOf == -1) logger.log.error("Something went terribly wrong processing weekDays!");
        
                    let weekday_in_english = weekDaysEnglish[indexOf];
                    weekDays.push(weekday_in_english);
                    schedule.set(weekday_in_english, new Map<string, event_type>())
                });
            }
    
            gsGet(fas_id, 'HORÁRIO!A3:H38').then(function(data_class_return) {
                gsGet(fas_id, 'SALAS!A3:H38').then(function(data_room_return) {
                    let data_class: string[][] | null | undefined = data_class_return.data.values;
                    let data_room: string[][] | null | undefined = data_room_return.data.values;

                    if (data_class != undefined && data_room != undefined) {
                        for (var line_index in data_class) {
                            let line_classes = data_class[line_index];
                            let line_rooms = data_room[line_index];
                            let time = line_classes[0];
                            let classes_temp = line_classes.splice(1);
                            let rooms = line_rooms.splice(1);
                            
                            for (var index in classes_temp) {
                                let event: event_type = { 'class': classes_temp[index], 'room': rooms[index] };
        
                                let weekday: string = weekDays[index]
                                let schedule_for_day = schedule.get(weekday)
                                if (classes_temp[index] != '' && schedule_for_day != undefined) schedule_for_day.set(time, event);
                            }
                        }
                    }
                    
                    let info: info_type = { base_date: base_date, classes: classes, schedule: schedule, rss_channels: rss_channels }
                    resolve(info);
                });
            }); 
        });
    });

    return promise;
}

async function gsGet(fas_id: string, range: string) {
    const gsapi = google.sheets({version: 'v4', auth: client});

    const opt = {
        spreadsheetId: fas_id,
        range: range
    };

    let data = await gsapi.spreadsheets.values.get(opt);
    return data;
}

async function gsPostUpdate(fas_id: string, range: string, values: string[][]) {
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

async function gsPostAppend(fas_id: string, range: string, values: string[]) {
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

export async function changeValueRegistry(fas_id: string, base_date: moment.Moment, date: moment.Moment, index: number, count: number, value: string) : Promise<boolean> {
    var delta_days = time_module.getDelta(date, base_date);
    
    var row = delta_days * 2 + 3;
    var letter = String.fromCharCode('F'.charCodeAt(0) + index);
    
    var range = 'REGISTO!' + letter + row.toString();
    var values : string[] = [];
    for (var x = 0; x < count; x++) values.push(value);

    let res = await gsPostUpdate(fas_id, range, [values]);
    if (res.statusText != 'OK') return false;
    
    return true;
}

export async function changeValueTask(fas_id: string, base_date: moment.Moment, date: moment.Moment, class_index: number, task_index: number, value: string) : Promise<boolean> {
    var delta_weeks = time_module.getDelta(date, base_date, 'weeks');
    
    var row = delta_weeks * 12 + 5 + task_index;
    var letter = String.fromCharCode('C'.charCodeAt(0) + 2 * class_index);
    
    var range = 'TAREFAS!' + letter + row.toString();
    let res = await gsPostUpdate(fas_id, range, [[value]]);
    if (res.statusText != 'OK') return false;
    
    return true;
}

export async function addTask(fas_id: string, base_date: moment.Moment, date: moment.Moment, class_index: number, task_index: number, task: string, state: string) : Promise<boolean> {
    var delta_weeks = time_module.getDelta(date, base_date, 'weeks');
    
    var row = delta_weeks * 12 + 5 + task_index;
    var letter1 = String.fromCharCode('B'.charCodeAt(0) + 2 * class_index);
    var letter2 = String.fromCharCode('C'.charCodeAt(0) + 2 * class_index);
    
    var range = 'TAREFAS!' + letter1 + row.toString() + ':' + letter2 + row.toString();
    let res = await gsPostUpdate(fas_id, range, [[task, state]]);
    if (res.statusText != 'OK') return false;
    
    return true;
}

export async function getRegistryDay(fas_id: string, base_date: moment.Moment, date: moment.Moment) : Promise<registry_info_type[]> {
    var delta_days = time_module.getDelta(date, base_date);
    var row = delta_days * 2 + 2;
    var range = 'REGISTO!F' + row.toString() + ':O' + (row+1).toString();

    let data = await gsGet(fas_id, range);
    var info: registry_info_type[] = []

    if (data.data.values != undefined) {
        for (let event_index in data.data.values[0]){

            let description: string = data.data.values[0][event_index];
            let state: string

            if (data.data.values[1] == undefined) state = '';
            else state = data.data.values[1][event_index];
            if (state == undefined) state = '';

            info.push({description: description, state: state})
        }
    }
    
    return info;
}

export async function checkClassDay(fas_id: string, base_date: moment.Moment, date: moment.Moment) : Promise<boolean> {
    var delta_days = time_module.getDelta(date, base_date);
    var row = delta_days * 2 + 2;
    var range = 'REGISTO!C' + row.toString();

    let data = await gsGet(fas_id, range);
    if (data.data.values == undefined) return false;
    var class_day = data.data.values.flat()[0] == 'Aulas';
    return class_day;
}

export async function getTasks(fas_id: string, base_date: moment.Moment, classes: class_type[], date: moment.Moment) {
    var delta_weeks = time_module.getDelta(date, base_date, 'weeks');;
    
    var row = delta_weeks * 12 + 5;
    for (var index = 0; index < classes.length; index++) {
        var letter1 = String.fromCharCode('B'.charCodeAt(0) + 2 * index);
        var letter2 = String.fromCharCode('C'.charCodeAt(0) + 2 * index);
        
        var range = 'TAREFAS!' + letter1 + row.toString() + ':' + letter2 + (row+10).toString();
        let data = await gsGet(fas_id, range);
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

export async function checkMarking(schedule: schedule_type) : Promise<event_type | null> {
    var day = schedule.get(moment().format('dddd'));
    if (day == undefined) return null;

    var time_nextClass = moment().add(10, 'minutes');
    var time_beforeClass = moment().add(-20, 'minutes');

    var event = day.get(time_nextClass.format('HH:mm:00'));
    if (event == null || event == undefined) return null;

    var event_before = day.get(time_beforeClass.format('HH:mm:00'));
    if (event_before == null || event_before == undefined) return event;

    if (event['class'] != event_before['class']) return event;
    return null;
}

export function printSchedule(schedule: schedule_type) : string[] {
    var messages: string[] = [];
    
    for(var dayIndex in weekDaysEnglish) {
        var day = weekDaysEnglish[dayIndex];
        let schedule_day : Map<string, event_type> | undefined = schedule.get(day);
        if (schedule_day == undefined) continue;

        var newDay = "<b>" + day + "</b>\n";
        let times: string[] = [];
        for (let key in schedule.keys()) times.push(key)
        times = times.sort()
        
        var lastClass = '';
        for (let time in times) {

            let event : event_type | undefined = schedule_day.get(time);
            if (event != undefined && lastClass != event['class']) {
                lastClass = event['class'];
                newDay += "\t" + time + ": " + event['class'];
                if (event['room'] != null) newDay += " ( <a href=\"" + event['room'] + "\">Zoom Link</a> )";
                newDay += "\n";
            }
        }

        messages.push(newDay);
    }
    return messages;
}