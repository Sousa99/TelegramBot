class ChatInformation {
    constructor(chatId, msg, match) {
        this.chatId = chatId;
        this.msg = msg;
        this.match = match;
    }

    getChatId() { return this.chatId; }
    getMsg() { return this.msg; }
    getMatch() { return this.match; }
}

class User {
    constructor(chatId, firstName, lastName) {
        this.chatId = chatId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.schedules = [];

        this.fasFile = undefined;
        this.lastChatInformation = undefined;
    }

    hasChatId(chatId) { return this.chatId == chatId; }
    hasSchedule(schedule) { return this.schedules.includes(schedule); }
    getChatId() { return this.chatId; }
    getFirstName() { return this.firstName; }
    getLastName() { return this.lastName; }
    getSchedules() { return this.schedules; }
    getFasFile() { return this.fasFile; }
    getChatInformation() { return this.lastChatInformation; }

    addSchedule(newSchedule) { this.schedules.push(newSchedule); }
    setFasFile(fasFile) { this.fasFile = fasFile; }
    setChatInformation(chatInformation) { this.lastChatInformation = chatInformation; }
}

class BotInformation {
    constructor(schedulesList) {
        this.users = [];
        this.commands = {};
        this.schedules = {};
        schedulesList.forEach(scheduleName => this.schedules[scheduleName] = []);
    }

    getUser(chatId) { return this.users.find(x => x.hasChatId(chatId)); }
    addUser(user) {
        if (this.users.find(x => x.hasChatId(user.getChatId())) != undefined) { return -1; }
        else { this.users.push(user); return 0; }
    }

    setCommandToChatId(chatId, command) { this.schedules[chatId] = command; }
    getCommandByChatId(chatId) { return this.schedules[chatId]; }

    getUsersWithSchedule(scheduleName) { return this.schedules[scheduleName]; }
    addUserToSchedule(scheduleName, user) {
        if (this.schedules[scheduleName].includes(user)) { return 0; }
        else { this.schedules[scheduleName].push(user); return 1; }
    }
}

module.exports = {
    BotInformation: BotInformation,
    User: User,
    ChatInformation: ChatInformation,
}