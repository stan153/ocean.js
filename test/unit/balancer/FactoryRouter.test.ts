import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestRouterHandler } from '../../TestRouterHandler'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import { Contract, ethers } from 'ethers'

import ForkTemplate from '@oceanprotocol/contracts/artifacts/contracts/oldV3Factory/BPool.sol/BPool.json'
import ForkFactory from '@oceanprotocol/contracts/artifacts/contracts/oldV3Factory/BFactory.sol/BFactory.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/factories/OceanPoolFactoryRouter.sol/OceanPoolFactoryRouter.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20.sol/MockERC20.json'
import MockOcean from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockOcean.sol/MockOcean.json'
import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../../src/factories/NFTFactory'
import { DT20Factory } from '../../../src/factories/DT20Factory'
import { FactoryRouter } from '../../../src/balancer/FactoryRouter'
import { POINT_CONVERSION_COMPRESSED } from 'constants'
const web3 = new Web3('http://127.0.0.1:8545')

describe('Factory Router', () => {
  let contractDeployer: string
  let controller: string
  let user2: string
  let contracts: TestRouterHandler
  let router: FactoryRouter
  let poolAddress: string
  let nftDatatoken: NFTDataToken
  let nftFactory: NFTFactory
  let erc20Factory: DT20Factory
  let newNFTAddress: string
  let v3ContractAddress: string
  let v3Contract

  const nftName = 'NFT'
  const nftSymbol = 'NFTSymbol'
  const nftTemplateIndex = 1
  const data = web3.utils.asciiToHex('SomeData')
  const flags = web3.utils.asciiToHex(
    'f8929916089218bdb4aa78c3ecd16633afd44b8aef89299160'
  )
  const vaultAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
  // setNewData() arguments
  const key = web3.utils.keccak256('ARBITRARY_KEY')
  const value = web3.utils.asciiToHex('SomeData')

  // TODO: complete unit test
  it('should deploy contracts', async () => {
    contracts = new TestRouterHandler(
      ForkTemplate.abi as AbiItem[],
      ForkFactory.abi as AbiItem[],
      Router.abi as AbiItem[],
      MockERC20.abi as AbiItem[],
      MockOcean.abi as AbiItem[],
      ForkTemplate.bytecode,
      ForkFactory.bytecode,
      Router.bytecode,
      MockERC20.bytecode,
      MockOcean.bytecode,
      web3
    )
    await contracts.getAccounts()
    contractDeployer = contracts.accounts[0]
    controller = contracts.accounts[1]
    user2 = contracts.accounts[2]
    await contracts.deployContracts(contractDeployer)
  })

  it('initialize FactoryRouter Class', async () => {
    router = new FactoryRouter(
      web3,
      LoggerInstance,
      contracts.routerAddress,
      vaultAddress
    )
  })

  it('#deployPool - should deploy a new pool with 2 tokens on BAL V2', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    const weights = ['0.5', '0.5']

    const NAME = 'Two-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15

    poolAddress = await router.deployPool(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer
    )
    assert(poolAddress != null)
  })

  it('#deployPool - should deploy a new pool with 2 tokens on BAL V2, then ADD LIQUIDITY', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    const weights = ['0.5', '0.5']

    const NAME = 'Two-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15

    poolAddress = await router.deployPool(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer
    )
    assert(poolAddress != null)
  })
  it('#joinPoolV2 - should add INITIAL liquidity', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    await router.approveVault(contractDeployer, contracts.mockOceanAddress, '10000000')
    await router.approveVault(contractDeployer, contracts.mockDT20Address, '10000000')

    const initialBalances = ['50', '100']

    const txReceipt = await router.joinPoolV2(
      contractDeployer,
      poolAddress,
      tokens,
      initialBalances,
      0
    )
    assert(txReceipt != null, 'JoinPool tx failed')
    const event = txReceipt.events.PoolBalanceChanged

    assert(event.returnValues.liquidityProvider == contractDeployer)
    assert(event.returnValues.poolId == (await router.getPoolId(poolAddress)))
    assert(event.returnValues.deltas[0] == web3.utils.toWei(initialBalances[0]))
    assert(event.returnValues.deltas[1] == web3.utils.toWei(initialBalances[1]))
    console.log(await router.getLPBalance(contractDeployer, poolAddress))
  })

  it('#joinPoolV2 - should add EXTRA liquidity', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const newBalances = ['30', '50']
    const txReceipt = await router.joinPoolV2(
      contractDeployer,
      poolAddress,
      tokens,
      newBalances,
      1
    )

    const event = txReceipt.events.PoolBalanceChanged

    assert(event.returnValues.deltas[0] == web3.utils.toWei(newBalances[0]))

    assert(event.returnValues.deltas[1] == web3.utils.toWei(newBalances[1]))
    console.log(await router.getLPBalance(contractDeployer, poolAddress))
  })

  //   enum JoinKind {
  //     INIT,
  //     EXACT_TOKENS_IN_FOR_BPT_OUT,
  //     TOKEN_IN_FOR_EXACT_BPT_OUT
  // }
  // enum ExitKind {
  //     EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
  //     EXACT_BPT_IN_FOR_TOKENS_OUT,
  //     BPT_IN_FOR_EXACT_TOKENS_OUT,
  //     OPF_FEE_WITHDRAWAL,
  //     MP_FEE_WITHDRAWAL
  // }

  it('#joinPoolV2 - should add EXTRA liquidity with joinKind = 2', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const newBalances = ['2', '2']
    const txReceipt = await router.joinPoolV2(
      contractDeployer,
      poolAddress,
      tokens,
      newBalances,
      1
    )
    console.log(txReceipt)
    // const event = txReceipt.events.PoolBalanceChanged

    // assert(event.returnValues.deltas[0] == web3.utils.toWei(newBalances[0]))

    // assert(event.returnValues.deltas[1] == web3.utils.toWei(newBalances[1]))
    // console.log(await router.getLPBalance(contractDeployer, poolAddress))
  })

  it('#exitPoolV2 - should remove SOME liquidity', async () => {
    await router.approveVault(contractDeployer, poolAddress, '10000000')

    console.log(await router.getLPBalance(contractDeployer, poolAddress))
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const minBalances = ['0.001', '0.001']
    const txReceipt = await router.exitPoolV2(
      contractDeployer,
      poolAddress,
      tokens,
      minBalances,
      1,
      '1'
    )
    console.log(txReceipt)
    console.log(await router.getLPBalance(contractDeployer, poolAddress))
    const event = txReceipt.events.PoolBalanceChanged
    console.log(event)
    
  })

  it('#exitPoolV2 - should remove SOME liquidity with exitKind = 2', async () => {
    await router.approveVault(contractDeployer, poolAddress, '10000000')

    console.log(await router.getLPBalance(contractDeployer, poolAddress))
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const minBalances = ['0.001', '0.001']
    const txReceipt = await router.exitPoolV2(
      contractDeployer,
      poolAddress,
      tokens,
      minBalances,
      2,
      '1'
    )
    console.log(txReceipt)
    console.log(await router.getLPBalance(contractDeployer, poolAddress))
    const event = txReceipt.events.PoolBalanceChanged
    console.log(event)
    
  })

  it('#deployPool - should deploy a new pool with 3 tokens on BAL V2', async () => {
    const tokens = [
      contracts.mockOceanAddress,
      contracts.mockDT20Address,
      contracts.mockERC20Address
    ]
    // console.log(tokens)
    // tokens.sort((a:any, b:any) => a-b);
    // console.log(tokens)
    const weights = ['0.3', '0.5', '0.2']

    const NAME = 'Three-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15

    poolAddress = await router.deployPool(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer
    )
    assert(poolAddress != null)
  })

  it('#deployPoolWithFork - should deploy a new pool', async () => {
    poolAddress = await router.deployPoolWithFork(contractDeployer, controller)
    assert(poolAddress != null)
  })

  it('#oceanTokens - ocean Token is set on the list', async () => {
    assert((await router.getOceanTokens(contracts.mockOceanAddress)) == true)
  })

  it('#addOceanToken - should fail a new token to ocean list, if Router Owner', async () => {
    try {
      await router.addOceanToken(user2, contracts.mockERC20Address)
    } catch (e) {
      assert(e.message == 'Caller is not Router Owner')
    }
  })

  it('#addOceanToken - should add a new token to ocean list, if Router Owner', async () => {
    await router.addOceanToken(contractDeployer, contracts.mockERC20Address)
    assert((await router.getOceanTokens(contracts.mockERC20Address)) == true)
  })
})
