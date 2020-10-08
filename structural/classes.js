var logger = require('../modules/logger.js');

class TagInterface {
    constructor(name, callback) {
        this.name = name;
        this.callback = callback;
    }
}

class CommandInterface {
    constructor(name, callback, tagsList = [], presetTags = []) {
        this.name = name;
        this.callback = callback;
        this.tags = [];
        
        for (tagIndex in tagsList) {
            let nameTag = tagsList[tagsList].name;
            let callback = tagsList[tagsList].callback;

            let presetTag = presetTags.find(element => element['tag'] == nameTag);
            if (presetTag != undefined) value = presetTag['value'];
            else value = undefined;

            tagObject = {'name': nameTag, 'callback': callback, 'value': value};
            this.tags.push(tagObject);
        }
    }

    setTag(name, value) {
        var tag = this.tags.find(element => element['name'] == name);
        if (tag == undefined) this.tags.push({'tag': name, 'value': value});
        else tag.value = value;
    }

    getTag(name) {
        let tag = this.tags.find(element => element['name'] == name);
        if (tag == undefined) return undefined;
        else return tag['value'];
    }

    run(opts, msg, match, bot) {
        logger.log.info(this.name + ' Command');
        this.callback(this.tags, opts, msg, match, bot);
    }
}

module.exports = { TagInterface: TagInterface, CommandInterface: CommandInterface }