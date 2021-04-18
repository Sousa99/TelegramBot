import moment = require('moment');
import TelegramBot = require('node-telegram-bot-api');
import { Serializable, JsonProperty } from 'typescript-json-serializer';

import { class_type, schedule_type, event_type } from '../modules/fas';
import { MockUpCommand } from './commands';

export class ChatInformation {
    chatId: number;
    msg: TelegramBot.Message | null;
    match: RegExpExecArray | null;

    constructor(chatId: number, msg: TelegramBot.Message | null, match: RegExpExecArray | null) {
        this.chatId = chatId;
        this.msg = msg;
        this.match = match;
    }

    getChatId() { return this.chatId; }
    getMsg() { return this.msg; }
    getMatch() { return this.match; }
}

// ============== START CONVERSION FUNCTIONS ==============
type SubFasScheduleObject = {"key": string, "value": event_type};
type FasScheduleObject = {"key": string, "value": SubFasScheduleObject[]};

const convertFasScheduleToObject = (schedule : schedule_type) : FasScheduleObject[] => {
    let dataObject : FasScheduleObject[] = [];
    schedule.forEach((value: Map<string, event_type>, key: string) => {
        let new_entry : FasScheduleObject = { "key": key, "value": []};
        value.forEach((sub_value: event_type, sub_key: string) => {
            let new_sub_entry : SubFasScheduleObject = {"key": sub_key, "value": sub_value};
            new_entry.value.push(new_sub_entry);
        })

        dataObject.push(new_entry);
    })

    return dataObject;
}

const convertObjectToFasSchedule = (object : FasScheduleObject[]) : schedule_type => {
    let map : schedule_type = new Map<string, Map<string, event_type>>();
    object.forEach((entry : FasScheduleObject) => {
        let sub_map : Map<string, event_type> = new Map<string, event_type>();
        entry.value.forEach((sub_entry: SubFasScheduleObject) => {
            sub_map.set(sub_entry.key, sub_entry.value);
        })
        map.set(entry.key, sub_map);
    })

    return map;
}

// ============== END CONVERSION FUNCTIONS ==============

@Serializable()
export class User {
    @JsonProperty() chatId: number;
    @JsonProperty() firstName: string;
    @JsonProperty() lastName: string | undefined;
    @JsonProperty() schedules: string[];
    @JsonProperty() fasFile: string | undefined;
    @JsonProperty() fasBaseDate: moment.Moment | undefined;
    @JsonProperty() fasClasses: class_type[] | undefined;
    @JsonProperty() rssChannels: string[] | undefined;
    @JsonProperty() rssGuids: string[];
    // Stored with different treatment
    @JsonProperty({ beforeDeserialize: convertObjectToFasSchedule, afterSerialize: convertFasScheduleToObject})
    fasSchedule: schedule_type | undefined;
    // Not stored information
    lastChatInformation: ChatInformation | undefined;

    constructor(chatId: number, firstName: string, lastName: string | undefined) {
        this.chatId = chatId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.schedules = [];

        this.fasFile = undefined;
        this.fasBaseDate = undefined;
        this.fasClasses = undefined;
        this.fasSchedule = undefined;
        this.rssChannels = undefined
        this.rssGuids = [];
        this.lastChatInformation = undefined;
    }

    hasChatId(chatId: number) { return this.chatId == chatId; }
    hasSchedule(schedule: string) { return this.schedules.includes(schedule); }
    getChatId() { return this.chatId; }
    getFirstName() { return this.firstName; }
    getLastName() { return this.lastName; }
    getFasBaseDate() { return this.fasBaseDate; }
    getFasClasses() { return this.fasClasses; }
    getFasSchedule() { return this.fasSchedule; }
    getRSSChannels() { return this.rssChannels; }
    getRSSGuids() { return this.rssGuids; }
    getSchedules() { return this.schedules; }
    getFasFile() { return this.fasFile; }
    getChatInformation() { return this.lastChatInformation; }

    addSchedule(newSchedule: string) { this.schedules.push(newSchedule); }
    addRSSGuid(newGuid: string) { this.rssGuids.push(newGuid); }

    setFasFile(fasFile: string) { this.fasFile = fasFile; }
    setFasBaseDate(base_date: moment.Moment) { this.fasBaseDate = base_date; }
    setFasClasses(classes: class_type[]) { this.fasClasses = classes; }
    setFasSchedule(schedule: schedule_type) { this.fasSchedule = schedule; }
    setRSSChannels(channels: string[]) { this.rssChannels = channels; }
    setChatInformation(chatInformation: ChatInformation | undefined) { this.lastChatInformation = chatInformation; }
}

// ============== START CONVERSION FUNCTIONS ==============
type MapScheduleObject = {"key": string, "value": number[]}

const convertMapSchedulesToObject = (map : Map<string, number[]>) : MapScheduleObject[] => {
    let dataObject : MapScheduleObject[] = [];
    map.forEach((value: number[], key: string) => {
        let new_entry : MapScheduleObject = { "key": key, "value": value};
        dataObject.push(new_entry);
    })

    return dataObject;
}

const convertObjectToMapSchedules = (object : MapScheduleObject[]) : Map<string, number[]> => {
    let map : Map<string, number[]> = new Map<string, number[]>();
    object.forEach((entry : MapScheduleObject) => {
        map.set(entry.key, entry.value);
    })

    return map;
}

// ============== END CONVERSION FUNCTIONS ==============

export class BotInformation {
    @JsonProperty({ type: User }) users: Array<User>;
    // Stored with different treatment
    @JsonProperty({ beforeDeserialize: convertObjectToMapSchedules, afterSerialize: convertMapSchedulesToObject })
    schedules: Map<string, number[]>;
    // Not stored information
    commands: Map<number, MockUpCommand>;

    constructor(schedulesList: string[] = []) {
        this.users = [];
        this.commands = new Map<number, MockUpCommand>();
        this.schedules = new Map<string, number[]>();
        schedulesList.forEach(scheduleName => this.schedules.set(scheduleName, []));
    }

    getUser(chatId: number) { return this.users.find(x => x.hasChatId(chatId)); }
    addUser(user: User) {
        if (this.users.find(x => x.hasChatId(user.getChatId())) != undefined) { return -1; }
        else { this.users.push(user); return 0; }
    }

    setCommandToChatId(chatId: number, command: MockUpCommand) { this.commands.set(chatId, command); }
    removeCommandToChatId(chatId: number) { this.commands.delete(chatId); }
    getCommandByChatId(chatId: number) { return this.commands.get(chatId); }

    getUsersWithSchedule(scheduleName: string) { return this.schedules.get(scheduleName); }
    addUserToSchedule(scheduleName: string, user: User) {
        let scheduled_users = this.schedules.get(scheduleName);

        if (scheduled_users == undefined) {
            this.schedules.set(scheduleName, [user.getChatId()]);
            return true
        } else if (scheduled_users.includes(user.getChatId())) { 
            return false;
        } else {
            scheduled_users.push(user.getChatId());
            return true;
        }
    }
}