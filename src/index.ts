/// index.ts

import 'dotenv/config';
import { Token } from "@uniswap/sdk-core";
import { Trading } from "./libs/trading";
import { program } from "commander";
import { loadTradeConfig } from "./tradeConf";
import { exit } from "process";

import * as fs from "fs";
import { parse } from 'csv-parse/sync'

import { TickMath } from "@uniswap/v3-sdk";
import { toNumber } from "ethers";

import {
    fromReadableAmount,
    createWallet,
    getCurrencyBalance,
    getCurrencyDecimals,
    sendTransaction,
    TransactionState,
} from './libs/utils';


function loadcsv(path: string) {
    const input = fs.readFileSync(path, 'utf-8');
    return parse(input, {
        encoding: 'utf8',
        trim: true,
        columns: true,
        auto_parse: true,
        skip_empty_lines: true,
        ltrim: true,
        rtrim: true,
        // quoting: true,
        // header: true,
        bom: true,
    })
}

async function runOnce(chainId: number, rpcUrl: string, privKey: string, tokenInAddress: string, tokenOutAddress: string, amountToSwap: number, needApproval?: boolean, approvalMax?: boolean): Promise<TransactionState> {
    const conf = loadTradeConfig(chainId);
    if (!conf) {
        console.error(`invalid chain id ${chainId}`);
        exit(-1);
    }

    const T = new Trading(
        privKey,
        rpcUrl || conf.rpc,
        conf.chainId,
        conf.poolFactoryAddress,
        conf.swapRouterAddress,
        conf.quoterAddress);

    /// correct decimals
    const tokenInDecimals = await getCurrencyDecimals(T.getProvider()!, new Token(conf.chainId, tokenInAddress, 18));
    const tokenOutDecimals = await getCurrencyDecimals(T.getProvider()!, new Token(conf.chainId, tokenOutAddress, 18));

    var tokenIn = new Token(conf.chainId, tokenInAddress, tokenInDecimals);
    var tokenOut = new Token(conf.chainId, tokenOutAddress, tokenOutDecimals);

    /// TODO: check balance and handle error
    const tokenInBalance = await getCurrencyBalance(T.getProvider()!, T.getWalletAddress()!, tokenIn);
    // console.log(`tokenInBalance: `, tokenInBalance);
    if (parseFloat(tokenInBalance) < amountToSwap) {
        return TransactionState.Rejected;
    }

    if(amountToSwap <= 0) {
        amountToSwap = parseFloat(tokenInBalance);
    }

    /// handle approval
    if (needApproval && tokenIn.isToken) { // Give approval to the router to spend the erc20 token
        var ret;
        if (approvalMax) {
            ret = await T.getTokenApprovalMax(tokenIn);
        } else {
            ret = await T.getTokenTransferApproval(tokenIn, amountToSwap);
        }
        if (ret !== TransactionState.Sent) return TransactionState.Failed;
    }

    /// create trade
    const tradeInfo = await T.createTrade(
        tokenIn,
        tokenOut,
        amountToSwap
    );
    // console.debug(`wallet address: `, T.getWalletAddress(),`trade info: `, tradeInfo);

    /// execute trade
    const result = await T.executeTrade(tradeInfo);
    return result;

    // return TransactionState.Sending; // test code
}

async function main() {

    program
        .name('uniswap-trade-cli')
        .description('CLI to trade tokens on uniswap.')
        .version('0.0.1');

    program
        .requiredOption('-n, --chain-id <string>', "The Chain ID of the network")
        .option('-u, --rpc-url <string>', "HTTP URL of the RPC endpoint")
        .option('-f, --config-file <string>', "The trade config file for batch trading")
        .option('-s, --amount-to-swap <string>', "Amount of tokens to swap. If you don't use the 'd' (decimals) flag, make sure to use the correct decimals")
        .option('-i, --token-in <string>', "Address of the token to swap from")
        .option('-o, --token-out <string>', "Address of the token to swap to")
        .option('-m, --approval-max', "Approval max allowance for token", false)
        .option('-p, --needApproval', "Need approval or not for token", false);

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

        let data = loadcsv(opts.configFile);
        data = data.filter((r: any) => r.privateKey && r.amount);

        if (data.length == 0) {
            console.error('Empty csv file or missing columns');
            return;
        }

        var promisesArr: Promise<any>[] = [];

        for await (const iterator of data) {
            await runOnce(
                conf.chainId,
                opts.rpcUrl,
                iterator.privateKey,
                iterator.tokenIn,
                iterator.tokenOut,
                iterator.amount,
                opts.needApproval,
                opts.approvalMax);
        }

        // for (let index = 0; index < data.length; index++) {
        //     const elem = data[index];
        //     promisesArr.push(runOnce(conf!.chainId, opts.rpcUrl, elem.privateKey, elem.tokenIn, elem.tokenOut, elem.amount))

        //     // await runOnce(conf.chainId, opts.rpcUrl, elem.privateKey, elem.tokenIn, elem.tokenOut, elem.amount);
        // }

        // console.log(data);
        // await Promise.all(promisesArr);

    } else {
        /// single trading
        /// Check parameters

        if (!opts.tokenIn) { console.error(`missing tokenIn address`); exit(-1); }
        if (!opts.tokenOut) { console.error(`missing tokenOut address`); exit(-1); }
        if (!opts.amountToSwap) { console.error(`missing amout to swap`); exit(-1); }

        await runOnce(
            opts.chainId,
            opts.rpcUrl,
            process.env.TRADE_PRIVATE_KEY!,
            opts.tokenIn,
            opts.tokenOut,
            opts.amountToSwap,
            opts.needApproval,
            opts.approvalMax);
    }

    console.log("Done");
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
