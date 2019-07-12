var express = require('express')
var bodyParser = require('body-parser')
const axios = require('axios');


var app = express()
const port = 3000
const AuthToken = 'xoxp-694017277831-694313039366-685825510785-e6613d934da6300a1f88bd470284b9e6';

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())


app.get('/', function(req, res){
    res.send('Message Terminator for Slack')
});

app.post('/', function(req, res){
    var payload = JSON.parse(req.body.payload);
    var channel = payload.channel.id;
    var user = payload.user.id;
    //console.log(channel+" "+user)
    getUsersMessagesInChannel(channel, user);
    res.sendStatus(200);
});

function getUsersMessagesInChannel(channel, user){
    
    axios.get('https://slack.com/api/conversations.history?token='+AuthToken+'&channel='+channel).then((res)=>{
        var timestamps = [];
        var messages = res.data.messages;
        //console.log(messages)
        messages.forEach(m => {
            if(m.user === user){
                timestamps.push(m.ts);
            }
        });
        //console.log(timestamps)   
        deleteUserMessages(channel, timestamps);    
    })

}

function deleteUserMessages(channel, timestamps){

   timestamps.forEach(t => {
        axios.post('https://slack.com/api/chat.delete',
        {
            channel: channel,
            ts: t
        },
        {
          headers:{  Authorization: "Bearer "+AuthToken}
        }
    ).then((res)=>{
        //console.log(res)
    });
   });
}

app.listen(port,()=>console.log('server running on port: '+port));