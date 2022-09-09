import { Guild, Member, GMDIExtension, JSONMember, EmbedOptions } from "oceanic.js";
import config from "../config/config";
import {stripIndents} from "common-tags";

export default async (client: GMDIExtension, guild: Guild, member: Member, oldMember: JSONMember | null) => {
  if (guild.id !== config.guildID || member.bot) return;
  
  try {
    if (oldMember?.pending && !member?.pending && !config.botOwner.includes(member.id)) {
      let returnMember: FarewellMemberConclusion = await client.database.get(`replaceWelcomeMessageUser.${member.user.id}`);
  
      let returnMemberMessage = returnMember ? 
      `Selamat datang kembali di Discord server, **${guild.name}**.` :
      stripIndents`
      Selamat datang di Discord server, **${guild.name}**!
      Semoga betah, dan jangan lupa baca ${client.getChannel("274351350656139265")?.mention || "<#274351350656139265>"} sebelum ngobrol.`
  
      // Embed
      let embed: EmbedOptions = {
        title: `Halo, ${member.user.username}#${member.user.discriminator} 👋`,
        description: returnMemberMessage,
        color: 0x24C86E,
        timestamp: new Date().toString()
      };
  
      await client.rest.guilds.addMemberRole(guild.id, member.id, "312868594549653514");
      
      return client.rest.channels.createMessage(config.channel.general, {content: member.mention, embeds: [embed]});
    };
  } catch (error) {
    return console.error(error);
  };
};