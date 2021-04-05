import moment = require('moment');
import { class_type, schedule_type } from '../modules/fas';
import TelegramBot = require('node-telegram-bot-api');
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

    parseObjects() {}
}

export class User {
    chatId: number;
    firstName: string;
    lastName: string | undefined;
    schedules: string[];
    fasFile: string | undefined;
    fasBaseDate: moment.Moment | undefined;
    fasClasses: class_type[] | undefined;
    fasSchedule: schedule_type | undefined;
    rssChannels: string[] | undefined;
    rssGuids: string[];
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

    parseObjects() {
        this.lastChatInformation = Object.assign(ChatInformation, this.lastChatInformation);
        this.lastChatInformation.parseObjects();
    }
}

export class BotInformation {
    users: User[];
    commands: Map<number, MockUpCommand>;
    schedules: Map<string, number[]>;

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

    cleanUsers() { this.users.forEach(x => x.setChatInformation(undefined)); }
    parseObjects() {
        this.users = this.users.map(x => Object.assign(User, x));
        this.users.forEach(x => x.parseObjects());
    }
}