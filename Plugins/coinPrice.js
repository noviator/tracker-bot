const Web3 = require("web3");
const abi_BNB_BUSD = require('./abi_all/abi_BNB_BUSD.json')
const abi_WBNB_COIN = require('./abi_all/abi_WBNB_COIN.json')
const abi_coin = require('./abi_all/abi_coin.json')
const { address } = require('./address_all')
const { env_vars } = require("../environment");

var web3_api_endpoint = env_vars.WEB3API_URL;
var all_endpoints = [
    web3_api_endpoint,
    "https://bsc-dataseed.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/",

    "https://bsc-dataseed2.defibit.io/",
    "https://bsc-dataseed3.defibit.io/",
    "https://bsc-dataseed4.defibit.io/",

    "https://bsc-dataseed2.ninicoin.io/",
    "https://bsc-dataseed3.ninicoin.io/",
    "https://bsc-dataseed4.ninicoin.io/",

    "https://bsc-dataseed1.binance.org/",
    "https://bsc-dataseed2.binance.org/",
    "https://bsc-dataseed3.binance.org/",
    "https://bsc-dataseed4.binance.org/",
];

endpoints_length = all_endpoints.length
var w3

async function getPrice(fromAddress = "") {
    for (let i = 0; i < endpoints_length; i++) {
        try {
            w3 = new Web3(new Web3.providers.HttpProvider(all_endpoints[i]));
            var data = await getPrice2(fromAddress)
            if (data) {
                return data;
            }
            if (i === (endpoints_length - 1)) {
                console.log(data);
                return data;
            }
        } catch (err) {
            console.log(`coinPrice getPrice ERROR : ${err}`)
        }
    }
}



var token0Symbol = 'COIN'
var token1Symbol = 'WBNB'

var token0Decimal = 18
var token1Decimal = 18

var CoinName = token0Symbol
var coinDecimal = 18
var LargeNumberfactor = 1 // in billion =>10**9
var lrg = '1'

function roundNumber(num, scale) {
    if (!("" + num).includes("e")) {
        return +(Math.round(num + "e+" + scale) + "e-" + scale);
    } else {
        var arr = ("" + num).split("e");
        var sig = ""
        if (+arr[1] + scale > 0) {
            sig = "+";
        }
        return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
}


function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

async function getPrice2(fromAddress = "") {

    try {
        var contract_WBNB_COIN = new w3.eth.Contract(abi_WBNB_COIN, address.address_WBNB_COIN)
        var reserve_WBNB_COIN = await contract_WBNB_COIN.methods.getReserves().call()

        var reserve_token0 = reserve_WBNB_COIN[0] / 10 ** token0Decimal
        var reserve_token1 = reserve_WBNB_COIN[1] / 10 ** token1Decimal
        if (token0Symbol === 'WBNB') {
            var coinPriceWBNB = (reserve_token0 / reserve_token1) * LargeNumberfactor
        } else {
            var coinPriceWBNB = (reserve_token1 / reserve_token0) * LargeNumberfactor;
        }
    } catch (err) {
        console.log(`coinPrice getPrice2 ERROR1 : ${err}`);
        return false
    }

    try {
        var contract_BNB_BUSD = new w3.eth.Contract(abi_BNB_BUSD, address.address_BNB_BUSD);
        var reserve_BNB_BUSD = await contract_BNB_BUSD.methods.getReserves().call()
        var bnbPriceBUSD = reserve_BNB_BUSD[1] / reserve_BNB_BUSD[0]
        var coinPriceBUSD = coinPriceWBNB * bnbPriceBUSD
    } catch (err) {
        console.log(`coinPrice getPrice2 ERROR2 : ${err}`);
        return false;
    }

    if (fromAddress != "") {
        try {
            var contract_coin = new w3.eth.Contract(abi_coin, address.address_coin);
            var balance_coin = await contract_coin.methods.balanceOf(fromAddress).call() / (10 ** coinDecimal);
        } catch (err) {
            balance_coin = "";
            console.log(`coinPrice getPrice2 ERROR3 : ${err}`);
        }
    } else {
        balance_coin = "";
    }

    var walletBalanceText = "";

    if (balance_coin !== "") {
        try {
            balance_coin_usd = balance_coin * coinPriceBUSD;
            console.log(balance_coin);
        } catch (err) {
            console.log(err);
        }
        try {
            balance_coin_usd = roundNumber(balance_coin_usd, 2);
            balance_coin_usd = numberWithCommas(balance_coin_usd);
        } catch (err) {
            console.log(err);
        }

        try {
            balance_coin = roundNumber(balance_coin, 2);
            balance_coin = numberWithCommas(balance_coin);
        } catch (err) {
            console.log(err);
        }

        try {
            walletBalanceText =
                `[Wallet Balance](https://bscscan.com/token/${address.address_coin}?a=${fromAddress}): *${balance_coin} ${CoinName}* \\(*$${balance_coin_usd}*\\)`;
        } catch (err) {
            console.log(err)
        }

    }



    try {
        coinPriceBUSD = roundNumber(coinPriceBUSD, 8)
    } catch (err) {
        console.log(err);
    }

    try {
        bnbPriceBUSD = roundNumber(bnbPriceBUSD, 2)
    } catch (err) {
        console.log(err);

    }

    text = `*${lrg} $${CoinName}* = *$${coinPriceBUSD}*\n*${lrg} BNB*    = *$${bnbPriceBUSD}*\n\n${walletBalanceText}`;
    return { text, bnbPriceBUSD }
}

module.exports = { getPrice }