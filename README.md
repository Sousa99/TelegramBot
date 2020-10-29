# **Telegram Bot** - Sousa's Personal Assistant

## **Brief Motivation**
This is a project very customized and personalized for personal use so in all honesty ... I doubt there is any use for you personally.


This project runs through *node.js* and easily allows the user to code in new **commands** which in turn might use **tags**.

**Table of Contents**

* [File System](#file-system)
* [Telegram Commands](#telegram-commands)
* [Commands](#commands)
* [Tags](#tags)

---
## **File System**
[Back to the top](#Telegram-Bot---Sousa's-Personal-Assistant)
```
.
├── README.md
├── index.js
├── json
│   ├── commands.json
│   ├── google_keys.json
│   └── tokens.json
├── modules
│   ├── date.js
│   ├── fas.js
│   └── logger.js
├── output
│   └── phrases.txt
├── package-lock.json
├── package.json
└── structural
    ├── classes.js
    ├── commands.js
    └── tags.js
```

---

## **Telegram Commands**
[Back to the top](#Telegram-Bot---Sousa's-Personal-Assistant)

Name | Description | Correspondind Command
-----|------------ | ---------------------
`start` | General start of Telegram Bot and some informations | `StartCommand`
`fas_setup` | Update FAS schedule and consts | `FasSetupCommand`
`fas_print` | Print FAS schedule | `FasPrintCommand`
`show_registry` | Display registry for events | `ShowRegistryCommand`
`mark_registry` | Mark a specific event as done | `ShowTasksCommand`
`unmark_registry` | Unmark a specific event | `ScheduleCommand`
`change_registry` | Change a specific event | `MarkRegistryCommand`
`show_tasks` | Display tasks | `UnmarkRegistryCommand`
`mark_task` | Mark a specific task as completed | `ChangeRegistryCommand`
`unmark_task` | Unmark a specific task | `MarkTaskCommand`
`change_task` | Change a specific task | `UnmarkTaskCommand`
`add_task` | Add a task to a specific class | `ChangeTaskCommand`
`phrase_of_the_day` | Add a phrase of the day to a temp file | `AddPhraseOfTheDayCommand`
`schedule` | Start a specific schedule | `AddTaskCommand`

There is also the possibility of adding schedules to the telegram bot. Schedules can be intreperted as an automated command.

Name | Description | Shceduled Time | Command
---- | ----------- | -------------- | -------
`schedule check-registry` | Bot will ask you if you want to register class about to begin | Every hour at minute `20` and `50` (ten minutes before all classes) | `ScheduleCheckRegistryCommand`

---

## **Commands**
[Back to the top](#Telegram-Bot---Sousa's-Personal-Assistant)

All commands are defined in the *structural* file named [commands.js].
To every and each new command it can and shall be defined it's `name`, `main command function` and `list of tags`.
Before the main command function is effectively executed every tag will be processed.

A new command can be easily added by using the following syntax:
```javascript
function tags() { return [ new Tags.NewTag(value) ] };
class NewCommand extends CommandInterface {
    constructor(chatInformation) { super(chatInformation, "New Command Name", callback, tags()) }
};
```
* **tags:** function: return a list composed by new Tags that must be executed before the main command_function is executed.
* **callback:** reference to function: reference to a defined function that represents the command itself which can and will only be executed after all the tags have a defined value.

### `Commands Available`

Command Class | Command Name | Predefined Tags | Non-Optional Tags | Optional Tags
------------- | :----------: | :-------------: | :---------------: | :-----------:
`StartCommand` | Start | | | 
`FasSetupCommand` | Fas Setup | | | 
`FasPrintCommand` | Fas Print | | | 
`ShowRegistryCommand` | Show Registry | | | <ul><li>`DateTag`</li><li>`TotalTag`</li></ul>
`MarkRegistryCommand` | Marking Registry | <ul><li>`ValueTag`</li><li>`BlackListTag`</li></ul> |<ul><li>`DescriptionRegistryTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`UnmarkRegistryCommand` | Unmarking Registry | <ul><li>`ValueTag`</li><li>`BlackListTag`</li></ul> |<ul><li>`DescriptionRegistryTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`ChangeRegistryCommand` | Changing Registry | | <ul><li>`ValueTag`</li><li>`DescriptionRegistryTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`ShowTasksCommand` | Show Tasks | | | <ul><li>`DateTag`</li><li>`TotalTag`</li></ul>
`MarkTaskCommand` | Marking Tasks | <ul><li>`ValueTag`</li><li>`BlackListTag`</li></ul> |<ul><li>`ClassDescriptionTag`</li><li>`TaskDescriptionTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`UnmarkTaskCommand` | Unmarking Tasks | <ul><li>`ValueTag`</li><li>`BlackListTag`</li></ul> |<ul><li>`ClassDescriptionTag`</li><li>`TaskDescriptionTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`ChangeTaskCommand` | Changing Tasks | | <ul><li>`ValueTag`</li><li>`ClassDescriptionTag`</li><li>`TaskDescriptionTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`AddTaskCommand` | Adding Task | | <ul><li>`ClassDescriptionTag`</li><li>`NewTaskNameCallback`</li><li>`ValueTag`</li> | <ul><li>`DateTag`</li></ul>
`AddPhraseOfTheDayCommand` | Adding Phrase Of The Day | | <ul><li>`PhraseOfTheDayTag`</li></ul> | <ul><li>`DateTag`</li></ul>
`ScheduleCommand` | Schedule | | | 
`ScheduleCheckRegistryCommand` | Schedule Check Registry | | |

It is important to note that when it comes to the `Non-Optional Tags`, this are parsed in the respective order. Since the parsing of a specific tag might need the prior parsing of another tag.

[commands.js]: https://github.com/Sousa99/TelegramBot/blob/master/structural/commands.js

---

## **Tags**
[Back to the top](#Telegram-Bot---Sousa's-Personal-Assistant)

All tags are defined in the *structural* file named [tags.js].
To every and each new command it can be defined it's `pre-processing function` and `pos-processing`.

A new tag can be easily added by using the following syntax:
```javascript
class NewTag extends TagInterface { constructor(value) { super("date", callback, verify_callback, value) } };

```
* **callback:** reference to function: pre-processing of tag, what will be done before the user inputs its value.
* **verify_callback:** reference to function: pos-processing of tag, what will be done after the user inputs its value.


### `Tags Available`

Tag Class | Tag Itself | Type of Value | Description
--------- | ---------- | :-----------: | -----------
`TotalTag` | `total` | None | Wheter to use backlist values or not
`DateTag` | `date` | Keyword / ISO format | Date to use in the command execution
`ValueTag` | `value` | Any | Value to place
`BlacklistTag` | `blacklist` | Any | Blacklist of values not to show user
`DescriptionRegistryTag` | `description_registry` | String of Event | For `Event` selection
`ClassDescriptionTag` | `class_description` | String of Class | For `Class` selection
`TaskDescriptionTag` | `task_description` | String of Task | For `Task` selection
`NewTaskNameCallback` | `new_task_name` | Any | New `Task` name
`PhraseOfTheDayTag` | `phrase` | Any | `Phrase Of The Day` to be added

[tags.js]: https://github.com/Sousa99/TelegramBot/blob/master/structural/tags.js