// 必要モジュールの読み込み
const request   = require('request')
const exec      = require('child_process').spawn
const fs        = require('fs')
const path      = require('path')
const iconv     = require('iconv-lite')
const Discord   = require('discord.js')
// EPGStationより渡される環境変数を定数に代入
const _channel = process.env.CHANNELNAME
const _title = process.env.NAME
const _description = process.env.DESCRIPTION
const _date = new Date(Number(process.env.STARTAT)).toLocaleDateString("japanese", {year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'})
const _startAt = new Date(Number(process.env.STARTAT)).toLocaleTimeString("japanese")
const _endAt = new Date(Number(process.env.ENDAT)).toLocaleTimeString("japanese")
const _Path = process.env.RECPATH // 録画ファイルの保存フォルダを指定
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//
// 利用者による設定フィールド
var _config;
try {
    _config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"))
} catch (e) {
    console.error("config.json not found!")
    process.exit()
}
const _host = _config.host // EPGStationの動作するホストアドレス
const _basicId = _config.basicId // EPGStationでBASIC認証利用時はユーザー名、非利用時はnullを指定
const _basicPass = _config.basicPass // EPGStationでBASIC認証利用時はパスワード、非利用時はnullを指定
const _tsselect = path.join(__dirname, "tsselect") // tsselectの実行ファイルを指定（フォルダ直下に配置）
const webhookURL = _config.webhookURL.split('/') // DiscordのWebhookアドレス
// 設定フィールド終わり
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//

// 設定内容からEPGStationのアドレス生成と、Webhookの呼び出しを行う
const _hostName = !_basicId ? "http://"+_host : "http://"+_basicId+':'+_basicPass+'@'+_host
const webhook = new Discord.WebhookClient(webhookURL[5],webhookURL[6])

var getRecorded = (recordedId, callback)=>{
    // 録画IDを用いてEPGStation API経由で録画番組情報を取得する
    request.get(_hostName+":8888/api/recorded/"+recordedId, (err, res, body)=>{
        !err ? callback(body): callback(err)
    })
}
var getChannel = (channelId, callback)=>{
    // チャンネルIDを用いてMirakurun API経由でチャンネル情報を取得する
    request.get(_hostName+":40772/api/services/"+channelId, (err, res, body)=>{
        !err ? callback(body): callback(err)
    })
}

var postMessage = (message)=>{
    webhook.send(message)
}

if(process.argv[2] === 'start'){
    postMessage(':arrow_forward: __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+
    ''+_channel+'］```')
}
else if(process.argv[2] === 'end'){
    postMessage(":pause_button: "+' __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+
    ''+_channel+'］```')
    let dropCheck = exec("C:\\PROGRA~1\\nodejs\\node.exe", [_Path], {cwd: __dirname, windowsHide:true})
    dropCheck.on('close', (code)=> {
        fs.appendFileSync("dropcheck.log", `child process exited with code ${code}`);
    })
}
else if(process.argv[2] === 'reserve'){
    postMessage(':new: __**'+_title+'**__\n```'+_date+' '+_startAt+'～'+_endAt+'［'+_channel+'］\n'+_description+'```')
}