module.exports = 
{
    version:"0.1",
    botName:"TrevorBot V0.1",
    chatColorMap:null,
    startTime:null,
    adminID:"",
    rebuildCommands:function(commandSet, protected)
    {
        let commands = {protected:protected,unprotected:{},all:{}}
        Object.keys(commandSet.responses).forEach(function(key, ind) {
            if(commandSet.responses[key].command)
            {
                commands.unprotected[key] = (protected[key] == null || (protected[key] && protected[key] == false))
                commands.all[key] = true
            }
        
        })
        return commands
    },   
    buildColorMap:function(threadColors)
    {
        let colorMap = {}
        Object.keys(threadColors).forEach(function(key, ind) {
            colorMap[key.toString().toLowerCase()] = {name:key,
                                                      color:threadColors[key]}
            if(!threadColors[key])
            {
                colorMap["none"] = {name:key,
                                    color:null}
                return
            }
            colorMap[threadColors[key].toString().toLowerCase()] = {name:key,
                                                                    color:threadColors[key]}
        });
        this.chatColorMap = colorMap
    },
    userIsInThread:function(id, thread, verbose = false)
    {

        if(!thread.participants)
        {
            console.error("Thread not properly initialized, returning")
            return [];
        }
        let matches = []
        let target = (verbose)?thread.participants.simple:thread.participants.verbose
        if(!target)
            return [];
        target.forEach(function(p)
        {
            if(p && p.userID == id || p.name.toLowerCase().indexOf(id.toString().toLowerCase()) == 0)
                matches.push(p)
        })
        return matches
    },
    mapParticipants:function(commandSet, thread, participants)
    {
        let mapped = {simple:[], verbose:[]}
        const _this = this
        Object.keys(participants).forEach(function(key, ind) {
            let userObj = participants[key]
            userObj.userID = key
            userObj.commands = {} 
            if(key == _this.userID)
                userObj.commands[commandSet.name] = thread.commands[commandSet.name].unprotected
            else
                userObj.commands[commandSet.name] = thread.commands[commandSet.name].all 
            userObj.commandSet = commandSet
            let simpleObject = {name:participants[key],userID:key}
            mapped.verbose.push(userObj)
            mapped.simple.push(userObj)
        }) 
        return mapped
    }
}