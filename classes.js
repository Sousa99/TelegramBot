var logger = require('./logger.js');

class TagInterface {
    constructor(name, callback) {
        this.name = name;
        this.callback = callback;
    }
}

class CommandInterface {
    constructor(name, callback, tagsList = []) {
        this.name = name;
        this.callback = callback;
        this.tags = [];
        
        for (tagIndex in tagsList) {
            name = tagsList[tagsList].name;
            callback = tagsList[tagsList].callback;
            value = undefined;

            tagObject = {'name': name, 'callback': callback, 'value': value};
            this.tags.push(tagObject);
        }
    }

    setTag(name, value) {
        tag = this.tags.find(element => element['name'] == name);
        tag.value = value;
    }

    run(opts, msg, match, bot) {
        logger.log.info(this.name + ' Command');
        this.callback(this.tags, opts, msg, match, bot);
    }
}

module.exports = { TagInterface: TagInterface, CommandInterface: CommandInterface }