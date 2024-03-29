'use strict'
String.prototype.clr = function(hexColor) {
    return `<font color='#${hexColor}'>${this}</font>`
};

const SettingsUI = require('tera-mod-ui').Settings;
const Quests = require("./quests.json");

module.exports = function AutoGuildquest(mod) {

    let myQuestId = 0,
        status = 2,
        progress = 0,
        clr = 0,
        entered = false,
        hold = false

    mod.game.me.on('change_zone', (zone, quick) => {
        if (mod.settings.battleground.includes(zone)) {
            hold = true
        } else if (hold && myQuestId !== 0) {
            hold = false
            completeQuest()
            dailycredit()
        }
    });
    //thx Kygas 
    mod.hook('S_SYSTEM_MESSAGE', 1, (event) => {
        const msg = mod.parseSystemMessage(event.message);
        if (msg) {
            console.log(msg);
        }
    });
    //GquestLog
    mod.hook("S_GUILD_QUEST_LIST", 1, (event) => {
        if (mod.settings.enabled && (mod.settings.GQuestLog)) {
            GetQuestsInfo(event["quests"]);
        }
    })

    //Daily
    mod.hook('S_LOGIN', 'event', () => {
        mod.hookOnce('S_SPAWN_ME', 'event', () => {
            setTimeout(dailycredit, 1000 + Math.random() * 250);
        });
    });
    //Guardian
    mod.hook('S_FIELD_EVENT_ON_ENTER', 'raw', () => {
        entered = true;
        //return false;
    });
    //Guardian
    mod.hook('C_RETURN_TO_LOBBY', 'raw', () => {
        entered = false;
    });
    //Vandguard	
    mod.hook('S_COMPLETE_EVENT_MATCHING_QUEST', 1, (event) => {
        if (mod.settings.enabled && (mod.settings.Vanguard)) {
            myQuestId = event.id
            if (!hold) setTimeout(completeQuest, 1000 + Math.random() * 250);
            //return false;
        }
    });
    //Guardian
    mod.hook('S_FIELD_EVENT_PROGRESS_INFO', 1, () => {
        if (mod.settings.Guardian) setTimeout(completeGuardian, 2000 + Math.random() * 250);
    });
    //Gquest
    mod.hook('S_UPDATE_GUILD_QUEST_STATUS', 1, (event) => {
        if (mod.settings.GQuest) {
            if (event.targets[0].completed == event.targets[0].total) {
                setTimeout(() => {
                    mod.send('C_REQUEST_FINISH_GUILD_QUEST', 1, {
                        quest: event.quest
                    })
                }, 2000 + Math.random() * 1000)

                setTimeout(() => {
                    mod.send('C_REQUEST_START_GUILD_QUEST', 1, {
                        questId: event.quest
                    })
                }, 4000 + Math.random() * 1000)
            }
            //return false;
        }
    })
    //Guardian
    mod.hook('S_FIELD_POINT_INFO', 2, (event) => {
        if (entered && event.cleared != clr && event.cleared - 1 > event.claimed) {
            mod.toClient('S_CHAT', 3, {
                channel: 21,
                gm: 1,
                name: 'Guardian Mission',
                message: String(event.cleared + " / 40")
            });
        }
        clr = event.cleared;
    });
    //Vanguard
    function completeQuest() {
        mod.send('C_COMPLETE_DAILY_EVENT', 1, {
            id: myQuestId
        })
        setTimeout(() => {
            mod.send('C_COMPLETE_EXTRA_EVENT', 1, {
                type: 0
            })
        }, 500 + Math.random() * 250)
        setTimeout(() => {
            mod.send('C_COMPLETE_EXTRA_EVENT', 1, {
                type: 1
            })
        }, 1000 + Math.random() * 250)
        myQuestId = 0
    };
    //Guardian
    function completeGuardian() {
        mod.send('C_REQUEST_FIELD_POINT_REWARD', 1, {})
        setTimeout(() => {
            mod.send('C_REQUEST_ONGOING_FIELD_EVENT_LIST', 1, {})
        }, 2000 + Math.random() * 500)
    };
    //Daily
    function dailycredit() {
        if (mod.settings.Daily) {
            let _ = mod.trySend('C_REQUEST_RECV_DAILY_TOKEN', 1, {});
            !_ ? mod.log('Unmapped protocol packet \<C_REQUEST_RECV_DAILY_TOKEN\>.') : null;
        }
    };

    //GquestLog
    function GetQuestsInfo(questEvent) {
        for (let questIndex in questEvent) {
            if ([1, 2].includes(questEvent[questIndex]["status"])) {
                let qName = questEvent[questIndex]["name"].replace("@GuildQuest:", "");
                let qSize = GetQuestSize(questEvent[questIndex]["size"]);
                let qStatus = `${questEvent[questIndex]["status"] == 1 ? "[В ПРОЦЕССЕ]".clr("f1ef48") : "[ЗАВЕРШЕН]".clr("3fce29")}`;
                let qTime = new Date(1000 * questEvent[questIndex]["timeRemaining"]).toISOString().substr(11, 8);
                mod.command.message(`${qStatus} ${Quests[qName].clr("0cccd6")} ${qSize.clr("0c95d4")} Осталось Времени: ${qTime.clr("db3dce")}`)
            } else {
                continue
            }
        }
    }
    //GquestLog
    function GetQuestSize(size) {
        if (size == 0) {
            return "(Среднее)"
        } else if (size == 1) {
            return "(Сложное)"
        } else {
            return "(Простое)"
        }
    }

    //Msg
    function sendMessage(msg) {
        mod.command.message(msg)
    }
    //Ui
    let ui = null;
    if (global.TeraProxy.GUIMode) {
        ui = new SettingsUI(mod, require('./settings_structure'), mod.settings, {
            alwaysOnTop: true,
            width: 550,
            height: 232
        });
        ui.on('update', settings => {
            mod.settings = settings;
        });

        this.destructor = () => {
            if (ui) {
                ui.close();
                ui = null;
            }
        };
    }

    function dailyStatus() {
            mod.command.message(' === Состояние модуля Auto Guildquest ==='.clr('FF4500')),
            mod.command.message('Модуль: ' + (mod.settings.enabled ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000'))),
            mod.command.message('Auto-Vanguardquest: ' + (mod.settings.Vanguard ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000'))),
            mod.command.message('Auto-Guildquest: ' + (mod.settings.GQuest ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000'))),
            mod.command.message('Guildquest-Logger: ' + (mod.settings.Guardian ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000'))),
            mod.command.message('Auto-Gardian-Legion: ' + (mod.settings.Guardian ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000'))),
            mod.command.message('Auto-Daily-Credit: ' + (mod.settings.Daily ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')))
    }

    function sendStatus(msg) {
        sendMessage([...arguments].join('\n\t'));
    }

    mod.command.add("auto", (arg, value) => {
        if (!arg) {
            mod.settings.enabled = !mod.settings.enabled;
            mod.command.message('Модуль: ' + (mod.settings.enabled ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')));
        } else {
            switch (arg) {
                case "set":
                    if (ui) ui.show();
                    break;
                case "vg":
                    mod.settings.Vanguard = !mod.settings.Vanguard;
                    sendMessage('Auto-Vanguardquest : ' + (mod.settings.Vanguard ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')));
                    break;
                case "gq":
                    mod.settings.GQuest = !mod.settings.GQuest;
                    sendMessage('Auto-Guildquest : ' + (mod.settings.GQuest ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')));
                    break;
                case "gl":
                    mod.settings.Guardian = !mod.settings.Guardian;
                    sendMessage('Auto-Gardian-Legion : ' + (mod.settings.Guardian ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')));
                    break;
                case "dc":
                    mod.settings.Daily = !mod.settings.Daily;
                    sendMessage('Auto-Daily-Credit : ' + (mod.settings.Daily ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')));
                    break;
                case "gqlog":
                    mod.settings.Guardian = !mod.settings.Guardian;
                    sendMessage('Guildquest-Logger : ' + (mod.settings.Guardian ? 'Включен'.clr('56B4E9') : 'Отключен'.clr('FF0000')));
                    break;
                case "status":
                    dailyStatus();
                    break;
                    // default :
                    // sendStatus("",
                    // ('auto: ' + ('Включение модуля'.clr('56B4E9'))),
                    // ('auto ui: ' + ('Включение GUI модуля'.clr('56B4E9'))),
                    // ('auto vg: ' + ('Включает Auto-Vanguardquest'.clr('56B4E9'))), 
                    // ('auto gq: ' + ('Включает Auto-Guildquest'.clr('56B4E9'))),
                    // ('auto gqlog: ' + ('Включает Guildquest-Logger'.clr('56B4E9'))),
                    // ('auto gl: ' + ('Включает Auto-Gardian-Legion'.clr('56B4E9'))),
                    // ('auto dc: ' + ('Включает Auto-Daily-Credit'.clr('56B4E9'))),
                    // ('auto status: ' + ('Состояние модуля'.clr('56B4E9')))
                    // );
                    // break;
            }
        }
    });

}