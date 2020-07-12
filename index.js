const fetch = require('isomorphic-unfetch')

require('dotenv').config()

/*
*   MongoDB
*/

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://" + process.env.MDB_USER + ":" + process.env.MDB_PASS + "@minare0.eswxz.mongodb.net/";

async function MDBFindOne(filter) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true });
    const collection = client.db(process.env.MDB_DB).collection('esed');
    const result = await collection.findOne(filter);
    client.close();
    return result;
}

async function MDBFind(filter) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, poolSize: 10 });
    const collection = client.db(process.env.MDB_DB).collection('esed');
    const result = await collection.find(filter).toArray();
    client.close();
    return result;
}

/*
*   Сервер
*/

const express = require('express')
const server = express()
const cors = require('cors')
const port = process.env.PORT || 3000

server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.listen(port, function () {
    console.log(`Сервер запущен на ${port} порту\n`);
});

/*
*   API
*/

server.get('/', function (req, res) {
    res.send('Точка интеграции ботов.');
});

//  ESED

server.get('/api/esed', function (req, res) {
    res.json({ version: process.env.SCRIPT_VERSION });
});

server.post('/api/esed', function (req, res) {
    esed(req.body);
    res.status(200).json({ 'status': 'OK' });
});

/*
*   Telegram
*/

// const { Telegraf, Extra } = require('telegraf')
// const bot = new Telegraf(process.env.BOT_TOKEN)
// bot.launch()

// bot.on('message', (ctx) => {
//     console.log(ctx.message.chat)
//     //ctx.reply(ctx.message.text)
// })

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/ban/, async (msg) => {
    console.log('================Ban Message================');
    const list = await MDBFind({ tg: '' });
    let str = '';
    list.forEach(item => {
        str += item.name + '\n';
    });
    sendMessage(msg.from.id, str);
});

bot.on('message', (msg) => {
    console.log('================New Message================');
    console.log(`UserID = ${msg.from.id}\nUsername = ${msg.from.username}\nMsg = ${msg.text}`);
    bot.sendMessage(msg.from.id, msg.text);
});

const debug = process.env.BOT_PRIVATE;

/*
*   Functions
*/

async function esed(data) {
    //Точка входа
    console.log("==================ESED==================");
    console.log(data);
    //Ссылка на РК и Автора
    let str = `<a href=\"${data.url}\">${data.title}</a>\n================\n<a href="tg://user?id=${data.from}">`;
    console.log("=================MongoDB=================");
    const info = await MDBFindOne({ "tg": data.from });
    console.log(info)
    if (info !== null) {
        str += `${info.name}</a> `;
    }
    else {
        str += `Неизвестный пользователь</a> `;
    }
    //Проверка типа сообщения
    if (data.type == 'visa' || data.type == 'sign') {
        if (data.type == 'visa') {
            str += `<i>завизировал(а)</i>\n================\n<i>${data.status}</i>`;
        }
        else {
            str += `<i>подписал(а)</i>\n================\n<i>${data.status}</i>`;
        }
        if (data.comment != undefined) {
            str += `\n================\n<i>Комментарий</i>: ${data.comment}`;

        }
        let authors = data.author.split(',');
        for (var i = 0; i < authors.length; i++) {
            const item = await MDBFindOne({ name: authors[i] });
            if (item !== null) {
                if (process.env.MODE == 'debug') {
                    sendMessage(debug, str);
                }
                else {
                    sendMessage(item.tg, str);
                }
            }

        }
    }
    else if (data.type == 'visa-send' || data.type == 'sign-send') {
        if (data.type == 'visa-send') {
            str += `<i>отправил(а) на визу</i>\n================`;
        }
        else {
            str += `<i>отправил(а) на подпись</i>\n================`;
        }
        if (info == undefined || !info.super) {
            let authors = data.list.split(',');
            let tmp = '', list = [];
            for (let i = 0; i < authors.length; i++) {
                const item = await MDBFindOne({ name: authors[i] });
                if (item !== null) {
                    tmp += `\n<a href="tg://user?id=${item.tg}">${item.name}</a>`;
                    list.push(item.tg);
                }
                else {
                    tmp += '\n' + authors[i];
                }
            }
            for (let i = 0; i < list.length; i++) {
                if (process.env.MODE == 'debug') {
                    sendMessage(debug, str);
                }
                else {
                    sendMessage(list[i], str + tmp);
                }
            }
        }
    }
    else {
        let reg = new RegExp(/.*ознакомлен.*/i);
        if (info == undefined || !info.super) {
            str += `<i>ввел(а) отчет:</i>\n================\nСтатус: <i>${data.status}</i>\n\n`;
            if (data.text != undefined && !reg.test(data.text.substring(0, 10).toLowerCase())) {
                str += data.text;
                if (process.env.MODE == 'debug') {
                    sendMessage(debug, str);
                }
                else {
                    sendMessage(data.from, str + tmp);
                }
            }
        }
    }
}

function sendMessage(chatId, message) {
    console.log("==================Telegram==================");
    bot.sendMessage(chatId, message, { disable_web_page_preview: true, parse_mode: "HTML" }).catch((error) => {
        bot.sendMessage(debug, error, { disable_web_page_preview: true, parse_mode: "HTML" });
    });
    console.log(`Сообщение отправлено.`);
}