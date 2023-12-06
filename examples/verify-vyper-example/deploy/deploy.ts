import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as ethers from 'ethers';
import * as zk from 'zksync2-js';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import chalk from 'chalk';

// An example of a deploy script which will deploy and call a factory-like contract (meaning that the main contract
// may deploy other contracts).
//
// In terms of presentation it's mostly copied from `001_deploy.ts`, so this example acts more like an integration test
// for plugins/server capabilities.
export default async function (hre: HardhatRuntimeEnvironment) {
    console.info(chalk.yellow(`Running deploy script`));

    // Initialize an Ethereum wallet.
    const zkWallet = new zk.Wallet('0x3ebca5a070d36c4e2b5f337a95c08f5decc8cbb40206fe919d4a5c34679c07c4');
    // Create deployer object and load desired artifact.
    const deployer = new Deployer(hre, zkWallet);

    // Deposit some funds to L2 in order to be able to perform deposits.
    //const depositHandle = await deployer.zkWallet.deposit({
    //    to: deployer.zkWallet.address,
    //    token: zk.utils.ETH_ADDRESS,
    //    amount: ethers.parseEther('0.01'),
    //});
    //await depositHandle.wait();

    // Load the artifact we want to deploy.
    const createForwarder = await deployer.loadArtifact('CreateForwarder');
    const greeter = await deployer.loadArtifact('Greeter');

    // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
    // This contract has no constructor arguments.
    const factoryContract = await deployer.deploy(createForwarder, []);
    const greeterContract = await deployer.deploy(greeter, []);

    // Deploy a forwarder to greeter from a factory
    const forwarder = await factoryContract.deploy(await greeterContract.getAddress(), 'Hello world');
    await forwarder.wait();

    // Show the contract info.
    const forwarderAddress = await factoryContract.forwarder();
    console.info(chalk.green(`${greeter.contractName} forwarder was deployed to ${forwarderAddress}`));

    // Call the deployed contract.
    const forwarderContract = new ethers.Contract(forwarderAddress, greeter.abi, deployer.zkWallet.provider);
    const greeting = await forwarderContract.greet();
    if (greeting == 'Hello world') {
        console.info(chalk.green(`Successful greeting from the contract!`));
    } else {
        throw new Error(`Contract returned unexpected greeting: ${greeting}`);
    }
}
