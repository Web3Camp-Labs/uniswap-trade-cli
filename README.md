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
  -m, --approval-max             Approval max allowance for token (default: false)
  -p, --needApproval             Need approval or not for token (default: false)
  -h, --help                     display help for command
```


Test commands

Single run on Ethereum Mainnet
```
npm run build; node build/index.js -n 1 -u https://eth.llamarpc.com  -i 0xdAC17F958D2ee523a2206206994597C13D831ec7  -o 0x6B175474E89094C44Da98b954EedeAC495271d0F -s 0.01
```

Single run on Polygon
```
npm run build; node build/index.js -n 137 -u https://polygon-mainnet.infura.io/v3/50676f4e9b9d4780a34fc8a503ff7f4f  -i 0xc2132D05D31c914a87C6611C10748AEb04B58e8F  -o 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 -s 0.01
```


Batch run on Ethereum Mainnet
```
npm run build; node build/index.js -n 1 -u https://eth.llamarpc.com  -f ./test.csv
```

Batch run on Polygon
```
npm run build; node build/index.js -n 137 -u https://polygon-mainnet.infura.io/v3/50676f4e9b9d4780a34fc8a503ff7f4f -f ./test.csv
```