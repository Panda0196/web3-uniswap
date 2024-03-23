// https://www.quicknode.com/guides/defi/dexs/how-to-swap-tokens-on-uniswap-with-ethersjs
// https://ethereum.stackexchange.com/questions/107914/how-to-approve-swapexacttokensforeth-from-uniswaprouter-v2-before-invoking-it
// https://stackoverflow.com/questions/67689357/web3-nodejs-not-working-with-swapexacttokensforeth-on-pancakeswapv2
// https://www.reddit.com/r/solidity/comments/13qtba9/swap_tokens_for_eth_using_uniswap_router_and/

const fs = require('fs')
const { ethers } = require("ethers")
const UNISWAP = require("@uniswap/sdk")
const { Token, WETH, Fetcher, Route, Trade, TokenAmount, TradeType, Percent} = require("@uniswap/sdk")

const chainlist_rpc_server = "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
const provider = new ethers.providers.JsonRpcProvider(chainlist_rpc_server)
const privateKey = fs.readFileSync("../.secret").toString().trim()
const wallet = new ethers.Wallet(privateKey, provider)

UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
UNISWAP_ROUTER_ABI = fs.readFileSync("./abis/router.json").toString()
UNISWAP_ROUTER_CONTRACT = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, provider)

DAI_CONTRACT_ADDRESS = "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844"
DAI_CONTRACT_ABI = fs.readFileSync("./abis/dai.json").toString()
DAI_CONTRACT_CONTRACT = new ethers.Contract(DAI_CONTRACT_ADDRESS, DAI_CONTRACT_ABI, wallet)

const DAI = new Token(
    UNISWAP.ChainId.GÖRLI,
    "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
    18
)

const LINK = new Token(
    UNISWAP.ChainId.GÖRLI,
    "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    18
)

async function swapTokens(token1, token2, amount, slippage = "50") {
    try {
        const pair = await Fetcher.fetchPairData(token2, token1, provider); //creating instances of a pair
        const route = await new Route([pair], token2); // a fully specified path from input token to output token
        let amountIn = ethers.utils.parseUnits(amount.toString(), 18); //helper function to convert ETH to Wei
        let amountInString = amountIn.toString()
        
        const slippageTolerance = new Percent(slippage, "10000"); // 50 bips, or 0.50% - Slippage tolerance
    
        const trade = new Trade( //information necessary to create a swap transaction.
            route,
            new TokenAmount(token2, amountInString), //?library.utils.toWei(amount)
            TradeType.EXACT_INPUT
        );

        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex
        const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString();
        const path = [token2.address, token1.address]; //An array of token addresses
        const to = wallet.address; // should be a checksummed recipient address
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
        const value = trade.inputAmount.raw; // // needs to be converted to e.g. hex
        const valueHex = await ethers.BigNumber.from(value.toString()).toHexString(); //convert to hex string
    
        // await UNISWAP_ROUTER_CONTRACT.methods.approve(value, account);
        await DAI_CONTRACT_CONTRACT.approve(UNISWAP_ROUTER_ADDRESS, amountIn);

        //Return a copy of transactionRequest, The default implementation calls checkTransaction and resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related operations on Signer.
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForTokens(valueHex, amountOutMinHex, path, to, deadline)
    
        //Returns a Promise which resolves to the transaction.
        let sendTxn = (await wallet).sendTransaction(rawTxn)

        //Resolves to the TransactionReceipt once the transaction has been included in the chain for x confirms blocks.
        let reciept = (await sendTxn).wait()

        //Logs the information about the transaction it has been mined.
        if (reciept) {
            console.log("Transaction is mined!" + '\n' 
            + "Hash: ", (await sendTxn).hash + '\n' 
            + "Block Number: " + (await reciept).blockNumber + '\n' 
            + "Link: https://goerli.etherscan.io/tx/" 
            + (await sendTxn).hash)
        } else {
            console.log("Error submitting transaction")
        }

    } catch(e) {
        console.log(e)
    }
}

swapTokens(LINK, DAI, 200)