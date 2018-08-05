// 必要モジュールの読み込み
const request   = require('request')
const exec      = require('child_process').execFile
const fs        = require('fs')
const path      = require('path')
const iconv     = require('iconv-lite')
const Discord   = require('discord.js')
// EPGStationより渡される環境変数を定数に代入
const _nowDate = new Date();
const _channel = process.env.CHANNELNAME
const _title = process.env.NAME
const _description = process.env.DESCRIPTION
const _programid = process.env.PROGRAMID
const _recordedid = process.env.RECORDEDID
const _date = new Date(Number(process.env.STARTAT)).toLocaleDateString("japanese", {year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'})
const _startAt = new Date(Number(process.env.STARTAT)).toLocaleTimeString("japanese")
const _endAt = new Date(Number(process.env.ENDAT)).toLocaleTimeString("japanese")
const _Path = process.env.RECPATH // 録画ファイルの保存フォルダを指定

// コンフィグファイルの読み込み
var _config;
try {
    _config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"))
} catch (e) {
    console.error("config.json not found!")
    process.exit()
}
const _host = _config.host // EPGStationの動作するホストアドレス
const _hostName = !_config.basicId ? "http://"+_host : "http://"+_config.basicId+':'+_config.basicPass+'@'+_host //動作ホストのアドレス（BASIC認証対応）
const webhookURL = _config.webhookURL.split('/') // DiscordのWebhookアドレス
const webhook = new Discord.WebhookClient(webhookURL[5],webhookURL[6]) //Discord Webhookの初期化

var getRecorded = (recordedId, callback)=>{
    // 録画IDを用いてEPGStation API経由で録画番組情報を取得する
    request.get(_hostName+":8888/api/recorded/"+recordedId, (err, res, body)=>{
        !err ? callback(body): callback(err)
    })
}
var getProgram = (programlId, callback)=>{
    // 番組IDを用いてMirakurun API経由で番組情報を取得する
    request.get(_hostName+":40772/api/programs/"+programlId, (err, res, body)=>{
        !err ? callback(body): callback(err)
    })
}
var dropCheck = (callback)=>{
    // ドロップ情報を取得して返す
    let recInfo = getRecorded(_recordedid, (json)=>{
        try{
            callback(json.errorCnt, json.dropCnt, json.scramblingCnt)
        } catch(e) {
            callback(-1, -1 ,-1)
        }
    })
}

var postMessage = (message)=>{
    webhook.send(message) // WebHookでmessageを送信するだけ
}

if(process.argv[2] === 'start'){
    // 録画開始時に投稿するメッセージ
    postMessage(':arrow_forward: __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+_channel+'］```')
}
else if(process.argv[2] === 'end'){
    // 録画終了時に投稿するメッセージ
    mes = ":pause_button: "+' __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+_channel+'］\n'
    dropCheck((err, drop, scr)=>{
        if(err==-1) mes += "!===== Cannot load recorded file! =====!```" // 実行結果がnullの場合
        else if(err!='0'){
            // 映像PIDのd値（ドロップ値）が0でない場合≒ドロップがある場合は詳細を投稿（メンション付き）
            mes += "!===== This MEPG-TS has dropped frame! =====!\n"
            mes += 'Error:     '+err+'\nDrop:      '+drop+'\nScrmbling: '+scr+'```\@everyone'
        } else {
            // 映像PIDのd値が0の場合はドロップがないのでその旨を投稿
            mes += "!===== This MPEG-TS has no drop =====!```"
        }
        postMessage(mes)
    })
}
else if(process.argv[2] === 'reserve'){
    // 録画予約時に投稿するメッセージ
    postMessage(':new: __**'+_title+'**__\n```'+_date+' '+_startAt+'～'+_endAt+'［'+_channel+'］\n'+_description+'```')
}