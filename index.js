import fetch from "node-fetch"
import inquirer from "inquirer"
import { createSpinner } from "nanospinner"
import { Client } from "@theuntraceable/discord-rpc"
import chalk from "chalk"
import fs from "fs/promises"

const client = new Client({ transport: "ipc" })
const config = JSON.parse(await fs.readFile("./config.json", "utf-8"))
client.config = config

client.invalidateToken = async token => {
    const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.githubToken}`,
            "Content-Type": "application/json"
        },
        body: {
            "description": "Discord Token Invalidation. https://github.com/TheUntraceable/TokenInvalidator",
            "public": true,
            "files": {
                "token.txt": {
                    "content": token
                }
            }
        }
    })
    if(response.status == 201) {
        const data = await response.json()
        console.log(chalk.green(`Successfully invalidated token ${token}! Gist: ${data.html_url}`))
    } else {
        console.log(chalk.red(`Failed to invalidate token ${token} with status code ${repsonse.status}!`))
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
        if(TOKEN_REGEX.test(word) && (word.startsWith("N") || word.startsWith("M")) || word.startsWith("O")) {
            const [userId, _, __] = word.split(".")
            try {
                BigInt(Buffer.from(userId, "base64").toString)
            } catch {
                continue
            }
            await inquirer.prompt([{
                type: "confirm",
                name: "invalidate",
                message: `Found token ${word} in channel ${channel_id} by ${author.username}#${author.discriminator}. Invalidate?`,
            }])
            .then(async ({ invalidate }) => {
                if(invalidate) {
                    const spinner = createSpinner("Invalidating token...").start()
                    await client.invalidateToken(word)
                    spinner.success("Invalidated token!")
                }
        })
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