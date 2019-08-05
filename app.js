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
 //connection = mysql.createConnection('mysql://wz6ox4j1cv97xzq4:h3ntg3h9hrgc3kne@etdq12exrvdjisg6.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/yymaofrai0o0vwvx');

var app = express()
const port = process.env.PORT || 8080
const path = 'https://message-terminator.herokuapp.com';
const clientid = process.env.CLIENT_ID;
const clientsecret = process.env.CLIENT_SECRET;

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
        root: __dirname,
    })
})

app.get('/install', function(req,res){
    res.sendFile('install.html', {
        root:__dirname
    })
})

//authorize direct install url for slack
app.get('/auth', function (req, res) {
    var state = "real";
    var scope = "commands";
    var client_id = clientid;
    var rurl = path+'/auth/redirect';
    var redirect = "https://slack.com/oauth/authorize?client_id=" + client_id + "&scope=" + scope + "&state=" + state + "&redirect_uri=" + rurl;
    res.redirect(302, redirect);
})

//authorization redirect 
app.get('/auth/redirect', async function (req, res) {
    var c = req.query.code;
    var state = req.query.state;
    var token;
    var user;
    var team;
    try {
        if (state === "real") {
            await axios.post('https://slack.com/api/oauth.access', querystring.stringify({
                    client_id: clientid,
                    client_secret: clientsecret,
                    code: c,
                    redirect_uri: path+'/auth/redirect'
                }))
                .then(res => {
                    token = res.data.access_token;
                    user = res.data.user_id;
                    team = res.data.team_id;

                })

            connection.query('INSERT INTO Tokens(token, user_id, team_id) values(?,?,?)', [token, user, team], function (err, rows, fields) {
                if (err) console.log(err)
            });
            res.redirect(302, path+'/install');
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Unable to authorize your Slack. Try again or contact support for help");
    }
})

//action button pressed post
app.post('/', async function (req, res) {
    var payload = JSON.parse(req.body.payload);
    var channel = payload.channel.id;
    var user = payload.user.id;
    var response_url = payload.response_url;
    var team = payload.team.id;
    try {
        await axios.post(response_url, {
            text: "Deleting your messages",
            response_type: 'ephermal'
        })
        await getUsersMessagesInChannel(channel, user, team, response_url);
        res.sendStatus(200)
    } catch (err) {
        console.log(err)
    }
});


async function getUsersMessagesInChannel(channel, user, team, r) {

    var token = await getUserToken(user, team);
    var res = await axios.get('https://slack.com/api/conversations.history?token=' + token + '&channel=' + channel);

    if(token == null){ 
        res.redirect(302, 'https://slack.com/oauth/authorize?client_id=694017277831.691698556484&scope=channels:history,commands,im:history,chat:write:user,chat:write:bot,channels:read,groups:history,groups:read,im:read,channels:write,groups:write,im:write,mpim:history,mpim:read,mpim:write');
    }

    var timestamps = [];
    var messages = await res.data.messages;
    messages.forEach(m => {
        if (m.user === user) {
            timestamps.push(m.ts);
        }
    })

    deleteUserMessages(channel, timestamps, r, token);


}

async function getUserToken(user, team) {
    return new Promise(function(resolve, reject){
        connection.query('SELECT token from Tokens where user_id=?', [user], function(error, results, fields){
            if(error) return reject(error)
            resolve(results[0].token)
        });
    })

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