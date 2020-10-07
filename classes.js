class Tag {
    constructor(name, callback) {
        this.name = name;
        this.callback = callback;
    }
}

class Command {
    constructor(callback, tagsList) {
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

    run(opt, msg, bot) {
        this.callback(this.tags, opt, msg, bot);
    }
}

module.exports = { Tag: Tag, Command: Command }