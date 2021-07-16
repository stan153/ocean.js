import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestRouterHandler } from '../../TestRouterHandler'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import { Contract, ethers } from 'ethers'
import { TransactionReceipt, Log } from 'web3-core'
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
  let receipt: TransactionReceipt
 

 
  const vaultAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
  // setNewData() arguments

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
      contracts.routerAddress
    )
  })

  it('#deployPool - should deploy a new pool with 2 tokens on BAL V2', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    const weights = ['0.5', '0.5']

    const NAME = 'Two-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15

    receipt = await router.deployPool(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer
    )
    assert(receipt != null)
    poolAddress = receipt.events.NewPool.returnValues[0]
    
  })

  it('#deployPool - should deploy a new pool with 2 tokens on BAL V2, then ADD LIQUIDITY', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    const weights = ['0.5', '0.5']

    const NAME = 'Two-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15

    receipt = await router.deployPool(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer
    )
    assert(receipt != null)
    poolAddress = receipt.events.NewPool.returnValues[0]
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

    receipt = await router.deployPool(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer
    )
    assert(receipt != null)
    
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
