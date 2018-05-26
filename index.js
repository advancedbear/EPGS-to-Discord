// 必要モジュールの読み込み
const request   = require('request')
const exec      = require('child_process').exec
const fs        = require('fs')
const path      = require('path')
const iconv     = require('iconv-lite')
const Discord   = require('discord.js')
// EPGStationより渡される環境変数を定数に代入
const _recordedId = process.env.RECORDEDID
const _title = process.env.NAME
const _startAt = new Date(Number(process.env.STARTAT)).toLocaleTimeString("japanese")
const _endAt = new Date(Number(process.env.ENDAT)).toLocaleTimeString("japanese")
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//
// 利用者による設定フィールド
const _host = "http://192.168.1.100" // EPGStationの動作するアドレスをURL形式で入力
const _basicId = null // EPGStationでBASIC認証利用時はユーザー名を入力、非利用時はnullを指定
const _basicPass = null // EPGStationでBASIC認証利用時はパスワードを入力、非利用時はnullを指定
const _tsCheckPath = "tscheck.exe" // tscheck.exeのパスを指定（動作フォルダ直下を推奨）
const _Path = "D:\\" // 録画ファイルの保存フォルダを指定
// DiscordのWebhookアドレスを入力
const webhookURL = "https://discordapp.com/api/webhooks/417016048253140992/1eUAwZkqGpubVmk1It9SQW9dx6JGLCjm51Zff96UF0UpbSO5W-45ikYmzHzz8ulFED5H".split('/')
// 設定フィールド終わり
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//

// 設定内容からEPGStationのアドレス生成と、Webhookの呼び出しを行う
const _hostName = !_basicId ? _host : _basicId+':'+_basicPass+'@'+_host
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
    exec(path.resolve(_tsCheckPath)+' '+fileName, (err, stdout, stderr)=>{
        if(err) callback(null)
        else {
            let vPIDLine, maxTotal = 0
            fs.readFile(fileName+".log", (err, data)=>{
                let log = iconv.decode(data, 'utf8').split(/\r\n|\r|\n/)
                for(line of log) {
                    if(/pid=0x\d/.test(line)){
                        PIDLine = line.replace(/\s+/g,'').split(',')
                        if(maxTotal < Number(PIDLine[1].split('=')[1])){
                            vPIDLine = PIDLine
                        }
                    }
                }
                callback(vPIDLine)
            })
        }
    })
}

var postMessage = (message)=>{
    webhook.send(message)
}

getRecorded(_recordedId, (body)=>{
    prgInfo = JSON.parse(body)
    getChannel(prgInfo.channelId, (chBody)=>{
        chInfo = JSON.parse(chBody)
        if(process.argv[2] === 'start'){
            postMessage(':arrow_forward: __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+
            ''+chInfo.name+'］\n'+prgInfo.description+'```')
        }
        else if(process.argv[2] === 'end'){
            dropCheck(path.join(_Path,prgInfo.filename), (logLine)=>{
                mes = ":pause_button: "+' __**'+_title+'**__\n```'+_startAt+'～'+_endAt+'［'+
                +chInfo.name+'］\n'
                if(logLine != null) mes += logLine.join('\n')
                mes += '```'
                postMessage(mes)
                if(logLine != null && Number(logLine[2].slice(2)!=0)){
                    postMessage('<@263292188924968962> __**This MPEG-TS has dropped frame!!!**__')
                }
            })
        }
    })
})

fs.writeFile("./log.txt",JSON.stringify(process.env,undefined,4));