class User {
    constructor(chatId, firstName, lastName) {
        this.chatId = chatId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.schedules = [];

        this.fasFile = undefined;
    }

    hasChatId(chatId) { return this.chatId == chatId; }
    hasSchedule(schedule) { return this.schedules.includes(schedule); }
    getChatId() { return this.chatId; }
    getFirstName() { return this.firstName; }
    getLastName() { return this.lastName; }
    getSchedules() { return this.schedules; }
    getFasFile() { return this.fasFile; }

    addSchedule(newSchedule) { this.schedules.push(newSchedule); }
    setFasFile(fasFile) { this.fasFile = fasFile; }
}

class BotInformation {
    constructor(schedulesList) {
        this.users = [];
        this.schedules = {};
        schedulesList.forEach(scheduleName => this.schedules[scheduleName] = []);
    }

    getUser(chatId) { this.users.find(x => x.hasChatId(chatId))}
    addUser(user) {
        if (this.users.find(x => x.hasChatId(user.getChatId())) != undefined) { return -1; }
        else { this.users.push(user); return 0; }
    }

    addUserToSchedule(scheduleName, user) {
        if (this.schedules[scheduleName].includes(user)) { return -1; }
        else { this.schedules[scheduleName].push(user); return 0; }
    }
}

module.exports = {
    BotInformation: BotInformation,
    User: User
}