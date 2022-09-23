import {GMDIExtension, Message, AnyGuildTextChannel, PrivateChannel, GuildChannel} from "oceanic.js";
import Config from "../config/config";

// Moderation Registry
import ChannelCooldown from "../registry/channelCooldown";

// Forgotten Member Role
import forgottenMemberRole from "../registry/forgottenMemberRole";

// command
import EvalFactory from "../registry/eval";

export default async (client: GMDIExtension, message: Message<AnyGuildTextChannel>) => {
  if (
    message.author.bot ||
    message.channel instanceof PrivateChannel ||
    !(message.channel instanceof GuildChannel)
  ) return;

  if (Config.channel.watchChannelModeration.some(x => x === message.channel.id)) {
    ChannelCooldown(client, message);
  };

  forgottenMemberRole(undefined, message);

  let args = message.content.slice(Config.prefix.length).trim().split(/ +/g);
  let cmd = args.shift()?.toLowerCase();

  if (message.content.startsWith(Config.prefix + "eval")) {
    return EvalFactory(client, message, args);
  };
};