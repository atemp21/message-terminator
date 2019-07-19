var express = require('express')
var bodyParser = require('body-parser')
const axios = require('axios');
const querystring = require('querystring');
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DB
});


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
    res.sendFile('index.html', {
        root: __dirname
    });
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
    var c = req.query.code;
    var state = req.query.state;
    var token;
    var user;
    var team;
    try {
        if (state === "real") {
            axios.post('https://slack.com/api/oauth.access', querystring.stringify({
                    client_id: process.env.CLIENT_ID,
                    client_secret: process.env.CLIENT_SECRET,
                    code: c,
                    redirect_uri: 'https://message-terminator.herokuapp.com/auth/redirect'
                }))
                .then(res => {
                    token = res.data.access_token;
                    user = res.data.user_id;
                    team = res.data.team_id;

                })

            connection.connect();

            connection.query('INSERT INTO Tokens(token, user_id, team_id) values(?,?,?)', [token, user, team], function (err, rows, fields) {
                if (err) console.log(err)
            });
            connection.end();
            res.sendStatus(200);
        }
    } catch (err) {
        console.log(err);
    }
})

//action button pressed post
app.post('/', async function (req, res) {
    var payload = JSON.parse(req.body.payload);
    var channel = payload.channel.id;
    var user = payload.user.id;
    var response_url = payload.response_url;
    var team = payload.team.id;

    await axios.post(response_url, {
        text: "Deleting your messages",
        response_type: 'ephermal'
    })
    await getUsersMessagesInChannel(channel, user, team, response_url);
    res.sendStatus(200)

});


async function getUsersMessagesInChannel(channel, user, team, r) {

    var token;
    try {
        connection.connect();
        await connection.query('SELECT token from Tokens where user_id=? or team_id=?', [user, team], function (errors, results, fields) {
            token = results[0].token;

            await axios.get('https://slack.com/api/conversations.history?token=' + token + '&channel=' + channel)
                .then((res) => {
                    var timestamps = [];
                    var messages = res.data.messages;
                    messages.forEach(m => {
                        if (m.user === user) {
                            timestamps.push(m.ts);
                        }
                    });

                    await deleteUserMessages(channel, timestamps, r, token);
                })
        })
        connection.end();
    } catch (err) {
        console.log(err)
    }



}

async function deleteUserMessages(channel, timestamps, url, token) {
    try {
        await timestamps.forEach(t => {
            axios.post('https://slack.com/api/chat.delete', {
                channel: channel,
                ts: t
            }, {
                headers: {
                    Authorization: "Bearer " + token
                }
            })
        });
    } catch (err) {
        console.log(err)
    }

}

app.listen(port, () => console.log('server running on port: ' + port));