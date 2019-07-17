var express = require('express')
var bodyParser = require('body-parser')
const axios = require('axios');
var mysql = require('mysql');
var connection = mysql.createConnection(process.env.jAWSDB_URL);


var app = express()
const port = process.env.PORT || 8080

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json())

app.use(express.static(__dirname, ''));

//homepage of app
app.get('/', function (req, res) {
    res.sendFile('index.html');
});

//privacy policy page
app.get('/privacy', function (req, res) {
    res.sendFile('privacy.html', {
        root: __dirname
    })
})

//authorize direct install url for slack
app.get('/auth', function (req, res) {
    var state = "real";
    var scope = "incoming-webhook";
    var client_id = process.env.CLIENT_ID;
    var rurl = 'https://message-terminator.herokuapp.com/auth/redirect';
    var redirect = "https://slack.com/oauth/authorize?client_id=" + client_id + "&scope=" + scope + "&state=" + state + "&redirect_uri=" + rurl;
    res.redirect(302, redirect);
})

//authorization redirect 
app.get('/auth/redirect', function (req, res) {
    var code = req.query.code;
    var state = req.query.state;
    if (state === "real") {
        axios.post('https://slack.com/api/oauth.access', {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code: code
            })
            .then(res => {
                console.log(res);
                connection.connect();

                // connection.query('SELECT 1 + 1 AS solution', function (err, rows, fields) {
                //     if (err) throw err;

                //     console.log('The solution is: ', rows[0].solution);
                // });

                connection.end();
            })
    }
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