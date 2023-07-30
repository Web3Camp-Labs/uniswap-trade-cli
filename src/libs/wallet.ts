// This file contains code to easily connect to and get information from a wallet on chain

import { Currency } from '@uniswap/sdk-core'
import { ethers } from 'ethers'
import { Provider } from 'ethers'
import JSBI from 'jsbi'

import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  WETH_ABI,
  WETH_CONTRACT_ADDRESS,
} from './constants'

import { toReadableAmount } from './utils'

export async function getCurrencyBalance(
  provider: Provider,
  address: string,
  currency: Currency
): Promise<string> {
  // Handle ETH directly
  if (currency.isNative) {
    return ethers.formatEther(await provider.getBalance(address))
  }

  // Get currency otherwise
  const ERC20Contract = new ethers.Contract(
    currency.address,
    ERC20_ABI,
    provider
  )
  const balance: number = await ERC20Contract.balanceOf(address)
  const decimals: number = await ERC20Contract.decimals()

  // Format with proper units (approximate)
  return toReadableAmount(balance, decimals)
}

