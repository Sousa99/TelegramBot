import * as logger from '../modules/logger';
import { User } from './user';

export class TagInterface {
    name: string;
    callback: null | ((tags: TagInterface[], user: User) => void);
    verifyCallback: null | ((tags: TagInterface[], user: User) => void);
    value: string | string[] | undefined;

    constructor(name: string, callback: null | ((tags: TagInterface[], user: User) => void), verifyCallback: null | ((tags: TagInterface[], user: User) => void), value: string | string[] | undefined) {
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

    setValue(value: string | string[]) {
        this.value = value;
    }

    toString() {
        var string = this.name + "|"
        if (this.callback) string += " callback: " + this.callback.name + " |" 
        if (this.verifyCallback) string += " verify callback: " + this.verifyCallback.name + " |"
        string += " value: " + this.value;

        return string;
    }

    run(tags: TagInterface[], user: User) {
        logger.log.info('Setting up tag ' + this.name);
        if (this.callback != undefined) return this.callback(tags, user);
        return true;
    }

    async verify(tags: TagInterface[], user: User) : Promise<boolean> {
        logger.log.info('Verifying tag ' + this.name);
        if (this.verifyCallback != undefined) {
            let valid = this.verify(tags, user);
            return valid;
        }

        return true;
    }
}

export class CommandInterface {
    user: User;
    name: string;
    callback: (tags: TagInterface[], user: User) => void;
    verify: null | ((tags: TagInterface[], user: User) => boolean);
    tags: TagInterface[];
    activeTag: TagInterface | undefined;

    constructor(user: User, name: string, verify: null | ((tags: TagInterface[], user: User) => boolean), callback: (tags: TagInterface[], user: User) => void, tagsList: TagInterface[] = []) {
        this.user = user;
        this.name = name;
        this.verify = verify;
        this.callback = callback;
        this.tags = tagsList;
        this.activeTag = undefined;
    }

    setTag(Tag: TagInterface) {
        var existingTag = this.tags.find(element => element.getName() == Tag.getName());
        if (existingTag != undefined) existingTag.setValue(Tag.getValue() as string | string[]);
        else this.tags.push(Tag);
    }

    getTag(name: string) {
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
        string += "user chatId: " + this.user.getChatId() + "\n"

        if (this.callback) string += "callback: " + this.callback.name + "\n" 
        if (this.activeTag) string += "active tag: " + this.activeTag.toString() + "\n" 
        if (this.tags) {
            for (var index in this.tags)
                string += this.tags[index].toString() + "\n";
        }

        return string;
    }

    run() {
        if (this.verify != undefined && !this.verify(this.tags, this.user)) return false;

        logger.log.info(this.name + ' Command');
        logger.log.info(this.toString());
        this.activeTag = undefined;
        
        for (var tagIndex in this.tags) {
            var tag = this.tags[tagIndex];
            this.activeTag = tag;
            if (tag.getValue() == undefined && tag.hasCallback()) {
                var tagAborted = tag.run(this.tags, this.user);
                return tagAborted;
            }
        }

        this.callback(this.tags, this.user);
        return true;
    }
}