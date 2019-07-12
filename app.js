var express = require('express')
var bodyParser = require('body-parser')
const axios = require('axios');


var app = express()
const port = process.env.PORT || 8080
const AuthToken = process.env.AUTH_TOKEN;

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