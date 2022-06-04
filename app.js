const Discord = require("discord.js");
var fs = require("fs");
var _ = require("lodash");
var cronstrue = require("cronstrue");
const schedule = require("node-schedule");
var articles = fs.readFileSync("articles.json");
const {google}= require("googleapis")
const dotenv = require('dotenv').config();

// parsing articles.json
articles = JSON.parse(articles);
// creating client
const client = new Discord.Client({
  intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES],
});

// categories
categories = [
  "WILDCARD",
  "LIVING BETTER",
  "BUSINESS TECH",
  "HISTORY CULTURE",
  "SCIENCE NATURE",
];

categoryNames = [
  "1. Wildcard",
  "2. Living Better",
  "2. Business & Tech",
  "3. History & Culture",
  "4. Science & Nature",
];

const prefix = dotenv.parsed.PREFIX;
// command message
var command =
  "1. **For getting a random article**:" + "```" + prefix + "get article[category]``` " +
  "\n" +
  "ex: " + "`" + prefix + "get article wildcard`, this will fetch a random article form wildcard category" +
  "\n" +
  "\n" +
  "Tip: " + "`" + prefix + "get article`, this will give you the list of categories available" +
  "\n" +
  "\n" +
  "Tip: " + "`" + prefix + "get article time`, this will give you the time at which you get the daily article" +
  "\n" +
  "\n" +
  "2. **For setting time of daily message**:" +
  "\n" +
  "\n" +
  "> 1. for days(in integers from 0-6): " + "```" + prefix + "set article days[startDay][endDay]```" +
  "\n" +
  "ex: " + "`" + prefix + "set article days 0 6`, this will set the days as SUN-SAT" +
  "\n" +
  "\n" +
  "> 2. for time(in 24hr format): " + "```" + prefix + "set article time[hour]: [mins]```" +
  "\n" +
  "ex: " + "`" + prefix + "set article time 14: 20`, this will give the daily article at 2:20 pm";

// embed command message
const getHelpEmbed = new Discord.MessageEmbed()
  .setColor("#FF3F3F")
  .setTitle("readsomethinggreat")
  .setURL("https://www.readsomethinggreat.com/")
  .setAuthor(
    "Buy me a coffee",
    "https://i.imgur.com/vugPtoT.png",
    "https://www.buymeacoffee.com/rahulgopathi"
  )
  .setDescription(
    "A bot that gives a random article from readsomethinggreat.com"
  )
  .setThumbnail("https://i.imgur.com/vugPtoT.png")
  .addFields(
    {
      name: "Categories",
      value:
        "Wildcard, Living Better, Business & Tech, History & Culture, Science & Nature",
    },
    { name: "\u200B", value: "\u200B" },
    {
      name: "Commands",
      value: command,
      inline: true,
    }
  )
  .setTimestamp()
  .setFooter("Happy Reading", "https://i.imgur.com/vugPtoT.png");

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 10;
rule.minute = 0;
var startDay = 0;
var endDay = 6;

const ruleForBMC = new schedule.RecurrenceRule();
ruleForBMC.dayOfWeek = [0, new schedule.Range(dotenv.parsed.daysofWeek_BMCLink)];
ruleForBMC.hour = dotenv.parsed.hour_BMCLink;
ruleForBMC.minute = dotenv.parsed.minute_BMCLink;
ruleForBMC.second = dotenv.parsed.second_BMCLink;

//creating a empty cron expression
var cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay} `;
var dailyUpdatesChannel = null;

// fetching random article
function fetchRandomArticle(category) {
  numberofArticles = articles[category].length;
  randomArticlePosition = Math.floor(Math.random() * numberofArticles);
  article = articles[category][randomArticlePosition];
  if (category == "WILDCARD") {
    try {
      articleLink = article["Link to Article"][0];
    } catch (error) {
      console.log(error);
      dailyUpdatesChannel.send("An error occured, could you please try again");
    }
  } else {
    try {
      articleLink = article["Link to Article"];
    } catch (error) {
      console.log(error);
      dailyUpdatesChannel.send("An error occured, could you please try again");
    }
  }
  articles[category].splice(randomArticlePosition, 1);
  console.log("Generated random article succesfully");
  return articleLink;
}
//bmc link schedule
function BMCLinkScheduler() {
  const job = schedule.scheduleJob(ruleForBMC, function () {
    client.guilds.cache.each((guild) => {
      try {
        const channel =
          guild.channels.cache.find(
            (channel) => channel.name === "readsomethinggreat"
          ) || guild.channel.cache.first();
        if (channel) {
          channel.send("**Buy me a Coffee link**- " + dotenv.parsed.BMC_Link);
        } else {
          console.log("There is no channel for the link to send");
        }
      } catch (err) {
        console.log(err);
      }
    });
  });
}

// resetting schedule after changing timings
function resetScheduler() {
  console.log(rule);
  const job = schedule.scheduleJob(rule, function () {
    articleLink = fetchRandomArticle("WILDCARD");
    client.guilds.cache.each((guild) => {
      try {
        const channel =
          guild.channels.cache.find(
            (channel) => channel.name === "readsomethinggreat"
          ) || guild.channels.cache.first();
        if (channel) {
          channel.send(articleLink)
          console.log("sent the daily article to channels");
        } else {
          console.log("The server " + guild.name + " has no channels.");
        }
      } catch (err) {
        console.log("Could not send message to " + guild.name + ".");
      }
    });
    cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay} `;
  });
}

const serviceAccountKeyFile = "./google_sheets_api.json";
const sheetId = dotenv.parsed.sheetId
const tabName = dotenv.parsed.tabName
const range = 'A:C'

async function getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: authClient,
  });
}

async function readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
  });

  return res.data.values;
}

async function _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
  await googleSheetClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      "majorDimension": "ROWS",
      "values": data
    },
  })
}

async function _updateGoogleSheet(googleSheetClient, sheetId, tabName,rangeupdate,data){
  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${rangeupdate}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      "values": data
    },
  })
}

async function getArticle(str_id) {
  // Generating google sheet client
  const googleSheetClient = await getGoogleSheetClient();
  var data_onSheet =await readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  index_ofguildID=0
  var guildid_flag = false
  data_onSheet.forEach((value,index) => {
    if (str_id == value[0]){
      guildid_flag = true
      index_ofguildID = index
    }
  })
  if (guildid_flag){
    var time_sheet = {
      hr : data_onSheet[index_ofguildID][1],
      min : data_onSheet[index_ofguildID][2],
    }
  }
  else{
    var time_sheet = {
      hr : 10,
      min : 0,
    }
  }
  return time_sheet;
}

async function setArticle(str_id,set_hr,set_min) {
  const googleSheetClient = await getGoogleSheetClient();
  var data_onSheet =await readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  index_ofguildID=0
  var guildid_flag = false
  data_onSheet.forEach((value,index) => {
    if (str_id == value[0]){
      guildid_flag = true
      index_ofguildID = index
    }
  })
  if (guildid_flag){
    if(set_hr != parseInt(data_onSheet[index_ofguildID][1]) || parseInt(set_min != data_onSheet[index_ofguildID][2])){
      row=index_ofguildID+1
      rangeupdate = `B${row}`
      newdata = [
        [set_hr,set_min]
      ]
      await _updateGoogleSheet(googleSheetClient, sheetId, tabName, rangeupdate, newdata)
    }
  }
  else{
    const dataToBeInserted = [
       [str_id, set_hr, set_min ]
      ]
      await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
  }
}

//Playing Message
client.on("ready", async () => {
  console.log(
    `${client.user.username} is online on ${client.guilds.cache.size} servers!`
  );

  client.user.setActivity("Article", { type: "PLAYING" });

  resetScheduler();
  BMCLinkScheduler();
});

// handling on message events
client.on("message", (msg) => {
  cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay} `;

  if (msg.author.bot) return;

  if (msg.content === "get help" || msg.content === "get article") {
    msg.channel.send("Are you trying to call me?")
      .then((text) => {
        text.channel.send("My prefix is " + "`" + prefix + "`" + "\n" + "Ex - " + "`*get help`")
      })

  }
  if (msg.content === prefix + "get help") {
    msg.channel.send({ embeds: [getHelpEmbed] })
  }

  if (
    msg.content.startsWith(prefix + "get article") ||
    msg.content.startsWith(prefix + "Get article")
  ) {
    msgRecievied = msg.content.split(" ");
    if (msgRecievied.length == 2) {
      msg.channel.send(
        "```" +
        `Here are the  article categories to read upon:\n${categoryNames.join(
          "\n"
        )}` +

        "```"
      );
    } else {
      if (msgRecievied.length == 3) {
        category = _.upperCase(msgRecievied[2]);
      } else {
        category = msgRecievied.slice(2);
        category = _.upperCase(category.join(" "));
      }
      if (categories.includes(category)) {
        msg.channel.send(fetchRandomArticle(category))
        .then((embed) => {
          embed.react('⬆'),
            embed.react("⬇️")
        })
        .catch((err) => {
        console.log(err);
        msg.channel.send("```coudn't fetch the article at the moment :( ```");
        });
      } else {
        if (msgRecievied[2] == "time") {
          let hr_OnSheet;
          getArticle((msg.guild.id).toString()).then(response => { hr_OnSheet =  response })
          setTimeout(()=>{
          rule.hour = parseInt(hr_OnSheet.hr);
          rule.minute = parseInt(hr_OnSheet.min);
          },1300)
          
          setTimeout(() =>{
          var cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay}`;
          msg.channel.send(
            "The daily article will be coming " +
            cronstrue.toString(cronExpression)
          );
          },1600)
          
        } else {
          msg.channel.send(
            "```The specified category doesn't exists. The available categories are:\n" +
            `${categoryNames.join("\n")}` +
            "```"
          );
        }
      }
    }
  }

  if (msg.content.startsWith(prefix + "set article ")) {
    correctTimeProvided = false;
    displayDailyArticleTime = true;   //if true send daily article time expression
    setTimeCommand = msg.content.split(" ");
    if (setTimeCommand[2] == "days") {
      try { 
        if (
          setTimeCommand.length === 5 &&
          setTimeCommand[3] != "" &&
          setTimeCommand[4] != ""
        ) {
          if (setTimeCommand[3] < 7 && setTimeCommand[4] < 7 && setTimeCommand[3] >= 0 && setTimeCommand[4] >= 0) {
            startDay = setTimeCommand[3];
            endDay = setTimeCommand[4];
            rule.dayOfWeek = [0, new schedule.Range(startDay, endDay)];
            correctTimeProvided = true;
          } else {
            msg.channel.send(
              "```Please sepecify Days from 0 to 6.\nEx: " + prefix + "set article days 0 6```"
            );
            displayDailyArticleTime = false;
          }
        } else if (setTimeCommand.length != 5) {
          msg.channel.send(
            "```Please sepecify time after the command.\nEx: " + prefix + "set article days 0 6```"
          );
          displayDailyArticleTime = false;
        }
      } catch (error) {
        console.log(error);
        msg.channel.send(
          "```Please specify days in [startDay] [endDay] format ```"
        );
      }
    } else if (setTimeCommand[2] == "time") {
      try {
        var time = setTimeCommand[3].split(":");
        if (time.length !== 2 || time[0] == "" || time[1] == "") {
          msg.channel.send(
            "```Please specify time in [hours]:[minutes] format where hours are in 24 hour format```"
          );
        } else if (time[0] < 23 || time[1] < 59 || time[0] >= 0 || time[1] >= 0) {
          let guildid = msg.guild.id
          let str_id=guildid.toString()
          set_hr=time[0]
          set_min=time[1]
          setArticle(str_id,set_hr,set_min)
          displayDailyArticleTime = true;
          rule.hour = time[0];
          rule.minute = time[1];
          correctTimeProvided = true;
        } else if (time[0] > 23 || time[1] > 59 || time[0] < 0 || time[1] < 0) {
          msg.channel.send("```Hour should be less than 24 & Minute should be less than 60```");
          displayDailyArticleTime = false;
        }
      }
      catch (error) {
        console.log(error);
        msg.channel.send(
          "```Please specify time after the command.\nEx: " + prefix + "set article time hour 14:20```"
        );
        displayDailyArticleTime = false;
      }
    } else {
      msg.channel.send(
        "```wrong command :( please type [" + prefix + "get help] for the commands```"
      );
      displayDailyArticleTime = false;
    }

    var updatedcronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay}`;

    if (correctTimeProvided == true && displayDailyArticleTime == true) {
      msg.channel.send(
        "From now the daily article will be coming " +
        cronstrue.toString(updatedcronExpression)
      );
      cronExpression = updatedcronExpression;
    } else if (displayDailyArticleTime) {
      msg.channel.send(
        "```The daily article time is already " +
        cronstrue.toString(updatedcronExpression) +
        "```"
      );
    }
    resetScheduler();
  }
});

//Token need in token.json
client.login(dotenv.parsed.TOKEN);
