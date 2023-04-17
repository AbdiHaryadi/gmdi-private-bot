// old-fashioned checking state of BMKG notification (alternative)
// retrieved via INDONESIA TSUNAMI EARLY WARNING SYSTEM
import { GMDIExtension, Constants, File } from "oceanic.js";
import redis from "../Cache";
import { EmbedBuilder as RichEmbed } from "@oceanicjs/builders";
import { request } from "undici";
import {xml2json} from "xml-js";
import ms from "ms";

import dayjs from "dayjs";
import dayjsTZ from "dayjs/plugin/timezone";
import dayjsUTC from "dayjs/plugin/utc";
dayjs.extend(dayjsTZ);
dayjs.extend(dayjsUTC);

let __ = false;
let lastModified = "";

export default async (client: GMDIExtension) => {
  if (__) return;

  randomInterval(async () => {
    try {
      const endpoint = "https://bmkg-content-inatews.storage.googleapis.com/live30event.xml";
      const checkHeader = await request(endpoint, { method: "HEAD" });
      if (!checkHeader || checkHeader.statusCode >= 400) throw await checkHeader.body.text();

      const lastModifiedHeader = String(checkHeader?.headers?.["last-modified"]);
      if (lastModifiedHeader?.length) {
        if (lastModifiedHeader === lastModified) {
          return;
        } else {
          lastModified = lastModifiedHeader;
        };
      };

      const data = await request(endpoint, { method: "GET" });
      if (data.statusCode >= 400) throw await data.body.text();

      const rawXML = await data.body.text();
      const parsed = JSON.parse(xml2json(rawXML, {compact: true})) as GempaVirtualization;
      if (!parsed?.Infogempa?.gempa?.[0]) return;

      const latestEQ = parsed.Infogempa.gempa[0];
      const parsedTime = customInaTime(latestEQ.waktu._text);
      const localizedTime = dayjs(parsedTime).utcOffset(1, true).tz("Asia/Jakarta").add(60, "minutes");

      if (localizedTime.valueOf() <= 1670457056000) return;
      
      const cachedEQKey = "earthquakeAcute_realtimeINA";
      const cachedEarthQuake = await redis.get(cachedEQKey); // prevent replay
      const earthquakeID = latestEQ.eventid._text;
      if (cachedEarthQuake && cachedEarthQuake === String(earthquakeID)) return;
      
      // at least >= {specified}
      let limitMagnitudeToPost = 4;
      if (Number(latestEQ.mag._text) < limitMagnitudeToPost) {
        await redis.set(cachedEQKey, earthquakeID);
        return console.log(`GMDI & BMKG (realtime alternative): Posted with ID_${earthquakeID} but lower mag; ${latestEQ.mag._text}`);
      };

      if (!latestEQ.area._text.toLowerCase().match(/(java|sumatra|sulawesi|bali)/gim)) {
        await redis.set(cachedEQKey, earthquakeID);
        return console.log(`GMDI & BMKG (realtime alternative): Posted with ID_${earthquakeID} but not in an indonesia-related place; ${latestEQ.area._text}`);
      };

      // host
      const generalChannel = "1062203494691520522";
      // const contentTemplate = "Stay safe, kawan-kawan. ⚠";
      // const disclaimer = "Kalkulasi gempa tidak begitu akurat dalam menit pertama, dan data akan berubah sewaktu-waktu oleh tim ahli seismologi.";

      const earthquakeColor = colorizedMagnitudeEmbed(+latestEQ.mag._text);
      const embed = new RichEmbed()
      .setColor(earthquakeColor)
      .setAuthor("Indonesia Tsunami Early Warning System (sub-alternative of BMKG)", "https://indonesiaexpat.id/wp-content/uploads/2022/02/WRS.png", "https://inatews.bmkg.go.id/")
      .setFooter("Provided by InaTEWS, Mapbox", "https://www.bmkg.go.id/asset/img/gempabumi/magnitude.png")
      .setTimestamp(new Date())
      .setTitle(`${latestEQ.area._text}`)
      // .setDescription(`Every earthquake with magnitude above >= ${limitMagnitudeToPost} will be posted here.`)
      
      const lintang = latestEQ.lintang._text;
      const bujur = latestEQ.bujur._text;
      embed
      .addField("Lintang Bujur", `${latestEQ.area._text} (${lintang} / ${bujur})`)
      .addField("Skala", `${latestEQ.mag._text} / ${mercalliIntensityScale(+latestEQ.mag._text)}`, true)
      .addField("Kedalaman", `${latestEQ.dalam._text} km`, true)
      .addField("Waktu Terdeteksi", `<t:${Math.round(localizedTime.valueOf() / 1000)}>`, true)
      // .addField("Disclaimer", disclaimer);

      // mapbox
      const mapboxEndpoint = `https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/pin-l+${earthquakeColor.toString(16)}(${bujur},${lintang})/${bujur},${lintang},6.95,0/1280x800?access_token=${process.env.MAPBOX_TOKEN}`;
      const mapboxFetch = await request(mapboxEndpoint, {method: "GET"});

      let files: File[] = [];

      if (mapboxFetch.statusCode >= 400) {
        console.error(await mapboxFetch.body.text());
        console.warn(`GMDI & BMKG (realtime alternative): Failed to fetch mapbox`);
      } else {
        embed.setImage(`attachment://gmdi_attitude_eq_${earthquakeID}.png`);
        files.push({
          name: `gmdi_attitude_eq_${earthquakeID}.png`,
          contents: Buffer.from(await mapboxFetch.body.arrayBuffer())
        });
      };

      const postedBMKGMessage = await client.rest.channels.createMessage(generalChannel, {
        // content: contentTemplate,
        embeds: embed.toJSON(true),
        files,
        components: [{
          type: Constants.ComponentTypes.ACTION_ROW,
          components: [{
            type: Constants.ComponentTypes.BUTTON,
            style: Constants.ButtonStyles.LINK,
            emoji: {id: null, name: "📑"},
            label: "More information",
            url: `https://inatews.bmkg.go.id/web/detail2?name=${latestEQ.eventid._text}`
          }]
        }]
      });

      if (postedBMKGMessage?.channel && postedBMKGMessage.channel.type === Constants.ChannelTypes.GUILD_ANNOUNCEMENT) {
        postedBMKGMessage.crosspost();
      };

      await redis.set(cachedEQKey, latestEQ.eventid._text);

      console.log(`GMDI & BMKG (realtime alternative): Posted with ID_${latestEQ.eventid._text}`);

      return;
    } catch (error) {
      return console.error(error);
    };
  }, ms("1m"), ms("2m"));

  __ = true;
  console.log(`GMDI & BMKG (realtime alternative): Ready.`);
  return
};

interface GempaVirtualization {
  _declaration: {
    _attributes: {
      version: string
    }
  },
  Infogempa: {
    gempa: Array<GempaInterface>;
  };
};

interface GempaInterface {
  eventid: { _text: string }
  status: { _text: string }
  waktu: { _text: string }
  lintang: { _text: string }
  bujur: { _text: string }
  dalam: { _text: string }
  mag: { _text: string }
  fokal: { _text: string }
  area: { _text: string }
};

function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min));
};

function customInaTime(unparsedTime: string) {
  return new Date(unparsedTime.replace(/\//gi, "-").replace("  ", "T").split(".").shift()!);
};

function randomInterval(intervalFunction, minDelay: number, maxDelay: number) {
  let timeout: ReturnType<typeof setTimeout>;

  const runInterval = (): void => {
    timeout = globalThis.setTimeout(() => {
      intervalFunction();
      runInterval();
    }, randomNumber(minDelay, maxDelay));
  };

  runInterval();

  return {
    clear(): void {
      clearTimeout(timeout);
    },
  };
};

// improved from https://earthquake.usgs.gov/education/shakingsimulations/colors.php
function colorizedMagnitudeEmbed(magnitude: number) {
  // limit 4
  switch (true) {
    case magnitude >= 4 && magnitude <= 4.9: return 0xf69420;
    case magnitude >= 5 && magnitude <= 5.9: return 0xf66f2a;
    case magnitude >= 6 && magnitude <= 6.9: return 0xef452b;
    case magnitude >= 7 && magnitude <= 7.9: return 0xeb1c28;
    case magnitude >= 8 && magnitude <= 8.9: return 0xd6186e;
    case magnitude >= 9: return 0xa11253;
    default: return 0x121112;
  };
};

export function mercalliIntensityScale(magnitude: number) {
  // research
  // https://en.wikipedia.org/wiki/Modified_Mercalli_intensity_scale
  // https://www.bmkg.go.id/gempabumi/skala-mmi.bmkg

  // 1.0–3.0	I
  // 3.0–3.9	II–III
  // 4.0–4.9	IV–V
  // 5.0–5.9	VI–VII
  // 6.0–6.9	VII–VIII
  // 7.0 and higher	VIII or higher

  switch (true) {
    case magnitude <= 2.9: return "I";
    case magnitude >= 3.0 && magnitude <= 3.4: return "II";
    case magnitude >= 3.5 && magnitude <= 3.9: return "III";

    case magnitude >= 4.0 && magnitude <= 4.4: return "IV";
    case magnitude >= 4.5 && magnitude <= 4.9: return "V";

    case magnitude >= 5.0 && magnitude <= 5.4: return "VI";
    case magnitude >= 5.5 && magnitude <= 6.4: return "VII";
    case magnitude >= 6.5 && magnitude <= 6.9: return "VI";

    case magnitude >= 7.0: return "VIII";
  };
};