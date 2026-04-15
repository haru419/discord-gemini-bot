require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");

// --- Renderのタイムアウト対策（ここから） ---
// RenderのWeb Serviceが「起動失敗」と判断するのを防ぐためのダミーサーバー
const http = require("http");
http.createServer((req, res) => {
  res.write("Bot is online!");
  res.end();
}).listen(process.env.PORT || 8080);
// --- Renderのタイムアウト対策（ここまで） ---

// Geminiの設定
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// サーバーごとのモードを保存する（メモリ上）
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

  // --- モード切替コマンド ---
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

  // --- 評論コマンド ---
  if (message.content.startsWith("!評論 ")) {
    const text = message.content.replace("!評論 ", "").trim();
    
    // 現在のモードを取得
    let currentMode = serverModes.get(guildId);

    // 語尾が「？」または「?」なら強制的に喧嘩腰モードへ
    if (text.endsWith("？") || text.endsWith("?")) {
      currentMode = "angry";
    }

    let instruction = "";

    // モード判定
    if (currentMode === "angry") {
      instruction = `
あなたは今、最高に機嫌が悪く、非常に攻撃的で喧嘩腰な評論家です。
相手の発言に対して、以下のルールで返答してください：
1. まず「は？」「何言ってんだお前？」といった煽りから入ること。
2. 相手が質問（？）をしてきた場合は「そんなことも自分で考えられないのか」「質問してんじゃねえよ」と徹底的に見下すこと。
3. 敬語は一切禁止。荒々しいタメ口（〜だろ、〜じゃねえよ）を使うこと。
4. 知能は高いので、論理的に相手を絶望させること。
`;
    } else if (currentMode === "cold") {
      instruction = "あなたはネットの冷笑系評論家です。作品を煽りつつ「草」「うおw」などのスラングを使い、100点満点で採点してください。";
    } else {
      instruction = "あなたは理知的な評論家です。良い点と改善点を論理的に述べてください。";
    }

    try {
      await message.channel.sendTyping();

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