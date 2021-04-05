import * as time_module from './time';
import * as logger from './logger';
import Parser from 'rss-parser';

var parser = new Parser();

export class Message {
    channel: string;
    title: string;
    content: string;
    timestamp: moment.Moment;
    author: string;
    link: string;
    guid: string;

    constructor(channel: string, title: string, content: string, timestamp: moment.Moment, author: string, link: string, guid: string) {
        this.channel = channel;
        this.title = title;
        this.content = content;
        this.timestamp = timestamp;
        this.author = author;
        this.link = link;
        this.guid = guid;
    }
}

export async function checkChannel(channelUrl : string, previous_guids : string[]) {
    var messages: Message[] = []

    await parser.parseURL(channelUrl).then((feed) => {
        feed.items.forEach(async element => {

            if (previous_guids.some((guid) => guid == element.guid)) return

            let new_message = new Message(
                (typeof feed.title === 'string') ? feed.title : "No Feed Title",
                (typeof element.title === 'string') ? element.title : "No Message Title",
                (typeof element.content === 'string') ? element.content : "No Message Content",
                (typeof element.publishedDate === 'string') ? time_module.processTimeString(element.publishedDate) : time_module.createNowMoment(),
                element.author,
                (typeof element.link === 'string') ? element.link : "No Message Link",
                (typeof element.guid === 'string') ? element.guid : "No Message Link"
            )
            
            messages.push(new_message)
        });

    }).catch((err) => {
        logger.log.error('RSS Parser: ', err);
    });

    return messages;
}