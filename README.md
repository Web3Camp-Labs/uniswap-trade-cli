# Uniswap Trade Cli

```
Usage: uniswap-trade-cli [options]

CLI to trade tokens on uniswap.

Options:
  -V, --version                  output the version number
  -n, --chain-id <string>        The Chain ID of the network
  -u, --rpc-url <string>         HTTP URL of the RPC endpoint
  -f, --config-file <string>     The trade config file for batch trading
  -s, --amount-to-swap <string>  Amount of tokens to swap. If you don't use the 'd' (decimals) flag, make sure to use the correct decimals
  -i, --token-in <string>        Address of the token to swap from
  -o, --token-out <string>       Address of the token to swap to
  -h, --help                     display help for command
  -v, --version                  display version for command
```


Test commands
```
npm run build; node build/index.js -u https://poly-rpc.gateway.pokt.network -n 137 -i 0xc2132D05D31c914a87C6611C10748AEb04B58e8F  -o 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 -s 0.01
```