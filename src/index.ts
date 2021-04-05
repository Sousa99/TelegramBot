process.env.NTBA_FIX_319 = '1'; // To disable telegram bot api deprecating warning
import * as logger from './modules/logger';
import * as schedule from 'node-schedule';
import * as fs from 'fs';
import TelegramBot = require('node-telegram-bot-api');

let tokens = require('../json/tokens.json');
let telegramToken = tokens['telegram'];
const isDebugEnvFlag = process.env.NODE_ENV === 'debug';
if (isDebugEnvFlag) telegramToken = tokens['telegram-debug'];

import { BotInformation, User, ChatInformation } from './structural/user';
import * as Commands from './structural/commands';
import { Tags } from './structural/tags';
import { TagInterface } from './structural/classes';

// ================================ END IMPORTS ================================

logger.log.warn("Initializing Bot");
if (isDebugEnvFlag) logger.log.info("In Debug Mode");

// ================================ START Global Structure Creation ================================

type Opts = {
    normal: {
        parse_mode: TelegramBot.ParseMode;
    };
    keyboard: {
        parse_mode: TelegramBot.ParseMode;
        reply_markup: {
            hide_keyboard: boolean;
            resize_keyboard: boolean;
            one_time_keyboard: boolean;
            keyboard: TelegramBot.KeyboardButton[][];
        };
    };
}

declare global {
    namespace NodeJS {
        interface Global {
            botInformation: BotInformation;
            bot: TelegramBot;
            createCommandAndRun: (CommandReference: any, chatInformation: ChatInformation, predefinedTags?: TagInterface[]) => void;
            modelForOpts: () => Opts;
        } 
    }
}

global.botInformation = getBotState();
global.bot = new TelegramBot(telegramToken, { polling: true });
global.createCommandAndRun = createCommandAndRun;
global.modelForOpts = function() {
    return {
        'normal': {parse_mode: 'HTML' },
        'keyboard': {
            parse_mode: 'HTML',
            'reply_markup': {
                hide_keyboard: true,
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: []
            }
        }
    }
}

// ================================ END Global Structure Creation ================================

function createCommandAndRun(CommandReference: typeof Commands.MockUpCommand, chatInformation: ChatInformation, predefinedTags: TagInterface[] = []) {
    let botInformation = global.botInformation;
    let user = botInformation.getUser(chatInformation.chatId);
    if (chatInformation == null || chatInformation.msg == null) return;

    if (user == undefined) {
        if (chatInformation.msg.from == undefined) {
            logger.log.error("Message had no information from who it was (weird)");
            return;
        }

        botInformation.addUser(new User(
            chatInformation.chatId,
            chatInformation.msg.from.first_name,
            chatInformation.msg.from.last_name
        ));

        user = botInformation.getUser(chatInformation.chatId);
        if (user == undefined) {
            logger.log.error("User must not have been properly saved, supposedly, should have saved '" + chatInformation.chatId + "'");
            return;
        }
    }

    user.setChatInformation(chatInformation);
    let command = new CommandReference(user);
    let match = chatInformation.match;

    botInformation.setCommandToChatId(user.getChatId(), command);

    let inputTags: tag[] | undefined = [];
    if (match != undefined && match[1] != undefined)
        inputTags = analyseInput(match[1], user.getChatId());

    if (inputTags != undefined) {
        for (let tagIndex in inputTags) {
            let tagName = inputTags[tagIndex]['tag'];
            let tagValue = inputTags[tagIndex]['value'];
            
            let tag_type = Tags[tagName as keyof typeof Tags]
            if (tag_type == undefined) return;

            let tag = new tag_type(tagValue == undefined ? '' : tagValue)
            command.setTag(tag);
        }
    
        for (let tagIndex in predefinedTags) command.setTag(predefinedTags[tagIndex]);
    }

    if (command.run()) botInformation.removeCommandToChatId(user.getChatId());
}

let bot = global.bot;
bot.onText(/\/start(.*)/, function(msg, match) { createCommandAndRun(Commands.StartCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/fas_setup/, function(msg, match) { createCommandAndRun(Commands.FasSetupCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/fas_print/, async function(msg, match) { createCommandAndRun(Commands.FasPrintCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/show_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/show_tasks(.*)/, function(msg, match) { createCommandAndRun(Commands.ShowTasksCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/schedule$/, function(msg) { createCommandAndRun(Commands.ScheduleCommand, new ChatInformation(msg.chat.id, msg, null)) });
bot.onText(/\/schedule check-registry/, function(msg) { createCommandAndRun(Commands.ScheduleCheckRegistryCommand, new ChatInformation(msg.chat.id, msg, null)) });
bot.onText(/\/schedule rss-channels/, function(msg) { createCommandAndRun(Commands.ScheduleRSSChannelsCommand, new ChatInformation(msg.chat.id, msg, null)) });

bot.onText(/\/mark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/unmark_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/change_registry(.*)/, function(msg, match) { createCommandAndRun(Commands.ChangeRegistryCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/mark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.MarkTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/unmark_task(.*)/, function(msg, match) { createCommandAndRun(Commands.UnmarkTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/change_task(.*)/, function(msg, match) { createCommandAndRun(Commands.ChangeTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/add_task(.*)/, function(msg, match) { createCommandAndRun(Commands.AddTaskCommand, new ChatInformation(msg.chat.id, msg, match)) });

bot.onText(/\/phrase_of_the_day(.*)/, function(msg, match) { createCommandAndRun(Commands.AddPhraseOfTheDayCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/set_fas/, function(msg, match) { createCommandAndRun(Commands.SetFasCommand, new ChatInformation(msg.chat.id, msg, match)) });
bot.onText(/\/get_fas/, function(msg, match) { createCommandAndRun(Commands.GetFasCommand, new ChatInformation(msg.chat.id, msg, match)) });

bot.on('message', function(msg) {
    let chatInformation = new ChatInformation(msg.chat.id, msg, null);
    let botInformation = global.botInformation;
    let user = botInformation.getUser(chatInformation.chatId);
    if (chatInformation == null || chatInformation.msg == null) return;

    if (user == undefined) {
        if (chatInformation.msg.from == undefined) {
            logger.log.error("Message had no information from who it was (weird)");
            return;
        }

        botInformation.addUser(new User(
            chatInformation.chatId,
            chatInformation.msg.from.first_name,
            chatInformation.msg.from.last_name
        ));

        user = botInformation.getUser(chatInformation.chatId);
        if (user == undefined) {
            logger.log.error("User must not have been properly saved, supposedly, should have saved '" + chatInformation.chatId + "'");
            return;
        }
    }

    let command: Commands.MockUpCommand | undefined = botInformation.getCommandByChatId(user.getChatId());
    if (msg.text != undefined && msg.text[0] == '/') {
        botInformation.removeCommandToChatId(user.getChatId());
    } else if (command != undefined) {
        let activeTag = command.getActiveTag();
        if (activeTag == undefined || msg.text == undefined) return;
        
        user.setChatInformation(new ChatInformation(msg.chat.id, msg, null));
        activeTag.setValue(msg.text);
        activeTag.verify(command.getTags(), user).then(function() {
            if (user != undefined && command != undefined && command.run()) botInformation.removeCommandToChatId(user.getChatId());
        })
    }
})

// SUPPORT FUNCTIONS
bot.on('polling_error', (err) => logger.log.error(err));

type tag = { 'tag': string; 'value': string | undefined }
function analyseInput(string: string, chatId: number) : tag[] | undefined {
    var array = string.split(' ').filter(item => item != '');
    var opts = global.modelForOpts();
    var items: tag[] = [];
    
    for (var index = 0; index < array.length; index++) {
        if (array[index][0] != '-') {
            bot.sendMessage(chatId, 'There was a problem, check your request!', opts['normal']);
            return undefined;

        } else if (index == array.length - 1 || array[index+1][0] == '-') {
            items.push({'tag': (array[index]).substring(1).toLowerCase(), 'value': undefined});

        } else {
            var counter = 1;
            var value = '';
            while (index < array.length - counter && array[index + counter][0] != '-') {
                value = value + array[index + counter] + ' ';
                counter++;
            }

            value = value.slice(0, -1);
            items.push({'tag': (array[index]).substring(1).toLowerCase(), 'value': value});
            index += counter - 1;
        }
    }

    return items;
}

schedule.scheduleJob('0 0 * * * *', saveBotState);
function saveBotState() : void {
    let copy = Object.assign(Object.create(Object.getPrototypeOf(BotInformation)), global.botInformation);
    copy.cleanUsers();

    fs.writeFile('../output/state.json', JSON.stringify(copy), function (err) {
        if (err) logger.log.error(err);
        else logger.log.info('Saved bot state');
    });
}

function getBotState() : BotInformation {
    if (fs.existsSync('../output/state.json')) {
        logger.log.info("Bot State File was found");
        let rawdata = fs.readFileSync('../output/state.json', 'utf8');
        let info = JSON.parse(rawdata);

        let botInformation = Object.assign(new BotInformation, info);
        botInformation.parseObjects();

        logger.log.info("Bot State File was loaded");
        return botInformation;

    } else {
        logger.log.info("Bot State File wasn't found");
        let availableSchedules = ['check-registry'];
        return new BotInformation(availableSchedules);
    }
}