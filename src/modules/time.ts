import moment from "moment";

function processRelativeKeywords(date: moment.Moment, tagValue: string) : moment.Moment | undefined {
    var array = tagValue.split(' ');

    if (array.length == 3 && array[0] == 'in' && (parseInt(array[1]) != NaN)) {
        let ammount = parseInt(array[1]) as moment.DurationInputArg1;
        let unit = array[2] as moment.unitOfTime.DurationConstructor;
        date = date.add(ammount, unit);

    } else if (array.length == 3 && array[2] == 'ago' && (parseInt(array[0]) != NaN)) {
        let ammount = parseInt(array[0]) as moment.DurationInputArg1;
        let unit = array[1] as moment.unitOfTime.DurationConstructor;
        date = date.subtract(ammount, unit);

    } else if (array.length == 2 && array[0] == 'last') {
        date = date.day(array[1]);
        if (!date.isBefore(moment(), 'day'))
            date = date.add(-7, 'day');

    } else if (array.length == 2 && array[0] == 'next') {
        date = date.day(array[1]);
        if (!date.isAfter(moment(), 'day'))
            date = date.add(7, 'day');
    
    }
    else return undefined;
    
    return date;
}

export function createNowMoment() : moment.Moment {
    return moment();
}

export function processDateTag(chatId: number, date: moment.Moment, tagValue: string) {
    var opts = global.modelForOpts();
    switch(tagValue) {
        case 'yesterday':
            date = date.add(-1, 'day');
            break;
        case 'tomorrow':
            date = date.add(1, 'day');
            break;
        case 'last week':
        case 'previous week':
            date = date.add(-1, 'week');
            break;
        case 'next week':
            date = date.add(1, 'week');
            break;
        
        default:
            date = moment(tagValue, moment.ISO_8601);
            if (date.isValid()) return;

            let return_value : moment.Moment | undefined = processRelativeKeywords(createNowMoment(), tagValue);
            if (moment.isMoment(return_value)) date = return_value
            else {
                global.bot.sendMessage(chatId, 'Date could not be parsed, showing <b>Today</b>!', opts['normal']);
                date = moment();
            } 
    }

    return date;
}

export function processTimeString(str: string | undefined, format: string = '') : moment.Moment {
    let date : moment.Moment;
    
    if (str == undefined) date = moment()
    else date = moment(str, format);
    return date;
}

export function getDelta(date1: moment.Moment, date2: moment.Moment, time: moment.unitOfTime.Diff = 'days') {
    return date1.diff(date2, time);
}