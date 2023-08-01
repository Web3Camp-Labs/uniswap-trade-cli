// The configuration of trading tool.
// If you want add more supported chains, please update the following configurations.

export interface ExampleConfig {
    chainId: number,
    name: string,
    rpc: string,
    poolFactoryAddress: string,
    quoterAddress: string,
    swapRouterAddress: string
}

const CONTRACT_CONFIG: Array<ExampleConfig> = [
    {
        name: "eth-mainnet",
        chainId: 1,
        rpc: "https://eth.llamarpc.com",
        poolFactoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    {
        name: "polygon-mainnet",
        chainId: 137,
        rpc: "https://poly-rpc.gateway.pokt.network",
        poolFactoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    }
];

export function loadTradeConfig(chainId: number): ExampleConfig | null {
    for (let index = 0; index < CONTRACT_CONFIG.length; index++) {
        const element = CONTRACT_CONFIG[index];
        if (element.chainId == chainId) {
            return element;
        }
    }
    return null;
}