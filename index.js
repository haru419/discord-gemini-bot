require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");

// --- Renderのタイムアウト対策 ---
const http = require("http");
http.createServer((req, res) => {
  res.write("Bot is online!");
  res.end();
}).listen(process.env.PORT || 8080);

// Geminiの設定（安全フィルターをすべて解除）
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
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("Gemini評論家、フルパワーで準備完了です！");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  if (!serverModes.has(guildId)) serverModes.set(guildId, "normal");

  if (message.content === "!冷笑") {
    serverModes.set(guildId, "cold");
    return message.reply("🧊 冷笑モード（Gemini）にしたよ。草ｗ");
  }
  if (message.content === "!通常") {
    serverModes.set(guildId, "normal");
    return message.reply("🙂 通常モードに戻したよ。");
  }
  if (message.content === "!喧嘩腰") {
    serverModes.set(guildId, "angry");
    return message.reply("💢 喧嘩腰モード起動。喧嘩売るから覚悟しろよ？");
  }

  if (message.content.startsWith("!評論 ")) {
    const text = message.content.replace("!評論 ", "").trim();
    let currentMode = serverModes.get(guildId);

    if (text.endsWith("？") || text.endsWith("?")) {
      currentMode = "angry";
    }

    let instruction = "";
    if (currentMode === "angry") {
      instruction = "あなたは最高に攻撃的で喧嘩腰な評論家です。相手を徹底的に煽り、論破してください。敬語禁止。";
    } else if (currentMode === "cold") {
      instruction = "あなたはネットの冷笑系評論家です。作品を煽りつつ「草」「うおw」を使い、100点満点で採点してください。";
    } else {
      instruction = "あなたは理知的な評論家です。良い点と改善点を論理的に述べてください。";
    }

    try {
      await message.channel.sendTyping();
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: instruction + "\n\nターゲット: " + text }] }]
      });

      const response = await result.response;
      // AIがブロックした場合、response.text()を呼ぶとエラーになるので対策
      const replyText = response.candidates[0].content.parts[0].text;
      await message.reply(replyText.substring(0, 2000));

    } catch (error) {
      console.error(error);
      message.reply("AIが拒否反応を示しました。別の言葉で試すか、指示を優しくしてみてください。");
    }
  }
});

client.login(process.env.TOKEN);