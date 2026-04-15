require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// --- Render タイムアウト対策 ---
http.createServer((req, res) => {
  res.write("Bot is online!");
  res.end();
}).listen(process.env.PORT || 8080);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ],
});

const serverModes = new Map();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // ← これが重要！
  ]
});

client.once("ready", () => {
  console.log(`${client.user.tag} がログインした。用があるなら呼べ。`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  if (!serverModes.has(guildId)) serverModes.set(guildId, "normal");

  if (message.content === "!冷笑") {
    serverModes.set(guildId, "cold");
    return message.reply("🧊 冷笑モード。草ｗ");
  }
  if (message.content === "!通常") {
    serverModes.set(guildId, "normal");
    return message.reply("🙂 通常モード。");
  }
  if (message.content === "!喧嘩腰") {
    serverModes.set(guildId, "angry");
    return message.reply("💢 不機嫌モード。あまり喋りかけんなよ。");
  }

  if (message.content.startsWith("!評論 ")) {
    const text = message.content.replace("!評論 ", "").trim();
    
    // 文字が読み取れていない場合のデバッグ
    if (!text) return message.reply("（…中身が聞こえないな。設定のMessage Content Intentを確認しろ）");

    let currentMode = serverModes.get(guildId);
    if (text.endsWith("？") || text.endsWith("?")) currentMode = "angry";

    let roleDescription = "";
    if (currentMode === "angry") {
      roleDescription = "君は不機嫌で毒舌な評論家だ。タメ口で、相手の知性を疑うような皮肉を言え。";
    } else if (currentMode === "cold") {
      roleDescription = "君はネットの冷笑系だ。草wを使い、100点満点で冷酷に採点しろ。";
    } else {
      roleDescription = "君は理知的な評論家だ。論理的に分析しろ。";
    }

    try {
      await message.channel.sendTyping();
      const result = await model.generateContent(`${roleDescription}\n\n対象: ${text}`);
      const response = await result.response;
      const replyText = response.text();

      await message.reply(replyText || "…フン、語る価値もない。");

    } catch (error) {
      console.error(error);
      message.reply("（…チッ、AIがへそを曲げやがった。言葉を変えな）");
    }
  }
});

client.login(process.env.TOKEN);