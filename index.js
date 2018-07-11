// 必要モジュールの読み込み
const request   = require('request')
const exec      = require('child_process').execFile
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
var dropCheck = (fileName, callback)=>{
    // ファイルパスを与えるとTSファイルのドロップチェックを行う
    // callback = ログ内の映像PID行をカンマ区切りにした配列
    exec(_tsselect,[fileName],{maxBuffer: 2048*1024} , (err, stdout, stderr)=>{
        if(!err) {
            let PIDLine = []
            let vPIDLine, maxTotal = 0
            let result = iconv.decode(stdout, 'utf8').split(/\r\n|\r|\n/)
            for(line of result) {
                if(/pid=0x\d/.test(line)){
                    PIDLine.push(JSON.parse('{"'+line.replace(/\s+/g,"").replace(/=/g, '":"').replace(/,/g, '", "')+'"}'))
                }
            }
            vPIDLine = PIDLine.sort((a, b)=> {
                if (Number(a.total) > Number(b.total)) return -1
                if (Number(a.total) < Number(b.total)) return 1
                return 0
            })
            callback(vPIDLine[0])
        } else {
            fs.writeFileSync("dropcheck.log", stdout+"\n"+stderr)
            callback(null)
        }
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
    mes = ":pause_button: "+' __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+_channel+'］\n'
    dropCheck(_Path, (vPID)=>{
        if(vPID==null) mes += "!===== Cannot load recorded file! =====!"
        else if(vPID.d!='0'){
            mes += "**!===== This MEPG-TS has dropped frame! =====!** \@everyone\n"
            mes += 'Total:\t'+vPID.total+'\nDrop:\t'+vPID.d+'\nError:\t'+vPID.e+'\nScrmbling:\t'+vPID.scrambling+'```\n'
        } else {
            mes += "!===== This MPEG-TS has no drop =====!"
        }
        postMessage(mes)
    })
}
else if(process.argv[2] === 'reserve'){
    postMessage(':new: __**'+_title+'**__\n```'+_date+' '+_startAt+'～'+_endAt+'［'+_channel+'］\n'+_description+'```')
}