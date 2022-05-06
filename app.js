const token = require("./token.json");
const Discord = require("discord.js");
var fs = require("fs");
var _ = require("lodash");
var cronstrue = require("cronstrue");
const schedule = require("node-schedule");
var articles = fs.readFileSync("articles.json");
const urlMetadata = require('url-metadata');
const { getPriority } = require("os");
var s = fs.readFileSync("schedule.json");
const request = require('request');
const { url } = require("inspector");
const {google}= require("googleapis")

// parsing articles.json
articles = JSON.parse(articles);
s=JSON.parse(s);
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

// command message
var command =
  "1. **For getting a random article**: ```get article [category]```"+
  "\n" +
  "\n" +
   "ex: `get article wildcard`, this will fetch a random article form wildcard category" +
  "\n" +
  "\n" +
  "Tip: `get article`, this will give you the list of categories available" +
  "\n" +
  "\n" +
  "Tip: `get article time`, this will give you the time at which you get the daily article" +
  "\n" +
  "\n" +
  "2. **For setting time of daily message**:" +
  "\n" +
  "\n" +
  "> 1. for days(in integers from 0-6): ```set article days [startDay] [endDay]```" +
  "\n" +
  "ex: `set article days 0 6`, this will set the days as SUN-SAT" +
  "\n" +
  "\n" +
  "> 2. for time(in 24hr format): ```set article time [hour]:[mins]```" +
  "\n" +
  "ex: `set article time 14:20`, this will give the daily article at 2:20 pm";

// embed command message
const exampleEmbed = new Discord.MessageEmbed()
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

const ArticleEmbed = new Discord.MessageEmbed()
  .setColor("#242424")
  .setTitle("Article")
  .setAuthor(
    "Buy me a coffee",
    "https://i.imgur.com/vugPtoT.png",
    "https://www.buymeacoffee.com/rahulgopathi"
  )
  .setThumbnail("https://i.imgur.com/vugPtoT.png")
  //.setDescription("Here is your Article")
  .setTimestamp()
  .setFooter("Happy Reading", "https://i.imgur.com/vugPtoT.png");

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 10;
rule.minute = 0;
var startDay = 0;
var endDay = 6;

//creating a empty cron expression
var cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay}`;

var dailyUpdatesChannel = null;

// fetching random article
function fetchRandomArticle(category) {
  numberofArticles = articles[category].length;
  randomArticlePosition = Math.floor(Math.random() * numberofArticles);
  ArticleEmbed.addFields(
       {
         name: articles[category][randomArticlePosition]["Article Title"][0],
         value: articles[category][randomArticlePosition]["Learning"],
       }
     )
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

// resetting schedule after changing timings
function resetScheduler() {
  if (rule.minute < 30) {
    rule.hour = rule.hour;
    rule.minute = parseInt(rule.minute);
  } else {
    rule.hour = rule.hour;
    rule.minute = parseInt(rule.minute);
  }
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
          channel.send(articleLink);
          console.log("sent the daily article to channels");
        } else {
          console.log("The server " + guild.name + " has no channels.");
        }
      } catch (err) {
        console.log("Could not send message to " + guild.name + ".");
      }
    });
    cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay}`;
  });
}

const imgurl = async (url) => {
  const response = await urlMetadata(url);
  return response;
}

const serviceAccountKeyFile = "./article-bot-database-2c885470e1c3.json";
const sheetId = '19cKf8XBNbSXiQmfsVFT3F63__e_61H8w6iosU7hIKyM'
const tabName = 'Sheet1'
const range = 'A:C'
const rangeupdate='B1'
c=1;

async function _getGoogleSheetClient() {
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

async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
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

// async function main() {
//   // Generating google sheet client
// const googleSheetClient = await _getGoogleSheetClient();

// const data =await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
// console.log(data);

// const dataToBeInserted = [
//   ["963038028635459624", "10", "30" ]
// ]
// await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
// }
// main()

//Playing Message
client.on("ready", async () => {
  console.log(
    `${client.user.username} is online on ${client.guilds.cache.size} servers!`
  );

  client.user.setActivity("Article", { type: "PLAYING" });

  resetScheduler();
});

// handling on message events
client.on("message", (msg) => {
  cronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay}`;

  if (msg.author.bot) return;

  if (msg.content === "get help") {
    msg.channel.send({ embeds: [exampleEmbed] });
  }

  if (
    msg.content.startsWith("get article") ||
    msg.content.startsWith("Get article")
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
    if (msgRecievied[2] != "time" && msgRecievied[2] != "Time"){
      fetchinglink = fetchRandomArticle(category)
      }

      if (categories.includes(category)) {
         let finalimg1;
         const finalimg = imgurl(fetchinglink).then(response => { finalimg1 = response.image});
        setTimeout(() =>{
        console.log(finalimg);
        //ArticleEmbed.setImage(finalimg1.toString());
        //console.log(image.toString())
        ArticleEmbed.setImage(finalimg1)
        ArticleEmbed.setDescription(fetchinglink)
        msg.channel.send({ embeds: [ArticleEmbed] }).catch((err) => {
        console.log(err);
        msg.channel.send("```coudn't fetch the article at the moment :( ```");
        });
        ArticleEmbed.fields= [];
        },3000)
      } else {
        if (msgRecievied[2] == "time") {
          msg.channel.send(
            "The daily article will be coming " +
              cronstrue.toString(cronExpression)
          );
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

  if (msg.content.startsWith("set article ")) {
    correctTimeProvided = false;
    setTimeCommand = msg.content.split(" ");
    if (setTimeCommand[2] == "days") {
      try { 
        if (
          setTimeCommand.lenght !== 5 ||
          setTimeCommand[3] == "" ||
          setTimeCommand[4] == ""
        ) {
          msg.channel.send(
            "```Please sepecify time after the command.\nEx:set article days 0 6```"
          );
        } else {
          startDay = setTimeCommand[3];
          endDay = setTimeCommand[4];
          rule.dayOfWeek = [0, new schedule.Range(startDay, endDay)];
          correctTimeProvided = true;
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
            "```Please specify time in [hours]:[minutes] format ```"
          );
        } else {
          let guildid = msg.guild.id
          let str_id=guildid.toString()
          let hour;
          let minute;
          async function main() {
            // Generating google sheet client
          const googleSheetClient = await _getGoogleSheetClient();
          
          const data =await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
          rem=0
          flag=false
          for(i=1;i<=c;i++)
          {
            if (str_id==data[i][0]){
              rem=i
              flag=true;
              console.log("Flag=",flag)
              break;
            }
          }
          if (flag==false){
            c=c+1;
            console.log("c=",c)
            const dataToBeInserted = [
            [str_id, time[0], time[1] ]
          ]
          await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
          }
          hour= data[rem][1]
          minute= data[rem][2]
          console.log("Hour = "+hour)
          console.log("Minute = "+minute)
          console.log(data);
           }
          main()
          rule.hour = time[0];
          rule.minute = time[1];
          correctTimeProvided = true;
        }
      } catch (error) {
        console.log(error);
        msg.channel.send(
          "```Please sepecify time after the command.\nEx:set article time hour 14:20```"
        );
      }
    } else {
      msg.channel.send(
        "```wrong command :( please type [get help] for the commands```"
      );
    }

    var updatedcronExpression = `${rule.minute} ${rule.hour} * * ${startDay}-${endDay}`;
    //console.log(updatedcronExpression)
    if (updatedcronExpression !== cronExpression) {
      msg.channel.send(
        "From now the daily article will be coming " +
          cronstrue.toString(updatedcronExpression)
      );
      cronExpression = updatedcronExpression;
    } else if (correctTimeProvided == true) {
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
client.login(token.token);