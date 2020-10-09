var logger = require('../modules/logger.js');

class TagInterface {
    constructor(name, callback, verifyCallback, value) {
        this.name = name;
        this.callback = callback;
        this.verifyCallback = verifyCallback;
        this.value = value;
    }

    getName() {
        return this.name;
    }
    getValue() {
        return this.value;
    }

    hasCallback() {
        return this.callback != undefined;
    }

    setValue(value) {
        this.value = value;
    }

    toString() {
        var string = this.name + "|"
        if (this.callback) string += " callback: " + this.callback.name + " |" 
        if (this.verifyCallback) string += " verify callback: " + this.verifyCallback.name + " |"
        string += " value: " + this.value;

        return string;
    }

    run(tags, chatInformation) {
        logger.log.info('Setting up tag ' + this.name);
        return this.callback(tags, chatInformation);
    }

    async verify(tags, chatInformation) {
        logger.log.info('Verifying tag ' + this.name);
        if (this.verifyCallback != undefined) {
            valid = this.verify(tags, chatInformation);
            return valid;
        }

        return true;
    }
}

class CommandInterface {
    constructor(chatInformation, name, callback, tagsList = []) {
        this.chatInformation = chatInformation;
        this.name = name;
        this.callback = callback;
        this.tags = tagsList;
        this.activeTag = undefined;
    }

    setTag(Tag) {
        var existingTag = this.tags.find(element => element.getName() == Tag.getName());
        if (existingTag != undefined) existingTag.setValue(Tag.getValue());
        else this.tags.push(Tag);
    }

    getTag(name) {
        let tag = this.tags.find(element => element.getName() == name);
        return tag;
    }
    getActiveTag() {
        return this.activeTag;
    }
    getTags() {
        return this.tags;
    }

    toString() {
        var string = this.name + "\n"
        if (this.callback) string += " callback: " + this.callback.name + "\n" 
        if (this.activeTag) string += " active tag: " + this.activeTag.toString() + "\n" 
        if (this.tags) {
            for (index in this.tags)
                string += this.tags[index].toString() + "\n";
        }

        return string;
    }

    run() {
        logger.log.info(this.name + ' Command');
        logger.log.info(this.toString());
        this.activeTag = undefined;
        
        for (var tagIndex in this.tags) {
            var tag = this.tags[tagIndex];
            this.activeTag = tag;
            if (tag.getValue() == undefined && tag.hasCallback()) {
                var tagAborted = tag.run(this.tags, this.chatInformation);
                return tagAborted;
            }
        }

        this.callback(this.tags, this.chatInformation);
        return true;
    }
}

class ChatInformation {
    constructor(chatId, msg, match) {
        this.chatId = chatId;
        this.msg = msg;
        this.match = match;
    }
}

module.exports = {
    TagInterface: TagInterface,
    CommandInterface: CommandInterface,
    ChatInformation: ChatInformation,
}