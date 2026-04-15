require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// Renderのポート開放
http.createServer((req, res) => {
  res.write("Online");
  res.end();
}).listen(process.env.PORT || 8080);

console.log("--- 起動プロセス開始 ---");

if (!process.env.TOKEN) {
  console.error("エラー: TOKEN が環境変数に設定されていません！");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("=========================================");
  console.log(`成功: ${client.user.tag} としてログインしました！`);
  console.log("=========================================");
});

// エラーが起きたらログに出す
client.on("error", (err) => console.error("Discord接続エラー:", err));

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("!評論")) return;

  const text = message.content.replace("!評論", "").trim();
  if (!text) return message.reply("内容を書いてください。");

  try {
    await message.channel.sendTyping();
    const result = await model.generateContent("お前は毒舌な評論家だ。短く批判しろ：\n" + text);
    const response = await result.response;
    await message.reply(response.text());
  } catch (error) {
    console.error("実行エラー:", error);
    message.reply("AIが拒絶しました。");
  }
});

client.login(process.env.TOKEN).catch(err => {
  console.error("ログイン失敗:", err.message);
});