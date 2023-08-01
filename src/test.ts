/// test.ts
import 'dotenv/config';

import { CurrencyAmount, TradeType, Ether, Token, Percent, Currency } from '@uniswap/sdk-core'

import { Trade as RouterTrade } from '@uniswap/router-sdk'
import { ethers, Wallet, toNumber } from 'ethers';
import JSBI from 'jsbi';

import {
    Trade,
    Pool,
    Route,
    nearestUsableTick,
    TickMath,
    TICK_SPACINGS,
    FeeAmount,
} from '@uniswap/v3-sdk'

// import { Trade as V3Trade, Route as RouteV3, Pool } from '@uniswap/v3-sdk';

import { UniswapTrade, SwapOptions, SwapRouter } from '@uniswap/universal-router-sdk';
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'


const ETHER = Ether.onChain(1)
const WETH = new Token(1, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 18, 'WETH', 'Wrapped Ether')
const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'dai')
const USDC = new Token(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'USDC', 'USD Coin')
const UNIVERSAL_ROUTER_ADDRESS = "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B";
const NODE_POINT_RPC = "https://mainnet.infura.io/v3/497c2481f5a04979b8db15ec43da0f33";

// const ETHER = Ether.onChain(137);
// const WETH = new Token(137, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18, 'WETH', 'Wrapped Ether');
// const USDC = new Token(137, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 6, 'USDC', 'USD Coin');
// const UNIVERSAL_ROUTER_ADDRESS = "0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5";
// const NODE_POINT_RPC = "https://polygon-mainnet.infura.io/v3/50676f4e9b9d4780a34fc8a503ff7f4f";

const FEE_AMOUNT = FeeAmount.MEDIUM

function getProvider(): ethers.Provider {
    // return new ethers.JsonRpcProvider(process.env['FORK_URL'])
    return new ethers.JsonRpcProvider(NODE_POINT_RPC);
}


function swapOptions(options: Partial<SwapOptions>): SwapOptions {
    return Object.assign(
        {
            slippageTolerance: new Percent(5, 100),
        },
        options
    )
}

async function getPool(tokenA: Token, tokenB: Token, feeAmount: FeeAmount): Promise<Pool> {
    const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks
    const poolAddress = Pool.getAddress(token0, token1, feeAmount)
    const contract = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, getProvider())
    let liquidity = await contract.liquidity()
    let { sqrtPriceX96, tick } = await contract.slot0()
    liquidity = JSBI.BigInt(liquidity.toString())
    sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96.toString())

    console.log(liquidity, sqrtPriceX96, tick);
    return new Pool(token0, token1, feeAmount, sqrtPriceX96, liquidity, toNumber(tick))
}

function buildTrade(
    trades: (
        Trade<Currency, Currency, TradeType>
    )[]
): RouterTrade<Currency, Currency, TradeType> {
    return new RouterTrade({
        v2Routes: [],
        v3Routes: trades
            .map((trade) => ({
                routev3: trade.swaps[0].route,
                inputAmount: trade.inputAmount,
                outputAmount: trade.outputAmount,
            })),
        mixedRoutes: [],
        tradeType: trades[0].tradeType,
    })
}
async function test() {

    const wallet = new Wallet(process.env.TRADE_PRIVATE_KEY!, getProvider());

    const WETH_USDC_V3 = await getPool(WETH, USDC, FEE_AMOUNT);

    const inputEther = ethers.parseEther('1').toString()
    const trade = await Trade.fromRoute(
        new Route([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
    )
    const options: SwapOptions = {
        slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
        recipient: wallet.address
    }
    const methodParameters = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), options));

    const tx = {
        data: methodParameters.calldata,
        to: UNIVERSAL_ROUTER_ADDRESS,
        value: BigInt(methodParameters.value),
        from: await wallet.getAddress(),
        // gasPrice: fee.gasPrice, // [fixme] polygon issue
        // maxFeePerGas: fee.maxFeePerGas,
        // maxPriorityFeePerGas: fee.maxPriorityFeePerGas
    }

    // console.log(transaction);

    console.log('send transaction...')

    const txRes = await wallet.sendTransaction(tx);
    console.log(txRes);
    await txRes.wait();
    console.log('done!~');
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
test().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
