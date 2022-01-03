const command = process.argv.slice(2);

export default {
  guildID: "190826809896468480",
  botOwner: "331265944363991042",
  channel: {
    general: "190826809896468480",
    modlog: "900578330858905601",
    onewordstory: ["581048023950426142", "581045521507155969"],
    watchChannelModeration: command[0] === "--dev" ? ["459637978269220864"] : ["190826809896468480", "460816462941126666", "460420164551442432"]
  },
  endpoint: {
    contentLogging: "https://gmdi-content-logging.13373333.one/"
  },
  warning: {
    role: {
      1: "265808137100066817",
      2: "265808551107231745",
      3: "438664627962904576"
    },
    channel: {
      warning: "331444579146661889" // "459221138267176971" // "331444579146661889"
    },
    session: {
      III: {
        minRange: 30,
        maxRange: 90
      }
    }
  },
  role: {
    staff: ["230305455975432193", "217296828339585026", "434936406960242709", "198442983668973568"]
  },
  cooldown: {
    limit: {
      exceed: 25,
      cooling: 15
    },

    message: {
      exceed: [
        "Saatnya slowmode!",
        "Ribut banget...",
        "Kenapa mengrusuh banget."
      ],

      cooling: [
        "Oke, udah gak ribut, saatnya matiin slowmode-nya~",
        "Hore, udah sedikit kalem!",
        "Slowmode-nya udah dimatikan. Maaf ya!"
      ]
    },

    intervalCheckingTimeout: 35000,
    timerange: 60000,
    timeout: 5
  },
  cache: {
    limit: 40
  }
};