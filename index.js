require("dotenv").config();

const { Client, IntentsBitField } = require("discord.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const Enmap = require("enmap");

const db = new Enmap({ name: "posts" });

const channels = process.env.CHANNELS.split(",");

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

async function getPosts() {
  const content = await fetch("https://takprog.petlja.org/srednjaskola").then(
    (r) => r.text()
  );

  const $ = cheerio.load(content);

  const posts = $(".post-content")
    .toArray()
    .map((item) => {
      const text = cheerio
        .text($(item))
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{2,}/g, "\n\n")
        .trim();

      return text;
    });

  return posts.reverse();
}

async function checkPosts() {
  try {
    const posts = await getPosts();

    for (const post of posts) {
      if (!db.has(post)) {
        db.set(post, true);

        console.log(`Sending post | ${post.split("\n")[0]}`);

        const lines = post.split("\n");
        const title = lines[0];
        const description = lines.slice(1).join("\n");

        for (const channel of channels) {
          await client.channels.cache
            .get(channel)
            .send(`**${title}**\n>>> ${description}`)
            .catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  checkPosts();

  setInterval(checkPosts, 1000 * 60 * 5);
});

client.login();