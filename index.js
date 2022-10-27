import fetch from "node-fetch"
import inquirer from "inquirer"
import { createSpinner } from "nanospinner"
import { Client } from "@theuntraceable/discord-rpc"
import chalk from "chalk"
import fs from "fs/promises"

const client = new Client({ transport: "ipc" })
const config = JSON.parse(await fs.readFile("./config.json", "utf-8"))
client.rejectedTokenCache = new Set()
client.config = config

client.invalidateToken = async token => {
    const spinner = createSpinner("Invalidating token...").start()    
    const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.githubToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "description": "Discord Token Invalidation. https://github.com/TheUntraceable/TokenInvalidator",
            "public": true,
            "files": {
                "token.txt": {
                    "content": token
                }
            }
        })
    })
    if(response.status == 201) {
        const data = await response.json()
        spinner.success(chalk.green(`Successfully invalidated token ${token}! Gist: ${data.html_url}`))
    } else {
        spinner.error(chalk.red(`Failed to invalidate token ${token} with status code ${response.status}!`))
        if(response.status == 401) {
            console.log(chalk.red.underline.bold("Make sure that your Github Token is valid and has the `repo` scope!"))
        }
    }
}

client.on("ready", async payload => {
    console.log(chalk.green("Connected to Discord!"))
    if(payload.access_token || client.accessToken) {
        client.config.login = {
            expiresAt: new Date(payload.expires),
            accessToken: client.accessToken || payload.access_token,
        }
        await fs.writeFile("./config.json", JSON.stringify(client.config, null, 4))
    }
    const subscriptionsSpinner = createSpinner("Subscribing to events...").start()

    for(const guild of (await client.getGuilds()).guilds) {
        for(const channel of await client.getChannels(guild.id)) {
            await client.subscribe("MESSAGE_CREATE", { channel_id: channel.id })
        }
    }
    subscriptionsSpinner.success("Subscribed to all channels!")
    console.log(chalk.green("Subscribed to all channels!"))
})

client.on("MESSAGE_CREATE", async payload => {
    const TOKEN_REGEX = new RegExp(/[a-zA-Z0-9_-]{23,28}\.[a-zA-Z0-9_-]{6,7}\.[a-zA-Z0-9_-]{27,}/)
    const { message, channel_id } = payload
    const { content, author } = message
    for(const word of content.split(" ")) {
        if(TOKEN_REGEX.test(word) && (word.startsWith("N") || word.startsWith("M")) || word.startsWith("O") && !client.rejectedTokenCache.has(word)) {
            const [userId, _, __] = word.split(".")
            try {
                BigInt(Buffer.from(userId, "base64").toString())
            } catch {
                continue
            }
            if(config.autoInvalidate) {
                await client.invalidateToken(word)
                continue
            }
            const answers = await inquirer.prompt([{
                type: "confirm",
                name: "invalidate",
                message: `Found token ${word} in channel ${channel_id} by ${author.username}#${author.discriminator}. Invalidate?`,
            }])
            if(answers.invalidate) {
                await client.invalidateToken(word)
                client.rejectedTokenCache.add(word)
            } else {
                const cache = await inquirer.prompt([{
                    type: "confirm",
                    name: "cache",
                    message: "Do you want to cache this decision?",
                }])
                if(cache.cache) {
                    client.rejectedTokenCache.add(word)
                }
            }
    }}
})

const credentials = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    scopes: ["rpc", "messages.read"],
    redirectUri: "https://discord.com"
}

if(config.login?.accessToken) {
    if(new Date(config.login?.expiresAt) > Date.now()) {
        credentials.accessToken = config.login.accessToken
    }
}

client.login(credentials)