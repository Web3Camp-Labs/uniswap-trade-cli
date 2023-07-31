import { Token } from "@uniswap/sdk-core";
import { Trading } from "./libs/trading";
import { program } from "commander";
import { loadTradeConfig } from "./tradeConf";
import 'dotenv/config';
import { exit } from "process";

import { TickMath } from "@uniswap/v3-sdk";
import { toNumber } from "ethers";

import {
    fromReadableAmount,
    createWallet,
    getCurrencyBalance,
    getCurrencyDecimals,
    sendTransaction,
    TransactionState,
} from './libs/utils'

async function main() {

    program
        .name('uniswap-trade-cli')
        .description('CLI to trade tokens on uniswap.')
        .version('0.0.1');

    program
        .requiredOption('-n, --chain-id <string>', "The Chain ID of the network")
        .option('-u, --rpc-url <string>', "HTTP URL of the RPC endpoint")
        .option('-f, --config-file <string>', "The trade config file for batch trading")
        // .option('-a, --amount-to-approve <string>', "Amount of tokens to approve for the swap. Make sure to use the correct decimals")
        .option('-s, --amount-to-swap <string>', "Amount of tokens to swap. If you don't use the 'd' (decimals) flag, make sure to use the correct decimals")
        .option('-i, --token-in <string>', "Address of the token to swap from")
        .option('-o, --token-out <string>', "Address of the token to swap to");

    program.parse();

    let opts = program.opts();
    console.debug(opts);

    const conf = loadTradeConfig(opts.chainId);
    if (!conf) {
        console.error(`invalid chain id ${opts.chainId}`);
        exit(-1);
    }

    if (!!opts.configFile) {
        /// batch trading

        console.debug(`config file is ${opts.configFile}`);

    } else {
        /// single trading
        /// Check parameters

        if (!opts.tokenIn) { console.error(`missing tokenIn address`); exit(-1); }
        if (!opts.tokenOut) { console.error(`missing tokenOut address`); exit(-1); }
        if (!opts.amountToSwap) { console.error(`missing amout to swap`); exit(-1); }

        const T = new Trading(
            process.env.TRADE_PRIVATE_KEY!,
            opts.rpcUrl || conf.rpc,
            conf.chainId,
            conf.poolFactoryAddress,
            conf.swapRouterAddress,
            conf.quoterAddress);

        // const info = await T.getPoolInfo(new Token(1, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6), new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18));
        // const info = await T.getPoolInfo(new Token(137, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6),new Token(137, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 6));

        // const poolInfo = await T.getPoolInfo(
        //     new Token(conf.chainId, opts.tokenIn, 6),
        //     new Token(conf.chainId, opts.tokenOut, 6));
        // console.log('pool info:', poolInfo);

        console.debug('create trade...');

        // correct decimals
        const tokenInDecimals = await getCurrencyDecimals(T.getProvider()!, new Token(conf.chainId, opts.tokenIn, 18));
        const tokenOutDecimals = await getCurrencyDecimals(T.getProvider()!, new Token(conf.chainId, opts.tokenOut, 18));

        console.log(typeof (tokenInDecimals))
        var tokenIn = new Token(conf.chainId, opts.tokenIn, tokenInDecimals);
        var tokenOut = new Token(conf.chainId, opts.tokenOut, tokenOutDecimals);

        // create trade
        const tradeInfo = await T.createTrade(
            tokenIn,
            tokenOut,
            opts.amountToSwap
        );
        console.debug(`trade info:`, tradeInfo);

        const result = await T.executeTrade(tradeInfo);
        console.log(result);

    }

    console.log("Done");
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
