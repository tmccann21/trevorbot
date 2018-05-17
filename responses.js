let manager;
const request = require("request")
const qs = require("qs");

function init(m)
{
    manager = m;
    initializePages()
}

function sendMessage(api, thread, message)
{
    return new Promise(function(res, rej)
    {
        api.sendMessage(message, thread, (err, messageInfo) => {
            if(err) rej(err);
            res();
        });
    });
}
let pages = [] //HELP!

function initializePages()
{
    let current = [];
    let pointer = 0;
    Object.keys(responses).forEach(function(key, ind) {
        if(responses[key].command)
        {
            if(pointer==5)
            {
                pages.push(current);
                current = [];
                pointer = 0;
            }
            pointer++;
            current.push("&"+key);
        }
    });
    if(current.lengt != 0)
    {
        pages.push(current);
    }
}

function getPageAsString(num)
{
    num--;
    if(num < 0 || num >= pages.length)
        return "";
    const pageData = pages[num];
    let str = "";
    pageData.forEach(function(command){
        str+=command+"\n"
    })
    return str;
}

let responses = {
    help:{
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || thread.silent || !thread.active)
                return
            if(params.length == 0)
            {
                sendMessage(api, message.threadID, "*TrevorBot* help page 1\n\n"+
                                                "Type &help [command] to learn more\n\n"+
                                                "--- [1/"+pages.length+"] ---\n"+
                                                getPageAsString(1)+
                                                "--- ----- ---\n"+
                                                "\nType &help [page number] to see more commands");
                return;
            }else{
                const modif = params[0]
                const modifInt = parseInt(modif);
                if(Number.isInteger(modifInt))
                {
                    if(modifInt-1 >= 0 && modifInt-1 < pages.length)
                    {
                        sendMessage(api, message.threadID, "*TrevorBot* help page "+modifInt+"\n\n"+
                                        "Type &help [command] to learn more\n\n"+
                                        "--- ["+modifInt+"/"+pages.length+"] ---\n"+
                                        getPageAsString(modifInt)+
                                        "--- ----- ---\n"+
                                        "\nType &help [page number] to see more commands");
                    }else{
                        sendMessage(api, message.threadID, "*TrevorBot* help\n\nPlease choose a valid page number [1 - "+pages.length+"]");
                    }
                    return; 
                }else{
                    try
                    {
                        responses[modif].help(api, message);
                        return
                    }catch(e)
                    {
                        responses.unknown(api, message, thread.silent);
                        return
                    }
                }
            }
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID, "*TrevorBot*\n\nThe &help command provides information about other\n"+
                                            "*TrevorBot* commands. Try &help [command] to learn\n"+
                                            "Even more about a command!")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    trevorbot:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = null;
            switch(params[0])
            {
                case "start":
                    if(!manager)
                        return
                    api.setMessageReaction(":love:", message.messageID, (err)=>{if (err) console.error(err)});
                    manager.addThread(api, message.threadID).then(x=>{
                        responses.init.call(api, x);
                    }).catch(err=>{
                        if(err && err == 0)
                        {
                            responses.running.call(api, message.threadID)
                            return
                        }
                        if (err) 
                            console.error(err)
                    });
                    break
                case "stop":
                    if(!manager)
                        return
                    api.setMessageReaction(":sad:", message.messageID, (err)=>{if (err) console.error(err)});
                    responses.close.call(api, manager.getThreadByThreadID(message.threadID)).then(_=>{
                        manager.stopThread(api, message.threadID);
                    }).catch(err=>{
                        if(err == 0)
                        {
                            responses.stopped.call(api, message.threadID)
                            return;
                        }
                        manager.stopThread(api, message.threadID);
                    });
                    break
                case "mute":
                    if(!manager)
                        return
                    thread = manager.getThreadByThreadID(message.threadID)
                    if(!thread || thread.silent)
                        return
                    thread.silent = true
                    break
                case "unmute":
                    if(!manager)
                        return
                    thread = manager.getThreadByThreadID(message.threadID)
                    if(!thread || !thread.silent)
                        return
                    thread.silent = false
                    sendMessage(api, message.threadID, "*TrevorBot* unmuted!")
                    break
                case "status":
                    if(!manager)
                        return
                    thread = manager.getThreadByThreadID(message.threadID)
                    const time = new Date().getTime() - manager.util.startTime
                    if(!thread)
                    {
                        sendMessage(api, message.threadID, "*TrevorBot*\n\n*Thread Status*\nTrevorBot is offline\nTrevorBot is unmuted\n\n*Global Status*\nTrevorBot has been running for"+(time/1000).toString().match(/.*\.[0-9]{0,2}/)[0]+"s")
                        return
                    }
                    let extra = "*TrevorBot*\n\n*Thread Status*\n"
                    if(thread.active)
                        extra+="Trevorbot is online\n"
                    else   
                        extra+="Trevorbot is offline\n"

                    if(thread.silent)
                        extra+="Trevorbot is muted\n"
                    else
                        extra+="Trevorbot is unmuted\n"
                    extra+="\n*Global Status*\n"
                    extra+="TrevorBot has been running for "+(time/1000).toString().match(/.*\.[0-9]{0,2}/)[0]+"s"
                    sendMessage(api, message.threadID, extra)
                    break
                default:
                    responses.trevorbot.help(api, message);
            }
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID, "*TrevorBot*\n\nUsage :\n"+
                                            "&trevorbot start  -- start trevorbot\n"+
                                            "&trevorbot stop   -- kill trevorbot\n"+
                                            "&trevorbot mute   -- mute trevorbot\n"+
                                            "&trevorbot unmute -- unmute trevorbot\n"+
                                            "&trevorbot status -- trevorbot status")
                .catch(err=>{if (err) console.error(err)});
        }
    },
    autoreact:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active)
                return
            if(params.length == 0 || (params.length > 0 && params[0] == "none"))
            {   
                thread.react = null;
                return
            }
            if(params[0] == "options")
            {
                sendMessage(api, message.threadID, "*TrevorBot*\n\n😍 | :love:\n😆 | :haha:\n😮 | :wow:\n😢 | :sad:\n😠 | :angry:\n👍 | \\:like:\n👎 | :dislike:\nnone");
                return
            }
            if(thread)
                thread.react = params[0];
            if(!thread.silent)
                sendMessage(api, message.threadID, "*TrevorBot*\n\nautoreact set to "+params[0]);
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID, "*TrevorBot*\n\n&autoreact [emoji]")
                .catch(err=>{if (err) console.error(err)});
        }
    },
    //thread info
    thread:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active || thread.silent)
                return;
            if(params[0] == 'users')
            {
                let m = ""
                thread.participants.simple.forEach(function(pair)
                {
                    m+=pair.name+" | "+pair.userID+"\n"
                })
                console.log(m)
                const out = "*TrevorBot*\n\n"+m
                sendMessage(api, message.threadID, out).catch(err=>{console.error(err)})
            }
        }
    },
    //give a command to a user without promoting them
    give:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active)
                return
            if((matches = manager.util.userIsInThread(params[0], thread, verbose = true)).length != 0)
            {
                if(matches.length > 1)
                {
                    sendMessage(api, message.threadID,"*TrevorBot*\n\nmultiple name matches - please use ID instead\nuse &thread users to find IDs")
                    return
                }
                if(thread.commands[matches[0].commandSet.name].all[params[1]] != null)
                {
                    matches[0].commands[matches[0].commandSet.name][params[1]] = true
                    sendMessage(api, message.threadID,"*TrevorBot*\n\n"+matches[0].name+" can now use "+params[1])
                }
                
            }
        },
        help:function(api, message)
        {

        }
    },
    //take away a command from a user without demoting them
    take:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active)
                return
            if((matches = manager.util.userIsInThread(params[0], thread, verbose = true)).length != 0)
            {
                if(matches.length > 1)
                {
                    sendMessage(api, message.threadID,"*TrevorBot*\n\nmultiple name matches - please use ID instead\nuser &thread users to find IDs")
                    return
                }
                if(thread.commands[matches[0].commandSet.name].all[params[1]] != null)
                {
                    matches[0].commands[matches[0].commandSet.name][params[1]] = false
                    sendMessage(api, message.threadID,"*TrevorBot*\n\n"+matches[0].name+" can no longer use "+params[1])
                }
                
            }
        },
        help:function(api, message)
        {

        }
    },
    //allow access to all commands
    promote:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active)
                return
            if((matches = manager.util.userIsInThread(params[0], thread, verbose=true)).length != 0)
            {
                if(matches.length > 1)
                {
                    sendMessage(api, message.threadID,"*TrevorBot*\n\nmultiple name matches - please use ID instead\nuser &thread users to find IDs")
                    return
                }
                matches[0].commands = thread.commands.all
                sendMessage(api, message.threadID,"*TrevorBot*\n\n"+matches[0].name+" was promoted")
                return
            }
        },
        help:function(api, message)
        {

        }
    },
    //reset access to only basic commands
    demote:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active) 
                return;
            if((matches = manager.util.userIsInThread(params[0], thread, verbose=true)).length != 0)
            {
                if(matches.length > 1)
                {
                    sendMessage(api, message.threadID,"*TrevorBot*\n\nmultiple name matches - please use ID instead\nuser &thread users to find IDs")
                    return
                }
                if(matches[0].userID == manager.util.adminID)
                {
                    sendMessage(api, message.threadID,"*TrevorBot*\n\nwhat is dead may never die")
                    return
                }
                matches[0].commands = thread.commands.unprotected
                sendMessage(api, message.threadID,"*TrevorBot*\n\n"+matches[0].name+" was demoted")
            }
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID,"*TrevorBot*\n\ndemote a user from admin.\n&demote [@[target]]+").catch((err)=>{if(err) console.log(err)})
        }
    },
    //bitly link shortener
    bitly:
    {
        command:true,
        case:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active || thread.silent)
                return;
            if(params[0].toLowerCase() == "shorten")
            {
                const payload = qs.stringify({
                    access_token:manager.credentials.bitly.token,
                    longUrl:params[1]
                })
                request.get(
                {
                    url:"https://api-ssl.bitly.com/v3/shorten?"+payload,
                },
                function(error,response,body)
                {
                    if(error)
                    {
                        sendMessage(api, message.threadID, "*TrevorBot*\n\nThere was an error with your query\nURL shortening failed")
                        return
                    }
                    let data = JSON.parse(body)
                    if(data.status_code == 200 && data.data.long_url)
                    {
                        sendMessage(api, message.threadID, ("*TrevorBot*\n\nYour shortened link!\n"+data.data.url.toString()))
                    }
                });
            }else if(params[0].toLowerCase() == "expand")
            {
                const payload = qs.stringify({
                    access_token:manager.credentials.bitly.token,
                    shortUrl:params[1]
                })
                request.get(
                {
                    url:"https://api-ssl.bitly.com/v3/expand?"+payload,
                },
                function(error,response,body)
                {
                    if(error)
                    {
                        sendMessage(api, message.threadID, "*TrevorBot*\n\nThere was an error with your query\nURL expanding failed")
                        return
                    }
                    let data = JSON.parse(body)
                    if(data.status_code == 200 && data.data.expand[0].long_url)
                    {
                        sendMessage(api, message.threadID, ("*TrevorBot*\n\nYour expanded link!\n"+data.data.expand[0].long_url.toString()))
                    }
                });
            }
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID,"*TrevorBot*\n\n&bitly shorten [url] --shorten a URL using bitly\n&bitly expand [url] --expand a url using bitly")
        }
    },
    //roll a dice
    roll:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active || thread.silent)
                return;
            params[0] = (params.length == 0 || parseInt(params[0])==NaN)?2:parseInt(params[0])
            if(params[0] <= 0) 
                params[0] = 2
            const val = Math.ceil(Math.random() * params[0])
            sendMessage(api, message.threadID, "*TrevorBot*\n\nRolling a "+(params[0])+" sided dice")
            .then(_=>{
                sendMessage(api, message.threadID, "*TrevorBot*\n\nRolled a "+val)
            }).catch(
                (err)=>
                {
                    if(err) console.error(err)
                }
            )
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID, "*TrevorBot*\n\nRolls a dice from 1 to any number\n&roll [number]\n\ndefault 2 if supplied parameter is invalid")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    //lock chat colors
    autocolor:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || !thread.active)
                return;
            if(params.length == 0 || (params.length > 0 && params[0] == "unlock"))
            {   
                thread.colorlock = false
                thread.color = null
                api.changeThreadColor(null, message.threadID, (err) => {
                    if(err) return console.error(err)
                });
                return
            }
            if(params[0] == "options")
            {
                sendMessage(api, message.threadID, "*TrevorBot*\n\n"+
                                                    "MessengerBlue   | none\n"+
                                                    "Viking          | #44bec7\n"+
                                                    "GoldenPoppy     | #ffc300\n"+
                                                    "RadicalRed      | #fa3c4c\n"+
                                                    "Shocking        | #d696bb\n"+
                                                    "PictonBlue      | #6699cc\n"+
                                                    "FreeSpeechGreen | #13cf13\n"+
                                                    "Pumpkin         | #ff7e29\n"+
                                                    "LightCoral      | #e68585\n"+
                                                    "MediumSlateBlue | #7646ff\n"+
                                                    "DeepSkyBlue     | #20cef5\n"+
                                                    "Fern            | #67b868\n"+
                                                    "Cameo           | #d4a88c\n"+
                                                    "BrilliantRose   | #ff5ca1\n"+
                                                    "BilobaFlower    | #a695c7\n\n"+
                                                    "Or &autocolor unlock to unlock");
                return
            }
            if(params[0] in manager.util.chatColorMap)
                params[0] = manager.util.chatColorMap[params[0].toString().toLowerCase()]
            else
                if(!thread.silent)
                {
                    sendMessage(api, message.threadID, "*TrevorBot*\n\nnot a valid thread color "+params[0])
                    return
                }
            api.changeThreadColor(params[0].color, message.threadID, (err) => {
                if(err)
                {
                    sendMessage(api, message.threadID, "*TrevorBot*\n\nnot a valid thread color "+params[0])
                    return
                }
                thread.colorlock = true;
                thread.color = params[0].color;
                if(!thread.silent)
                    sendMessage(api, message.threadID, "*TrevorBot*\n\nthread color locked to "+params[0].name);
            });
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID, "*TrevorBot*\n\nlock chat colors to a specific color\ntype &autocolor options to see all possible options\ntype &autocolor unlock to disable")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    credit:
    {
        command:true,
        call:function(api, message, params)
        {
            let thread = manager.getThreadByThreadID(message.threadID)
            if(!thread || thread.silent || !thread.active)
                return
            sendMessage(api, message.threadID, "*TrevorBot*\n\ncredits:\n\nSteven Zhao (inspo)\n\https://www.github.com/schmavery (API)")
                .catch(err=>{if (err) console.error(err)});
        },
        help:function(api, message)
        {
            sendMessage(api, message.threadID, "*TrevorBot*\n\nTrevorBot is a result of collaboration\n&credit sheds some light where credit is due!")
                .catch(err=>{if (err) console.error(err)});
        }
    },
    init:
    {
        command:false,
        call:function(api, thread)
        {
            api.sendMessage("*TrevorBot* started!\n\nType &help for more information", thread.threadID, (err, messageInfo) => {
                if(err) {if (err) console.error(err)};
            });
        }
    },
    initFailed:
    {
        command:false,
        call:function(api, thread)
        {
            sendMessage(api, thread, "*TrevorBot* failed to start")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    running:
    {
        command:false,
        call:function(api, thread)
        {
            sendMessage(api, thread, "*TrevorBot* is running")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    stopped:
    {
        command:false,
        call:function(api, thread)
        {
            sendMessage(api, thread, "*TrevorBot* is not running")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    close:{
        command:false,
        call:function(api, thread)
        {
            return new Promise(function(res, rej)
            {
                api.sendMessage("*TrevorBot* goodbye!", thread.threadID, (err, messageInfo) => {
                    if(err) rej(err);
                    res();
                });
            });
        }
    },
    unknown:
    {
        command:false,
        call:function(api, message, silent)
        {
            if(silent)
                return;
            sendMessage(api, message.threadID, "*TrevorBot*\n\nCommand not found\nType &help to see commands")
                .catch(err=>{if (err) console.error(err)})
        }
    },
    protected:
    {
        command:false,
        call:function(api, message, silent)
        {
            if(silent)
                return;
            sendMessage(api, message.threadID, "*TrevorBot*\n\nYou do not have permission to use this command")
                .catch(err=>{if (err) console.error(err)})
        }
    }
}

module.exports = {
    name:'default',
    responses:responses,
    init:init
}