import { Token } from "@uniswap/sdk-core";
import { Trading } from "./libs/trading";
import 'dotenv/config';

async function main() {
    console.log(process.env.TEST_PRIVATE_KEY);


    // const T = new Trading(process.env.TEST_PRIVATE_KEY!, 'https://eth.llamarpc.com', 1);
    const T = new Trading(process.env.TEST_PRIVATE_KEY!, 'https://poly-rpc.gateway.pokt.network', 137);

    console.log(T);

    // const info = await T.getPoolInfo(new Token(1, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6), new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18));
    const info = await T.getPoolInfo(new Token(137, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6), new Token(137, '0x51cf1DC2c9cddd784D0f272e04621E991c4C49b2', 18));

    console.log(`info ${info}`)

    console.log("hello world test");
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
