require('dotenv').config()
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const { Strategy } = require("passport-discord");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const Eris = require("eris");

const Constants = Eris.Constants;

const bot = new Eris(process.env.TOKEN, {
  intents: [
    "guilds",
    "guildMessages"
  ]
});

bot.connect();  

bot.on("ready", () => {
  console.log("Ready!");
});

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

var scopes = ["identify", "guilds"];

passport.use(
  new Strategy(
    {
      clientID: process.env.ID,
      clientSecret: process.env.SECRET,
      callbackURL: `${process.env.WEBSITEURL}/login`,
      scope: scopes
    },
    function(accessToken, refreshToken, profile, done) {
      process.nextTick(function() {
        return done(null, profile);
      });
    }
  )
);

app
  .use(
    session({
      secret: "VeyWP@6Fy9e83W@qId$#S0mE0iKayXwMJ!1IZ&V&gLnrnFfjq731YM8RnmESB9r7G2S4@E$uIESEwK#K@gOq7D9P3uG2Mzl&Ocx",
      resave: false,
      saveUninitialized: false
    })
  )
  .use(passport.initialize())
  .use(passport.session());
app.use(bodyParser.json());
app.use(express.static("views"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  express.urlencoded({
    extended: true
  })
);

function CheckAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login");
  }
}

app.get(
  "/login",
  passport.authenticate("discord", { failureRedirect: "/" }),
  async function(req, res) {
    res.redirect("/");
  }
);

app.get("/logout", async function(req, res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get("/", async function(req, res) {
  res.render(__dirname+'/views/index.ejs', {
      user: req.user,
      login: (req.isAuthenticated() ? "yes" : 'none')
  });
});

app.get("/crew", async function(req, res) {
    res.render(__dirname+'/views/crew.ejs', {
        user: req.user,
        login: (req.isAuthenticated() ? "yes" : 'none')
    });
});

app.get("/infractions", async function(req, res) {
    res.render(__dirname+'/views/infractions.ejs', {
        user: req.user,
        login: (req.isAuthenticated() ? "yes" : 'none')
    });
});

app.get("/protocols", async function(req, res) {
    res.render(__dirname+'/views/protocols.ejs', {
        user: req.user,
        login: (req.isAuthenticated() ? "yes" : 'none')
    });
});

app.get("/recruitment", CheckAuth, async function(req, res) {
    res.render(__dirname+'/views/recruitment.ejs', {
        user: req.user,
        login: (req.isAuthenticated() ? "yes" : 'none')
    });
});

app.get("/rules", async function(req, res) {
    res.render(__dirname+'/views/rules.ejs', {
        user: req.user,
        login: (req.isAuthenticated() ? "yes" : 'none')
    });
});

app.post("/api/recruitment", async function(req, res) {
    console.log(req.user)
    try {
        bot.createMessage("999031978626121839", {
          components: [
              {
                  type: Constants.ComponentTypes.ACTION_ROW, 
                  components: [
                      {
                        type: Constants.ComponentTypes.BUTTON,
                        style: Constants.ButtonStyles.SECONDARY,
                        custom_id: "yes",
                        label: "قبول",
                        emoji: {
                          "id": null,
                          "name": "✅"
                        },
                        disabled: false
                      }, {
                        type: Constants.ComponentTypes.BUTTON,
                        style: Constants.ButtonStyles.DANGER,
                        custom_id: "no",
                        label: "رفض",
                        emoji: {
                          "id": null,
                          "name": "❌"
                        },
                        disabled: false
                      }
                  ]
              }
          ], embeds: [{
              title: "تقديم جديد!",
              author: { 
                  name: req.user.username,
                  icon_url: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.${req.user.avatar.startsWith("a_") ? "gif" : "jpg"}?size=1024`
              },
              // color: 0x008000,
              fields: [ 
                  {
                    name: "الاسم",
                    value: req.body.name,
                    inline: true
                  },
                  {
                    name: "العمر",
                    value: req.body.age,
                    inline: true
                  },
                  {
                    name: "ايدي اللاعب",
                    value: req.body.playerID,
                    inline: true
                  },
                  {
                    name: "خبرات اللاعب",
                    value: req.body.require,
                    inline: true
                  },
                  {
                    name: "سبب التحاقه",
                    value: req.body.reason,
                    inline: true
                  }
              ]
          }]
      });
      res.send("Done!")
    } catch (error) {
        res.send(error)
        console.log(error);
    }
   
});
let allowed = [];
app.get("/quiz", CheckAuth, async function(req, res) {
  if (!allowed.includes(req.user.id)) return res.redirect("/");
  res.render(__dirname+'/views/quiz.ejs', {
      user: req.user,
      login: (req.isAuthenticated() ? "yes" : 'none')
  });
  allowed = allowed.filter(x => x !== req.user.id);
});

io.on('connection', async (socket) => {
  bot.on("interactionCreate", async (interaction) => {
    if(interaction instanceof Eris.ComponentInteraction) {
        let type = interaction.data.custom_id == 'no' ? false : true
        io.emit('type', type);
        if(type) allowed.push(interaction.message.embeds[0].author.icon_url.split("/")[4]);
        interaction.message.delete()
        await interaction.createMessage({ content: "✅ | **تم!**", flags: 64 })
    }
  });
});
server.listen(process.env.PORT || 3000, () => {
    console.log('listening on *:80');
});
