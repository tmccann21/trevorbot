const login = require("facebook-chat-api")
const fs = require("fs")

let userID = "";

const version = "0.1"
const botName = "TrevorBot V"+version;
const util = require('./util.js')

const credentials = JSON.parse(fs.readFileSync("credentials.json","utf-8"))

module.exports = {
    threads:[],
    version:util.version,
    botName:util.botName,
    util:util,
    credentials:credentials,
    commandSets:{default:require("./responses.js")},
    bot_login:function(callback)
    {
        let data
        let flag = false
        try
        {
            data = JSON.parse(fs.readFileSync("appstate.json","utf-8"))
        }catch(err)
        {
            console.log("failed to read appstate - logging in with credentials")
            login(credentials.login, callback)
            return
        }
        login({appState:data}, (err, api) => {
            if(err)
            {
                if(flag)
                    return
                console.log("appstate expired - logging in with credentials")
                login(credentials.login, callback)
            }else{
                if(flag)
                    return
                console.log("appstate valid - logged in")
                flag = true
                return callback(err,api)
            }
        })
    },
    init:function(api)
    {
        this.util.buildColorMap(api.threadColors)
        this.util.startTime = new Date().getTime()
        const _this = this;
        Object.keys(this.commandSets).forEach(function(key)
        {
            _this.commandSets[key].init(_this);
        });
    },
    getThreadByThreadID:function(id)
    {
        for(var i = 0; i < this.threads.length; i++)
        {
            if(this.threads[i].threadID == id)
                return this.threads[i];        
        }
        return null;
    },
    setuserID:function(id)
    {
        userID = id;
    },
    
    addThread:function(api, id)
    {
        let _this = this
        return new Promise(function(res, rej)
        {
            let lob = _this.getThreadByThreadID(id);
            if(lob)
            {
                if(lob.active)
                {
                    rej(0)
                    return
                }
                lob.active = true
                api.changeNickname(_this.botName, lob.threadID, userID, (err) => {
                    if(err) 
                        rej(err)
                });
                res(lob)
                return
            }
            let newThread = {};
            newThread.threadID = id
            newThread.data = {}
            newThread.active = true
            newThread.silent = false
            newThread.react = null
            newThread.colorlock = false
            newThread.color = null
            newThread.defaultCommandSet = _this.commandSets.default
            newThread.commands = {}
            newThread.commands[_this.commandSets.default.name] = _this.util.rebuildCommands(_this.commandSets.default, {bitly:true,promote:true,demote:true,give:true,take:true})
            newThread.participants = {}
            api.getThreadInfo(id, (err, info)=>{
                if(err) 
                    rej(err)
                newThread.data = info;
                api.getUserInfo(info.participants, (err, obj)=>
                {
                    if(err) return console.error(err)
                    newThread.participants = _this.util.mapParticipants(newThread.defaultCommandSet, newThread, obj)
                })
                console.log("Activated for thread "+id);
                if(info.nicknames)
                {
                    const nickname = info.nicknames[userID];
                    newThread.nickname = ((nickname==_this.botName)?"Trevor McCann":nickname)
                }
                api.changeNickname(botName, id, userID, (err) => {
                    if(err) 
                        rej(err);
                });
            });
            _this.threads.push(newThread);
            res(newThread)
        })
    },

    stopThread:function(api, id)
    {
        let _this = this
        return new Promise(function(res, rej)
        {
            let thread = _this.getThreadByThreadID(id)
            if(!thread)
                return
            if(!thread.active)
            {
                rej(0)
                return
            }
            thread.active = false;
            api.changeNickname(thread.nickname, id, userID, (err) => {
                if(err) 
                    rej(err);
            });
            res();
        })
    }
};