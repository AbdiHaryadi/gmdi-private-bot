import { stripIndents } from "common-tags";
import Eris from "eris";
import GMDIBot from "../handler/Client";
import ms from "ms";
import Undici from "undici";
import normalizeURL from "normalize-url";

export default async (client: Eris.Client & GMDIBot, msg: Eris.Message, emoji: Eris.PartialEmoji, reactor: Eris.Member | { id: string }) => {
  try {
    // must be presented in guild
    if (!msg.guildID || !msg?.channel?.id) return;

    if (reactor instanceof Eris.Member) {
      if (reactor.bot) return;
    };

    // check message
    let message = msg;
    if (!message.type) {
      let restMessage = await client.getMessage(msg.channel.id, msg.id);
      if (!restMessage) return;
      message = restMessage;
    };

    let totalCharLengthMinimum = 4;
    const starEmoji = "⭐";
    const channelID = "954291153203769354";
    
    // message older than Jan 1 2022 will be ignored
    // let _2022 = new Date("Jan 1 2022").getTime();
    // if (message.createdAt < _2022) return;

    // if (message.content.replace(/[a-zA-Z]/g, "").length < totalCharLengthMinimum) return;
    if (message.channel.id == channelID) return; // star in the same channel
    if (!message.reactions[starEmoji]) return; // not star emoji
    if (message.reactions[starEmoji].me) return; // bot

    let reactions = await client.getMessageReaction(message.channel.id, message.id, starEmoji);

    // star emoji validation
    let _maxR = 11, _minR = 6;
    let limit = client.cache.get<number | null>(`starboardLimitCache_${message.id}`);
    if (!limit || isNaN(limit)) {
      let randLimit = Math.floor(Math.random() * (_maxR - _minR) + _minR);
      limit = randLimit;
      client.cache.set(`starboardLimitCache_${message.id}`, randLimit, Math.round(ms("1h") / 1000));
    };

    // increment if same user reacted
    if (reactions.find(val => val.id == message.author.id)) ++limit;

    if (message.reactions[starEmoji].count >= limit) {
      if (client.database.has("postedStarboard")) {
        let check = client.database.get("postedStarboard") as string[] | null;
        if (check) {
          if (check.includes(message.id)) return;
          else client.database.push("postedStarboard", message.id);
        } else {
          return;
        };
      } else {
        client.database.set("postedStarboard", [message.id]);
      };

      const truncate = (str: string, num = 950) => str.length >= num ? str.slice(0, num) + "..." : str;

      const embed = new Eris.RichEmbed()
        .setColor(0xffac33)
        .setTimestamp(new Date(message.timestamp))
        .setAuthor(`${message.author.username}#${message.author.discriminator} (${message.author.id})`, undefined, message.author.dynamicAvatarURL("png", 16))
        .setDescription(stripIndents`
        ${truncate(message.content)}

        **[Original Content](${message.jumpLink})**
        `);

      let file: Eris.FileContent | undefined;

      let embeddings: string[] = [];

      if (message.attachments.length || message.embeds.length) {
        let ext = {
          "image/gif": ".gif",
          "image/jpeg": ".jpeg",
          "image/jpg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "video/mp4": ".mp4",
          "video/webm": ".webm"
        };

        // attachments
        if (message.attachments.length == 1) {
          if (message.attachments[0].content_type?.match(/^(image\/(jpe?g|gif|png|webp))/gi)) {
            embed.setImage(normalizeURL(message.attachments[0].url));
          }

          else if (message.attachments[0].content_type?.match(/^(video)/gi)) {
            embeddings.push(normalizeURL(message.attachments[0].url));
          };
        } else if (message.attachments.length > 1) {
          for (let data of message.attachments) {
            if (!data.content_type) continue;

            if (Object.keys(ext).find(mime => mime == data.content_type)) {
              embeddings.push(data.url);
            };

            continue;
          };
        };

        // embeds
        if (message.embeds.length == 1) {
          if (message.embeds[0].type == "image" && message.embeds[0].url) {
            embed.setImage(normalizeURL(message.embeds[0].url));
          }

          else if (message.embeds[0].type == "video" && message.embeds[0].url) {
            embeddings.push(normalizeURL(message.embeds[0].url));
          };
        } else if (message.embeds.length > 1) {
          for (let data of message.embeds) {
            if (data.type.match(/(image|video)/gi) && data.url) {
              embeddings.push(data.url);
            };

            continue;
          };
        };
      };

      return client.createMessage(channelID, { content: embeddings.join("\n"), embeds: [embed] }, file);
    };
  } catch (error) {
    return console.error(error);
  }
};