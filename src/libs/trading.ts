import {
  Currency,
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from '@uniswap/sdk-core'

import {
  Pool,
  Route,
  SwapOptions,
  SwapQuoter,
  SwapRouter,
  Trade,
  computePoolAddress,
  FeeAmount,
} from '@uniswap/v3-sdk'

import {
  ERC20_ABI,
  QUOTER_CONTRACT_ADDRESS,
  SWAP_ROUTER_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  POOL_FACTORY_CONTRACT_ADDRESS,
} from './constants'

import {
  fromReadableAmount,
  createWallet,
  getCurrencyBalance,
  getCurrencyDecimals,
  sendTransaction,
  TransactionState,
} from './utils'

import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import IUniswapV3FactoryABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
import { ethers, toNumber } from 'ethers'
import { Provider } from 'ethers'

import JSBI from 'jsbi'

// Pool
export interface PoolInfo {
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  sqrtPriceX96: bigint
  liquidity: bigint
  tick: number
}

export type TokenTrade = Trade<Token, Token, TradeType>

export interface TradeInfo {
  pool: PoolInfo
  tokenIn: Token,
  tokenOut: Token,
  amount: number,
  trade: TokenTrade
}

export class Trading {

  private _wallet: ethers.Wallet;
  private _chainId: number;
  private _poolFactoryAddress: string = POOL_FACTORY_CONTRACT_ADDRESS;
  private _swapRouterAddress: string = SWAP_ROUTER_ADDRESS;
  private _quoterAddress: string = QUOTER_CONTRACT_ADDRESS;

  constructor(key: string, provider: string, chainId: number, poolFactoryAddress?: string, swapRounerAddress?: string, quoterAddress?: string) {
    if (typeof (key) === "string" && !key.startsWith("0x")) {
      key = "0x" + key;
    }

    this._wallet = createWallet(key, provider);
    this._chainId = chainId;

    if (poolFactoryAddress) this._poolFactoryAddress = poolFactoryAddress;
    if (swapRounerAddress) this._swapRouterAddress = swapRounerAddress;
    if (quoterAddress) this._quoterAddress = quoterAddress;
  }

  getWallet(): ethers.Wallet | null {
    return this._wallet;
  }
  getProvider(): Provider | null {
    return this._wallet.provider;
  }

  getWalletAddress(): string | null {
    return this._wallet.address;
  }

  async getPoolInfo(tokenIn: Token, tokenOut: Token): Promise<PoolInfo> {
    const provider = this._wallet.provider;
    if (!provider) {
      throw new Error('No provider')
    }

    // console.log(provider);

    const currentPoolAddress = computePoolAddress({
      factoryAddress: this._poolFactoryAddress,
      tokenA: tokenIn,
      tokenB: tokenOut,
      fee: FeeAmount.LOW,
    })

    // console.log(`currentPoolAddress ${currentPoolAddress}`);

    // const testToken = new ethers.Contract(
    //   tokenIn.address, 
    //   ERC20_ABI,
    //   provider
    // );

    // console.log(await testToken.symbol());

    // get pool 
    // const factoryContract = new ethers.Contract(
    //   this._poolFactoryAddress,
    //   IUniswapV3FactoryABI.abi,
    //   provider
    // );

    // console.log(`token in ${tokenIn.address}, token out ${tokenOut.address}`);



    // console.log('owner', await factoryContract.owner());
    // console.log('pool', await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000))

    const poolContract = new ethers.Contract(
      currentPoolAddress,
      IUniswapV3PoolABI.abi,
      provider
    )

    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ])

    return {
      token0,
      token1,
      fee,
      tickSpacing,
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
    }
  }


  async getTokenTransferApproval(
    token: Token
  ): Promise<TransactionState> {
    const provider = this.getProvider()
    const address = this.getWalletAddress()
    if (!provider || !address) {
      console.log('No Provider Found')
      return TransactionState.Failed
    }

    try {
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        provider
      )

      const transaction = await tokenContract.approve.populateTransaction(
        this._swapRouterAddress,
        fromReadableAmount(
          TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
          token.decimals
        ).toString()
      )

      return sendTransaction(this._wallet, {
        ...transaction,
        from: address,
      })
    } catch (e) {
      console.error(e)
      return TransactionState.Failed
    }
  }


  // Trading Functions
  async createTrade(tokenIn: Token, tokenOut: Token, amountIn: number): Promise<TradeInfo> {

    const provider = this.getProvider();

    if (!provider) {
      throw new Error('Provider required to get pool state')
    }

    const poolInfo = await this.getPoolInfo(tokenIn, tokenOut);
    console.log('[Trading] pool info:', poolInfo);

    console.log('[Trading] poolInfo.tick:', poolInfo.tick);

    const pool = new Pool(
      tokenIn,
      tokenOut,
      FeeAmount.LOW,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      toNumber(poolInfo.tick)
    )

    console.log('pool:', pool);

    const swapRoute = new Route(
      [pool],
      tokenIn,
      tokenOut
    );

    console.log('swap route: ', swapRoute);

    const { calldata } = SwapQuoter.quoteCallParameters(
      swapRoute,
      CurrencyAmount.fromRawAmount(
        tokenIn,
        fromReadableAmount(
          amountIn,
          tokenIn.decimals
        ).toString()
      ),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      }
    )

    const quoteCallReturnData = await provider.call({
      to: this._quoterAddress,
      data: calldata,
    })

    const amountOut = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], quoteCallReturnData)

    const uncheckedTrade = Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount: CurrencyAmount.fromRawAmount(
        tokenIn,
        fromReadableAmount(
          amountIn,
          tokenIn.decimals
        ).toString()
      ),
      outputAmount: CurrencyAmount.fromRawAmount(
        tokenOut,
        JSBI.BigInt(amountOut)
      ),
      tradeType: TradeType.EXACT_INPUT,
    })

    return {
      pool: poolInfo,
      trade: uncheckedTrade,
      tokenIn: tokenIn,
      tokenOut: tokenIn,
      amount: amountIn
    };
  }

  async executeTrade(
    tradeInfo: TradeInfo
  ): Promise<TransactionState> {
    const walletAddress = this.getWalletAddress();
    const provider = this.getProvider();

    if (!walletAddress || !provider) {
      throw new Error('Cannot execute a trade without a connected wallet')
    }

    // Give approval to the router to spend the token
    const tokenApproval = await this.getTokenTransferApproval(tradeInfo.tokenIn);

    // Fail if transfer approvals do not go through
    if (tokenApproval !== TransactionState.Sent) {
      return TransactionState.Failed
    }

    const options: SwapOptions = {
      slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      recipient: walletAddress,
    }

    console.log(options);

    const methodParameters = SwapRouter.swapCallParameters([tradeInfo.trade], options)

    const tx = {
      data: methodParameters.calldata,
      to: this._swapRouterAddress,
      value: methodParameters.value,
      from: walletAddress,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    const res = await sendTransaction(this._wallet, tx)

    return res
  }
}