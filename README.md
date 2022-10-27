# TokenInvalidator

## What is it?
People on Discord often ask for help. These people are *also* often ***very*** new to programming, and don't know how to read errors. Some of these errors may include tokens. Some people out there are *evil* and take advantage of this, and take the token and do malicious things with it.
To counter this, I made this.
If there is a token sent *anywhere* you can see in Discord (every channel accessible to you on the Discord Client), it can be invalidated if you take a look at your terminal and press enter.
You have the option to invalidate it, or not. This is so that people spamming tokens don't waste an API call to Github, the place where all tokens are sent to get invalidated.
This was inspired by seeing [RoboDanny](https://github.com/Rapptz/RoboDanny) in the [Discord.py](https://discord.gg/dpy) server, who would invalidate tokens.
Because the bot is open-sourced, I took a look at how it identifies tokens, and implemented that here
The main issue is that people don't want to add a bot to do this, and understandably so.
People may suggest using a self bot, which is against Discord ToS and will probably get you banned, fear not! [RPC](https://discord.com/developers/docs/topics/rpc) is here to save the day!
This works by listening to messages in every channel, and if it finds a token, it will send it to Github to be invalidated (after you of course confirm that you want to do this).

## How do I use it?
You can use it by cloning the repo (or installing the zip), installing [Node](https://nodejs.org) (I used 18.8 so try that if you're getting issues with other versions), and then in the directory of the repo, run `npm i`, and then fill in the `config.json` as shown below, and then `node .`

###### Example config.json
```json
{
    "clientId": "1234 Your Client ID",
    "clientSecret": "This is your Client's secret",
    "githubToken": "A Github API Token (PAT) with the `repo` scope",
}
```

Within your Application, make sure to set a Redirect URI, make sure it is not empty or it will crash your client.