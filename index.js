require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");

// Geminiの設定
// 使うモデルをここで1回だけ定義します（v1を指定）
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// index.js の 7行目あたり
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
const serverModes = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("読み込んだキー:", process.env.GEMINI_API_KEY ? "見つかりました！" : "空っぽです...");
  console.log("Gemini評論家、準備完了です！");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  if (!serverModes.has(guildId)) serverModes.set(guildId, "normal");

  // モード切替
  if (message.content === "!冷笑") {
    serverModes.set(guildId, "cold");
    return message.reply("🧊 冷笑モード（Gemini）にしたよ。草ｗ");
  }
  if (message.content === "!通常") {
    serverModes.set(guildId, "normal");
    return message.reply("🙂 通常モードに戻したよ。");
  }

  // 評論コマンド
  if (message.content.startsWith("!評論 ")) {
    const text = message.content.replace("!評論 ", "").trim();
    const currentMode = serverModes.get(guildId);

    let instruction = "";
    if (currentMode === "cold") {
      instruction = "あなたはネットの冷笑系評論家です。作品を煽りつつ「草」「うおw」などのスラングを使い、100点満点で採点してください。";
    } else {
      instruction = "あなたは理知的な評論家です。良い点と改善点を論理的に述べてください。";
    }

    try {
      await message.channel.sendTyping();

      // AIに内容を生成してもらう（ここをスッキリ整理しました）
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: instruction + "\n\nターゲットテキスト: " + text }] }]
      });

      const response = await result.response;
      const replyText = response.text();

      await message.reply(replyText.substring(0, 2000));

    } catch (error) {
      console.error("--- エラー発生 ---");
      console.error(error);
      message.reply("AIが何かに怯えています（設定を確認してね）");
    }
  }
});

client.login(process.env.TOKEN);