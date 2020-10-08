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
    constructor(name, callback, tagsList = []) {
        this.name = name;
        this.callback = callback;
        this.tags = tagsList;
        this.activeTag = undefined;
    }

    setTag(Tag) {
        this.tags.push(Tag);
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

    run(opts, msg, match, bot) {
        logger.log.info(this.name + ' Command');
        this.activeTag = undefined;
        
        for (var tagIndex in this.tags) {
            var tag = this.tags[tagIndex];
            this.activeTag = tag;
            if (tag.getValue() == undefined && tag.hasCallback()) {
                tag.run(this.tags, opts, msg, match, bot);
                return false;
            }
        }

        this.callback(this.tags, opts, msg, match, bot);
        return true;
    }
}

module.exports = { TagInterface: TagInterface, CommandInterface: CommandInterface }