var logger = require('./logger.js');
var Parser = require('rss-parser');
var time_module = require('./time.js');

var parser = new Parser();

async function checkChannel(channelUrl, previous_guids) {
    var messages = []

    await parser.parseURL(channelUrl).then((feed) => {
        feed.items.forEach(async element => {

            if (previous_guids.some((guid) => guid == element.guid)) {
                return
            }

            new_message = {
                channel: feed.title,
                title: element.title,
                content: element.content,
                timestamp: time_module.processTimeString(element.publishedDate),
                author: element.author,
                link: element.link,
                guid: element.guid
            }
            
            messages.push(new_message)
        });

    }).catch((err) => {
        logger.log.error('RSS Parser: ', err);
    });

    return messages;
}

exports.checkChannel = checkChannel;