var express = require('express')
var bodyParser = require('body-parser')
const axios = require('axios');


var app = express()
const port = process.env.PORT || 8080
const AuthToken = process.env.AUTH_TOKEN;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json())

app.use(express.static(__dirname, ''));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

app.get('/privacy', function(req,res){
    res.sendFile('privacy.html',{root:__dirname})
})

app.post('/', async function (req, res) {
    var payload = JSON.parse(req.body.payload);
    var channel = payload.channel.id;
    var user = payload.user.id;
    var response_url = payload.response_url;

 await axios.post(response_url, {
        text: "Deleting your messages",
        response_type: 'ephermal'
    })
    await getUsersMessagesInChannel(channel, user, response_url);
    res.sendStatus(200)
   

});

async function getUsersMessagesInChannel(channel, user, r) {

    await axios.get('https://slack.com/api/conversations.history?token=' + AuthToken + '&channel=' + channel).then((res) => {
        var timestamps = [];
        var messages = res.data.messages;
        console.log(messages)
        messages.forEach(m => {
            if (m.user === user) {
                timestamps.push(m.ts);
            }
        });

        deleteUserMessages(channel, timestamps, r);
    })

}

async function deleteUserMessages(channel, timestamps, url) {

    await timestamps.forEach(t => {
        axios.post('https://slack.com/api/chat.delete', {
            channel: channel,
            ts: t
        }, {
            headers: {
                Authorization: "Bearer " + AuthToken
            }
        }).then((res) => {

        });
    });

}

app.listen(port, () => console.log('server running on port: ' + port));