// 必要モジュールの読み込み
const exec      = require('child_process').execFile
const fs        = require('fs')
const path      = require('path')
const iconv     = require('iconv-lite')
const Discord   = require('discord.js')
// EPGStationより渡される環境変数を定数に代入
const _Path = process.argv[0] // 録画ファイルの保存フォルダを指定
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//
// 利用者による設定フィールド
var _config;
try {
    _config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"))
} catch (e) {
    console.error("config.json not found!")
    process.exit()
}
const _tsselect = path.join(__dirname, "tsselect") // tsselectの実行ファイルを指定（フォルダ直下に配置）
const webhookURL = _config.webhookURL.split('/') // DiscordのWebhookアドレス
// 設定フィールド終わり
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//

// 設定内容からEPGStationのアドレス生成と、Webhookの呼び出しを行う
const webhook = new Discord.WebhookClient(webhookURL[5],webhookURL[6])

// ファイルパスを与えるとTSファイルのドロップチェックを行う
// callback = ログ内の映像PID行をカンマ区切りにした配列
exec(_tsselect,[_Path], (err, stdout, stderr)=>{
    fs.writeFileSync("dropcheck.log", "stdout: "+stdout+"\nstderr: "+stderr)
    if(!err) {
        let PIDLine = []
        let result = iconv.decode(stdout, 'utf8').split(/\r\n|\r|\n/)
        for(line of result) {
            if(/pid=0x\d/.test(line)){
                PIDLine.push(JSON.parse('{"'+line.replace(/\s+/g,"").replace(/=/g, '":"').replace(/,/g, '", "')+'"}'))
            }
        }
        let vPIDLine = PIDLine.sort((a, b)=> {
            if (Number(a.total) > Number(b.total)) return -1
            if (Number(a.total) < Number(b.total)) return 1
            return 0
        })
        if(vPIDLine.d!='0'){
            mes = '\@everyone __**This MEPG-TS has dropped frame!!!**__\n'
            mes += '```Total:\t'+vPID.total+'\nDrop:\t'+vPID.d+'\nError:\t'+vPID.e+'\nScrmbling:\t'+vPID.scrambling+'```'
            webhook.send(mes)
        } else {
            webhook.send("_`This MPEG-TS has no drop.`_")
        }
    } else {
        webhook.send("Cannot load recorded file!")
    }
})