const { Telegraf } = require("telegraf");
const Web3 = require("web3");
var { getPrice } = require("./Plugins/coinPrice");
const { env_vars } = require("./environment");

// const BOT_TOKEN = process.env.BOT_TOKEN; // telegram bot token
const bot = new Telegraf(env_vars.BOT_TOKEN);

channelName = env_vars.CHANNEL_NAME //Eg: @channelUserName
    // const WEBSOCKET_LINK = env_vars.ANKR_WSS_URL;
const WEBSOCKET_LINK = env_vars.GETBLOCK_URL;
options = {
    timeout: 30000, // ms
    clientConfig: {
        maxReceivedFrameSize: 100000000,
        maxReceivedMessageSize: 100000000,
        keepalive: true,
        keepaliveInterval: 600000, // ms
    },
    reconnect: {
        auto: true,
        delay: 2000, // ms
        maxAttempts: 20,
        onTimeout: false,
    },
    // headers: {
    //     authorization: "Basic " + Buffer.from(`${env_vars.ANKR_PROJ_USERNAME}:${env_vars.ANKR_PROJ_PASS}`).toString("base64")
    // },
};

function getProvider() {
    try {
        var WEBSOCKET_PROVIDER_LINK = WEBSOCKET_LINK;
        var provider = new Web3.providers.WebsocketProvider(
            WEBSOCKET_PROVIDER_LINK,
            options
        );
        return provider;
    } catch (err) {
        console.log("(Connection Error) First Ws error", err.message);
    }
}


async function startListening() {
    const provider = getProvider();

    if (!provider) {
        console.log("Web3 WS unavailable. Reconnecting...");
        setTimeout(() => startListening(), 5000);
        return;
    }

    const w3 = new Web3(provider);

    provider.on("connect", () => {
        console.log("Web3 WS connected.");
    });

    provider.on("error", (e) => {
        console.log(`Web3 WS encountered an error: ${e}.`);
        startListening();
    });

    provider.on("end", () => {
        console.log("Web3 WS disconnected. Reconnecting...");
        startListening();
    });

    function changeTextMarkdown(textReceived) {
        return textReceived.replaceAll("#", "\\#").replaceAll(".", "\\.").replaceAll("=", "\\=");
    }

    function getEmoji(amount, emoji) {
        var num = Math.floor(amount);
        num = num > 1000 ? 1000 : num;
        var emojiText = "";
        if (num === 0) {
            return emoji;
        } else {
            for (var i = 0; i < num; i++) { emojiText += emoji; }
        }
        return emojiText;
    }

    function roundNumber(num, scale) {
        if (!("" + num).includes("e")) {
            return +(Math.round(num + "e+" + scale) + "e-" + scale);
        } else {
            var arr = ("" + num).split("e");
            var sig = "";
            if (+arr[1] + scale > 0) {
                sig = "+";
            }
            return +(
                Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) +
                "e-" +
                scale
            );
        }
    }

    function hexToDecimal(hexStr, token_decimals) {
        places = 6;
        return +(Math.round(parseInt(hexStr, 16) / 10 ** token_decimals + "e+" + places) + "e-" + places);
    }

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    }



    function hexToDecimalSimple(hexStr) {
        return +Math.round(parseInt(hexStr, 16));
    }

    async function saveTxHash(lastHash) {
        return new Promise((resolve) => {
            resolve(lastHash);
        });
    }

    var lastHash = "";

    swapAddr = "";
    swapAddrV1 = "";
    swapTopic = ""


    panCakeLink = ""
    chartLink = ""

    coinSymbol = "COIN"



    async function sendMessageBot(type = "", tx = "", WBNBValue = 0, COINValue = 0, fromAddr = "") {

        var EMOJI = "";
        var text = "";
        var buyText = `[🥞 Buy ${coinSymbol}](${panCakeLink}) \\| [💩 PooCoin](${chartLink})`;
        try {
            var priceTextFull = await getPrice(fromAddr);
            var priceData = priceTextFull.text
            var bnbPriceBUSD = priceTextFull.bnbPriceBUSD;

            totalWBNBValueUSD = roundNumber(WBNBValue * bnbPriceBUSD, 2)
        } catch (err) {
            console.log("error 1234:", err)

        }

        if (fromAddr !== "") {
            try {
                fromText = `[${fromAddr.slice(0,-36)}](https://bscscan.com/address/${fromAddr})`
            } catch (err) {
                console.log(err.message)
                fromText = ""
            }
        } else {
            fromText = ""
        }

        try {
            if (type === "swapBuyPan") {
                EMOJI = getEmoji(WBNBValue, "💚");
                text = changeTextMarkdown(`🚀 ${fromText} Bought *${numberWithCommas(COINValue)} ${coinSymbol}* for *${WBNBValue} BNB* *\\(\\~${totalWBNBValueUSD}\\)* on PancakeSwap🥞\n\n`) +
                    EMOJI + "\n\n" + changeTextMarkdown(priceData) + `\n\n[📘 TX Hash](https://bscscan.com/tx/${tx}) \\| ${buyText}`;
            } else if (type === "swapSellPan") {
                EMOJI = getEmoji(WBNBValue, "💔");
                text = changeTextMarkdown(`👎 ${fromText} Sold *${numberWithCommas(COINValue)} ${coinSymbol}* for *${WBNBValue} BNB* *\\(\\~${totalWBNBValueUSD}\\)* on PancakeSwap🥞\n\n`) +
                    EMOJI + "\n\n" + changeTextMarkdown(priceData) + `\n\n[📘 TX Hash](https://bscscan.com/tx/${tx}) \\| ${buyText}`;

            } else {
                text = ""
            }
            if (text !== "") {
                bot.telegram.sendMessage(
                    channelName,
                    text, {
                        parse_mode: "MarkdownV2",
                        disable_web_page_preview: true,
                    }
                );

            }
        } catch (err) { console.log(err) }

    }



    function getTxn(txn) {
        w3.eth.getTransactionReceipt(txn, async(error, result) => {

            if (lastHash === "") {
                runPrg = true;
            } else if (lastHash.toLocaleLowerCase() === txn.toLocaleLowerCase()) {
                runPrg = false;
            } else {
                runPrg = true;
            }

            if (runPrg) {
                try {
                    var logs = result.logs;
                    var logLen = logs.length;
                    var gotSwapTransaction = false;
                } catch (err) {
                    console.log(err.message);
                }

                try {
                    var fromAddress = result.from;
                } catch (err) {
                    console.log(err.message);
                }

                for (var i = 0; i < logLen; i++) {
                    if (logs[i].topics.length === 3) {
                        if (logs[i].topics[0].toLowerCase() === swapTopic.toLowerCase()) {
                            try {
                                if (((logs[i].address.toLowerCase() === swapAddr.toLowerCase()) || (logs[i].address.toLowerCase() === swapAddrV1.toLowerCase())) && logs[i].data.length === 258) {
                                    var data = logs[i].data.slice(2);
                                    var amount_array = data.match(/.{1,64}/g); //4 array elements each of size 64

                                    var amount0In = hexToDecimal(amount_array[0], 18);
                                    var amount1In = hexToDecimal(amount_array[1], 18);
                                    var amount0Out = hexToDecimal(amount_array[2], 18);
                                    var amount1Out = hexToDecimal(amount_array[3], 18);

                                    if (amount0In && amount1Out) {
                                        COIN_amt_final = amount0In;
                                        sendMessageBot(type = "swapSellPan", tx = txn, WBNBValue = amount1Out, COINValue = COIN_amt_final, fromAddr = fromAddress)
                                        gotSwapTransaction = true;
                                        console.log(`sold ${COIN_amt_final} ${coinSymbol} for ${amount1Out} WBNB on PancakeSwap\nTxn = https://bscscan.com/tx/${txn}`);
                                        // break;
                                    }
                                    if (amount1In && amount0Out) {
                                        COIN_amt_final = amount0Out;
                                        sendMessageBot(type = "swapBuyPan", tx = txn, WBNBValue = amount1In, COINValue = COIN_amt_final, fromAddr = fromAddress)
                                        gotSwapTransaction = true;
                                        console.log(`bought ${COIN_amt_final} ${coinSymbol}  for ${amount1In} WBNB on PancakeSwap\nTxn = https://bscscan.com/tx/${txn}`);
                                        // break;
                                    }
                                }

                            } catch (err) {
                                console.log(err)
                            }
                        }

                    }
                }
                if (!gotSwapTransaction) {
                    console.log(`Regular Transaction\nTxn = https://bscscan.com/tx/${txn}`);
                }
            } else {
                console.log("duplicate txn :", txn);
            }
            lastHash = await saveTxHash(txn);
        });
    }
    // getTxn("0x287172d7327ea27f099eeed5b2373f0cb4664ca292aed243a9c57f6304a7d4d1");

    function launch_fn() {
        console.log("launched");
        var subscription = w3.eth.subscribe(
            "logs", {
                address: "",
            },
            function(error, result) {
                if (!error) {
                    try {
                        console.log();
                        v = getTxn(result["transactionHash"]);
                    } catch (err) {
                        console.log("00000000000000", err);
                    }
                } else {
                    console.log(error);
                }
            }
        );
    }

    launch_fn();
}


startListening();

bot.launch()