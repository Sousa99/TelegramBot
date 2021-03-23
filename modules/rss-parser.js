//var logger = require('./logger.js');
var parse = require('feed-reader').parse;
var time_module = require('./time.js');

async function checkChannel(channelUrl, last_time) {
    messages = []
    
    parse(channelUrl).then((feed) => {
        feed.entries.forEach(element => {

            var parsed_time = time_module.processTimeString(element.publishedDate)
            if (last_time != null && !parsed_time.isAfter(last_time)) {
                return
            }

            new_message = {
                channel: feed.title,
                title: element.title,
                content: element.content,
                timestamp: parsed_time,
                author: element.author,
                link: element.link,
            }

            messages.push(new_message)
        });

    }).catch((err) => {
        console.log(err)
        //logger.log.error('RSS Parser: ', err);
    }).finally(() => {
        console.log(messages)
    });
}

let url = 'https://fenix.tecnico.ulisboa.pt/disciplinas/AI5146/2020-2021/2-semestre/rss/announcement';
let last_time = time_module.processTimeString('Wed, 03 Mar 2021 20:40:26 GMT')
checkChannel(url, last_time)

exports.checkChannel = checkChannel;