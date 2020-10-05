const { Telegraf } = require('telegraf')
const Telegram = require('telegraf/telegram')
var EnvVar = require('dotenv')
EnvVar.config();


const bot = new Telegraf(process.env.BOT_TOKEN)
const telegram = new Telegram(process.env.BOT_TOKEN)

function MakeID(length) {
    var result = ''
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var charactersLength = characters.length
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result;
}

var groupID = 0
var gameRooms = []
class GameRoom {
    constructor(roomCode){
        this.roomCode = roomCode
        this.players = []
        this.currentTurn = 0
        this.gotItRight = []
        this.isStarted = false
        this.hasEnded = false
        this.assigning = false
    }
}
players = {}
class PlayerSession {
    constructor(id){
        this.id = id
        this.roomIndex = 0
        this.playerIndex = 0
        this.matchIndex = 0
        this.VIP = false
    }
}

bot.start((ctx) => {
    players[ctx.from.id] = new PlayerSession(ctx.from.id)
    console.log(players)
    ctx.reply("Bem vindo!")
})

bot.command("new", (ctx) => {
    // var playerSession = players[ctx.from.id]
    ctx.reply(ctx.chat.id)
    groupID = ctx.chat.id
    if (players[ctx.from.id] === undefined){
        players[ctx.from.id] = new PlayerSession(ctx.from.id)
        console.log(players)
    }
    players[ctx.from.id].roomIndex = gameRooms.length
    var newID = MakeID(4)
    gameRooms.push(new GameRoom(newID))
    gameRooms[players[ctx.from.id].roomIndex].players.push({id:ctx.from.id,name:ctx.from.first_name,identity:""})
    players[ctx.from.id].playerIndex = 0
    players[ctx.from.id].matchIndex = 1
    players[ctx.from.id].VIP = true
    ctx.reply(players[ctx.from.username])
    ctx.reply(ctx.from.first_name + " criou um novo jogo. Entre no jogo com /join " + newID)
})

bot.hears(/\/join\s*([^\n\r]*)/, (ctx) => {
    var playerName = ctx.from.first_name
    var roomCode = ctx.match[1]
    var joinSuccesful = false
    gameRooms.forEach((gameRoom, index, array) => {
        if (gameRoom.roomCode === roomCode){
            joinSuccesful = true
            if (players[ctx.from.id] === undefined){
                players[ctx.from.id] = new PlayerSession(ctx.from.id)
                console.log(players)
            }
            players[ctx.from.id].roomIndex = index
            players[ctx.from.id].playerIndex = gameRooms[players[ctx.from.id].roomIndex].players.length
            gameRooms[players[ctx.from.id].roomIndex].players.push({id:ctx.from.id,name:ctx.from.first_name,identity:""})
            players[ctx.from.id].matchIndex = players[ctx.from.id].playerIndex + 1
            players[ctx.from.id].VIP = false
            telegram.sendMessage(groupID, playerName + " se juntou ao jogo.")

            // var currentRoom = gameRooms[players[ctx.from.id].roomIndex]
            // currentRoom.players.forEach((player,index,array) => {
            //     telegram.sendMessage(player.id, playerName + " se juntou ao jogo.")
            // })
        }
    })
    if (!joinSuccesful){
        ctx.reply("This game room doesn't exist. If you want to create a new one, use /new")
    }
    // ctx.reply(players[ctx.from.id])
    // ctx.reply(ctx.from.first_name + "se juntou ao jogo.")
})

bot.hears(/\/begin\s*([^\n\r]*)/, (ctx) => {
    if (players[ctx.from.id]){
        if (ctx.match[1] == gameRooms[players[ctx.from.id].roomIndex].roomCode){
            if (players[ctx.from.id].VIP){
                gameRooms[players[ctx.from.id].roomIndex].assigning = true
                ctx.reply("Começando o jogo...")
                gameRooms[players[ctx.from.id].roomIndex].players.forEach((player,index,array) => {
                    let match = (index === array.length - 1) ? 0 : index + 1
                    telegram.sendMessage(player.id, "Qual a identidade secreta de " + array[match].name + "?")
                })
            } else {
                ctx.reply("The VIP player needs to start the game.")
            }
        } else {
            ctx.reply("Incorrect game room code.")
        }
    } else {
        ctx.reply("Player not registered.")
    }
})

bot.command("status", (ctx) => {
    gameRooms.forEach((gameRoom,index,array) => {
        ctx.reply("Game room: " + gameRoom.roomCode)
    })
    if (players[ctx.from.id]){
        ctx.reply(players[ctx.from.id])
    }
})

bot.command("next", (ctx) => {
    if (players[ctx.from.id]){
        var currentRoom = gameRooms[players[ctx.from.id].roomIndex]
        telegram.sendMessage(groupID, "É a vez de " + currentRoom.players[currentRoom.currentTurn].name + ".")
        currentRoom.players.forEach((player,index,array) => {
            if (index === currentRoom.currentTurn){
                telegram.sendMessage(player.id, "É sua vez! Você pode tentar uma resposta com '/answer resposta' ou '/next' para passar a vez")
            } else {
                telegram.sendMessage(player.id, "É a vez de " + currentRoom.players[currentRoom.currentTurn].name + ", lembre-se que a identidade secreta é: " + currentRoom.players[currentRoom.currentTurn].identity)
            }
        })
        while (currentRoom.gotItRight.indexOf((currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)) >= 0){
            currentRoom.currentTurn = (currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)
        }
        gameRooms[players[ctx.from.id].roomIndex].currentTurn = (currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)
    }
})

bot.hears(/\/answer\s*([^\n\r]*)/, (ctx) => {
    if (players[ctx.from.id]){
        var currentRoom = gameRooms[players[ctx.from.id].roomIndex]
        var currentPlayer = currentRoom.players[players[ctx.from.id].playerIndex]
        telegram.sendMessage(groupID, "É a vez de " + currentRoom.players[currentRoom.currentTurn].name + ".")
        currentRoom.players.forEach((player,index,array) => {
            if (index === currentRoom.currentTurn){
                telegram.sendMessage(player.id, "É sua vez! Você pode tentar uma resposta com '/answer resposta' ou /next para passar a vez")
            } else {
                telegram.sendMessage(player.id, "É a vez de " + currentRoom.players[currentRoom.currentTurn].name + ", lembre-se que a identidade secreta é: " + currentRoom.players[currentRoom.currentTurn].identity)
            }
        })
        if (ctx.match[1] == currentPlayer.identity && currentRoom.gotItRight.indexOf(players[ctx.from.id].playerIndex) < 0){
            ctx.reply("Resposta certa! Parabéns!")
            gameRooms[players[ctx.from.id].roomIndex].gotItRight.push(players[ctx.from.id].playerIndex)
            if (gameRooms[players[ctx.from.id].roomIndex].gotItRight.length === gameRooms[players[ctx.from.id].roomIndex].players.length){
                //GAME ENDED
                gameRooms[players[ctx.from.id].roomIndex].hasEnded = true
                ctx.reply("Todos acertaram! Parabéns! Use /new para criar um novo jogo.")
            }
        } else {
            while (currentRoom.gotItRight.indexOf((currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)) >= 0){
                currentRoom.currentTurn = (currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)
            }
            gameRooms[players[ctx.from.id].roomIndex].currentTurn = (currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)
        }
    }
})

bot.hears(/.+/, (ctx) => {
    if (players[ctx.from.id]){
        if (gameRooms[players[ctx.from.id].roomIndex].assigning){
            let match = (players[ctx.from.id].matchIndex === gameRooms[players[ctx.from.id].roomIndex].players.length) ? 0 : players[ctx.from.id].matchIndex
            gameRooms[players[ctx.from.id].roomIndex].players[match].identity = ctx.match[0]
            ctx.reply("A identidade secreta de " + gameRooms[players[ctx.from.id].roomIndex].players[match].name + " será " + gameRooms[players[ctx.from.id].roomIndex].players[match].identity)
            var count = 0
            gameRooms[players[ctx.from.id].roomIndex].players.forEach((player,index,array) => {
                if (player.identity !== ""){
                    count += 1
                }
            })
            if (count === gameRooms[players[ctx.from.id].roomIndex].players.length){
                //GAME STARTED
                var currentRoom = gameRooms[players[ctx.from.id].roomIndex]
                gameRooms[players[ctx.from.id].roomIndex].assigning = false
                telegram.sendMessage(groupID, "Todos escolheram as identidades secretas!")
                // currentRoom.players.forEach((player,index,array) => {
                //     telegram.sendMessage(player.id, "Todos escolheram as identidades secretas!")
                // })
                telegram.sendMessage(groupID, "É a vez de " + currentRoom.players[currentRoom.currentTurn].name + ".")
                currentRoom.players.forEach((player,index,array) => {
                    if (index === currentRoom.currentTurn){
                        telegram.sendMessage(player.id, "É sua vez! Você pode tentar uma resposta com '/answer resposta' ou /next para passar a vez")
                    } else {
                        telegram.sendMessage(player.id, "É a vez de " + currentRoom.players[currentRoom.currentTurn].name + ", lembre-se que a identidade secreta é: " + currentRoom.players[currentRoom.currentTurn].identity)
                    }
                })
                gameRooms[players[ctx.from.id].roomIndex].currentTurn = (currentRoom.currentTurn === currentRoom.players.length - 1) ? 0 : (currentRoom.currentTurn + 1)
            }
        }
    }
})

bot.launch()