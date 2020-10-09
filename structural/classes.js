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

    run(tags, opts, msg, match, bot) {
        logger.log.info('Setting up tag ' + this.name);
        this.callback(tags, opts, msg, match, bot);
    }

    async verify(tags, opts, msg, match, bot) {
        logger.log.info('Verifying tag ' + this.name);
        if (this.verifyCallback != undefined) {
            valid = this.verify(tags, opts, msg, match, bot);
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
        existingTag = this.tags.find(element => element.getName() == Tag.getName());
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

    run() {
        logger.log.info(this.name + ' Command');
        this.activeTag = undefined;
        
        for (var tagIndex in this.tags) {
            var tag = this.tags[tagIndex];
            this.activeTag = tag;
            if (tag.getValue() == undefined && tag.hasCallback()) {
                tag.run(this.tags, this.chatInformation);
                return false;
            }
        }

        this.callback(this.tags, this.chatInformation);
        return true;
    }
}

class ChatInformation {
    constructor(opts, chatId, msg, match, bot) {
        this.opts = opts;
        this.chatId = chatId;
        this.msg = msg;
        this.match = match;
        this.bot = bot;
    }
}

module.exports = {
    TagInterface: TagInterface,
    CommandInterface: CommandInterface,
    ChatInformation: ChatInformation,
}