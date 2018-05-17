const login = require("facebook-chat-api")
const manager = require("./manager.js");
const fs = require("fs")
//ThreadBot managed threads
let userID = ""
let exitDebounce = false;


let threads = manager.threads;
const WORD_PATTERN = /\S+/g


//login(JSON.parse(fs.readFileSync("credentials.json","utf-8")), (err, api) => {
//login({appState:JSON.parse(fs.readFileSync("appstate.json","utf-8"))}, (err, api) => {
manager.bot_login((err,api)=> {
    if(err)
        return console.error(err);
    fs.writeFileSync("appstate.json", JSON.stringify(api.getAppState()), "utf-8")
    userID = api.getCurrentUserID();
    manager.setuserID(userID);
    
    api.setOptions({
        selfListen: true,
        logLevel: "silent",
        listenEvents: true
    });

    function init()
    {
        console.log(manager.botName+" is coming online");
        manager.init(api)
        console.log("Thread Manager Initialized")
        manager.util.adminID = userID
        var lines = process.stdout.getWindowSize()[1];
        threads.forEach(function(thread)
        {
            manager.addThread(api,thread.threadID)
            .then(x=>{
                thread.defaultCommandSet.init.call(api, thread)
            }).catch(err=>{
                if(err == 0)
                {
                    thread.defaultCommandSet.running.call(api, thread)
                    return
                }
                thread.defaultCommandSet.initFailed.call(api,thread)
                return console.error(err);
            })
        });   
    }

    init();
    
    api.listen((err, message) => {
        if(err) 
            return console.error(err);
        let thread = null
        let sender = null
        let isAdmin = false
        if(message && message.threadID)
        {
            thread = manager.getThreadByThreadID(message.threadID)
            if(thread && thread.participants && message.senderID)
                sender = manager.util.userIsInThread(message.senderID, thread, true)[0]
        }
        if(message && message.body) {
            console.log("[New Message] Thread ID : "+message.threadID);
            let words = []
            let words_case = []
            while ((match = WORD_PATTERN.exec(message.body)) != null) {
                words_case.push(match[0])
                words.push(match[0].toLowerCase());
            }
            words[0] = words[0].substring(1)
            if(message.body.charAt(0) == "&")
            {
                const command = words[0];
                words.shift()
                words_case.shift()
                
                let responseSet = manager.commandSets.default
                if(thread && !sender)
                    responseSet = thread.defaultCommandSet
                else if(thread && sender)
                    responseSet = sender.commandSet

                try
                {
                    if(responseSet.responses[command] && responseSet.responses[command].command)
                    {
                        if(thread && sender && !sender.commands[responseSet.name][command])
                        {
                            responseSet.responses["protected"].call(api, message, thread.silent)
                            return
                        }
                        if(responseSet.responses[command].case)
                            responseSet.responses[command].call(api, message, words_case)
                        else
                            responseSet.responses[command].call(api, message, words)
                    }
                    else
                        if(responseSet.responses[command])
                            throw new Error("attempted to access a protected command");
                }catch(err)
                {
                    if(!responseSet)
                        responseSet.responses = manager.commandSets.default.responses
                    if(thread)
                        responseSet.responses["unknown"].call(api, message, thread.silent)
                    console.error(err);
                    return
                }
            }else{
                if(thread)
                {
                    if(!thread.active || thread.silent)
                        return
                    if( message.type == "message" && thread.react && (message.senderID != userID))
                        api.setMessageReaction(thread.react, message.messageID, (err)=>console.error(err));
                }
            }
        }
        if(thread && message.type == "event")
        {
            if(thread.colorlock && message.logMessageType == "log:thread-color")
            {
                api.changeThreadColor(thread.color, message.threadID, (err) => {
                    if(err) return console.error(err);
                });
            }
        }
        
    });

    function exitHandler(options, err)
    {
        if(exitDebounce)
            return;
        exitDebounce = true;
        let promises = [];
        threads.forEach(function(thread)
        {
            promises.push(new Promise(function(res, rej)
            {
                manager.stopThread(api, thread.threadID).then(_=>{
                    thread.defaultCommandSet.responses.close.call(api, thread).then(_=>{
                        res()
                    })
                    .catch(err=>rej(err))
                })
                .catch(err=>{
                    if(err == 0)
                    {
                        res()
                    }
                    rej(err)
                })
            }));
        });
        Promise.all(promises).then(x=>{
            console.log("Exiting "+manager.botName+"!");
            process.exit();
        }).catch(err =>{
            console.error(err);
            process.exit();
        });
    }
    //handle app closing
    process.on('exit', exitHandler.bind(null,{exit:true}));
    process.on('SIGINT', exitHandler.bind(null, {exit:true}));
    process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
    process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
    process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
});