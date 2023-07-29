import { CurrentConfig, Environment } from './config'
import {
  getProvider,
  getWalletAddress,
  TransactionState,
} from './libs/providers'
import { createTrade, executeTrade, TokenTrade } from './libs/trading'
import { displayTrade } from './libs/utils'
import { getCurrencyBalance } from './libs/wallet'


console.log("hello world test");