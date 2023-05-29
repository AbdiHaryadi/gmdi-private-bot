import {GMDIExtension, Message, AnyGuildTextChannel} from "oceanic.js";
import Config from "../handler/Config";
import { getRandomInt } from "../handler/Util";

export const slowmodeChannel = new Map<string, boolean>();

export default async (client: GMDIExtension, message: Message<AnyGuildTextChannel>) => {
  // cache limit
  if (message.channel.messages.limit !== Config.cache.limit) {
    message.channel.messages.limit = Config.cache.limit;
  };

  let messages = [...message.channel.messages.values()].filter(m => new Date(m.timestamp).getTime() >= (Date.now() - Config.cooldown.timerange));
  let limit = Config.cooldown.limit.exceed;

  // Applies
  if (messages.length >= limit && !slowmodeChannel.has(`slowmode.${message.channel.id}`)) {
    slowmodeChannel.set(message.channel.id, true);

    client.rest.channels.edit(message.channel.id, {
      rateLimitPerUser: getRandomInt(5, 15),
      reason: "High Traffic"
    }).catch(() => {});

    client.rest.channels.createMessage(Config.channel.modlog, {
      embeds: [{
        description: `Applied on ${client.getChannel(message.channel.id)?.mention}`,
        title: "High Traffic Warning",
        color: 0x121112
      }]
    });

    client.rest.channels.createMessage(message.channel.id, {
      content: Config.cooldown.message.exceed[Math.floor(Math.random() * Config.cooldown.message.exceed.length)]
    });

    return;
  };
};