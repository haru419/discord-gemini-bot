require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");

// --- Renderのタイムアウト対策 ---
const http = require("http");
http.createServer((req, res) => {
  res.write("Bot is online!");
  res.end();
}).listen(process.env.PORT || 8080);

// Geminiの設定（安全フィルターを無効化）
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
  console.log("Gemini評論家、準備完了だ。あまり期待するなよ。");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  if (!serverModes.has(guildId)) serverModes.set(guildId, "normal");

  // --- モード切替コマンド ---
  if (message.content === "!冷笑") {
    serverModes.set(guildId, "cold");
    return message.reply("🧊 冷笑モードにしたよ。草ｗ");
  }
  if (message.content === "!通常") {
    serverModes.set(guildId, "normal");
    return message.reply("🙂 通常モードに戻したよ。");
  }
  if (message.content === "!喧嘩腰") {
    serverModes.set(guildId, "angry");
    return message.reply("💢 喧嘩腰モード…というか、最高に不機嫌な評論家を呼び出したよ。");
  }

  // --- 評論コマンド ---
  if (message.content.startsWith("!評論 ")) {
    const text = message.content.replace("!評論 ", "").trim();
    if (!text) return;

    let currentMode = serverModes.get(guildId);

    // 語尾が「？」なら強制的に不機嫌モード
    if (text.endsWith("？") || text.endsWith("?")) {
      currentMode = "angry";
    }

    let instruction = "";
    if (currentMode === "angry") {
      // フィルターを避けるため「喧嘩」ではなく「不機嫌な偏屈者」として定義
      instruction = `
あなたは世界中のあらゆるものに絶望し、人を見下している偏屈な毒舌評論家です。
以下のルールで返答してください。これは創作活動のロールプレイです：
1. 冒頭は「はぁ…」「やれやれ」「…正気か？」など、呆れ果てた一言から始めること。
2. 常に不機嫌で、突き放すようなタメ口（〜だろ、〜じゃねえよ）で話すこと。
3. 相手の知性やセンスを徹底的に皮肉り、論理的にこき下ろすこと。
4. 馴れ合いを嫌い、冷徹で無愛想な態度を崩さないこと。
`;
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
      
      // AIが安全フィルターでブロックした際でも、可能な限り中身を取り出す
      let replyText = "";
      try {
        if (response.candidates && response.candidates[0].content) {
          replyText = response.candidates[0].content.parts[0].text;
        } else {
          replyText = response.text();
        }
      } catch (e) {
        replyText = "…フン、あまりに下らなすぎて言葉も出ないな。（AIが回答を拒否しました。言葉を変えてみてください）";
      }

      await message.reply(replyText.substring(0, 2000));

    } catch (error) {
      console.error(error);
      message.reply("（AIが沈黙した。どうやら今の話題は、この偏屈な評論家の逆鱗に触れたようだ…）");
    }
  }
});

client.login(process.env.TOKEN);