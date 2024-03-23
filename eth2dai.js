// https://www.quicknode.com/guides/defi/dexs/how-to-swap-tokens-on-uniswap-with-ethersjs
// https://stackoverflow.com/questions/64627133/using-uniswap-sdk-gives-me-this-error-resolver-or-addr-is-not-configured-for-en
// https://stackoverflow.com/questions/67846204/uniswap-js-sdk-and-ethers-js-trying-to-swap-eth-for-tokens
// https://cryptocam.tech/2020/09/05/using-the-uniswap-v2-sdk/
// https://ethereum.stackexchange.com/questions/153167/error-invalid-signer-or-provider-argument-signerorprovider-value-code-i
// https://syncswap.gitbook.io/api-documentation/guides/request-swap-with-router/swap-eth-for-dai
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

const DAI = new Token(
    UNISWAP.ChainId.GÖRLI,
    "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
    18
)

async function swapTokens(tokenOut, tokenIn, amount, slippage = "50") {
    try {
        const pair = await Fetcher.fetchPairData(tokenOut, tokenIn, provider); //creating instances of a pair
        const route = await new Route([pair], tokenIn); // a fully specified path from input token to output token
        let amountIn = ethers.utils.parseEther(amount.toString()); //helper function to convert ETH to Wei
        amountIn = amountIn.toString()
        
        const slippageTolerance = new Percent(slippage, "10000"); // 50 bips, or 0.50% - Slippage tolerance
    
        const trade = new Trade( //information necessary to create a swap transaction.
            route,
            new TokenAmount(tokenIn, amountIn),
            TradeType.EXACT_INPUT
        );

        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex
        const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString();
        const path = [tokenIn.address, tokenOut.address]; //An array of token addresses
        const to = wallet.address; // should be a checksummed recipient address
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
        const value = trade.inputAmount.raw; // // needs to be converted to e.g. hex
        const valueHex = await ethers.BigNumber.from(value.toString()).toHexString(); //convert to hex string
    
        //Return a copy of transactionRequest, The default implementation calls checkTransaction and resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related operations on Signer.
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokens(amountOutMinHex, path, to, deadline, {
            value: valueHex
        })
    
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

swapTokens(DAI, WETH[DAI.chainId], .02)