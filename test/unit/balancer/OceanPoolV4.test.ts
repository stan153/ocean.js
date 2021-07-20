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

import { OceanPoolV4 } from '../../../src/balancer/OceanPoolV4'

const web3 = new Web3('http://127.0.0.1:8545')

describe('OceanPoolV4', () => {
  let contractDeployer: string
  let controller: string
  let user2: string
  let user3: string
  let user4: string
  let contracts: TestRouterHandler
  let oceanPool: OceanPoolV4
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
    user3 = contracts.accounts[3]
    user4 = contracts.accounts[4]
    await contracts.deployContracts(contractDeployer)
  })

  it('initialize OceanPoolV4 Class', async () => {
    oceanPool = new OceanPoolV4(
      web3,
      LoggerInstance,
      vaultAddress,
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

    receipt = await oceanPool.deployPool(
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

  it('#deployPool - should deploy a new pool with 2 tokens on BAL V2', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    const weights = ['0.5', '0.5']

    const NAME = 'Two-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15

    receipt = await oceanPool.deployPool(
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

  it('#initialJoinPoolV2 - should add INITIAL liquidity ', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    await oceanPool.approveVault(contractDeployer, contracts.mockOceanAddress, '10000000')
    await oceanPool.approveVault(contractDeployer, contracts.mockDT20Address, '10000000')

    const initialBalances = ['50', '100']

    const txReceipt = await oceanPool.initialJoinPoolV2(
      contractDeployer,
      poolAddress,
      //tokens,
      initialBalances
    )
    assert(txReceipt != null, 'JoinPool tx failed')
    const event = txReceipt.events.PoolBalanceChanged

    assert(event.returnValues.liquidityProvider == contractDeployer)
    assert(event.returnValues.poolId == (await oceanPool.getPoolId(poolAddress)))
    assert(event.returnValues.deltas[0] == web3.utils.toWei(initialBalances[0]))
    assert(event.returnValues.deltas[1] == web3.utils.toWei(initialBalances[1]))
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
  })

  it('#joinPoolV2 - should add EXTRA liquidity, 2 tokens liquidity addition', async () => {
    const newBalances = ['30', '50']
    const txReceipt = await oceanPool.joinPoolV2(
      contractDeployer,
      poolAddress,
      // tokens,
      newBalances,
      '0.01'
    )
    assert(txReceipt != null)
    const event = txReceipt.events.PoolBalanceChanged

    assert(event.returnValues.deltas[0] == web3.utils.toWei(newBalances[0]))

    assert(event.returnValues.deltas[1] == web3.utils.toWei(newBalances[1]))
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
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

  it('#singleJoinPoolV2 - should add EXTRA liquidity only with 1 token', async () => {
    // const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const newBalances = ['30', '0']
    const tokens = await oceanPool.getPoolTokens(poolAddress)
    const token1Bal = await oceanPool.getTokenBalance(contractDeployer, tokens[1])
    const token0Bal = await oceanPool.getTokenBalance(contractDeployer, tokens[0])
    const txReceipt = await oceanPool.singleJoinPoolV2(
      contractDeployer,
      poolAddress,
      // tokens,
      newBalances,
      '1',
      0
    )
    assert(txReceipt != null)
    // const event = txReceipt.events.PoolBalanceChanged
    //   console.log(event)
    console.log(token0Bal)
    console.log(await oceanPool.getTokenBalance(contractDeployer, tokens[0]))
    assert(token1Bal == (await oceanPool.getTokenBalance(contractDeployer, tokens[1])))
  })

  it('#exitPoolV2 - should remove SOME liquidity with EXACT BPT IN', async () => {
    await oceanPool.approveVault(contractDeployer, poolAddress, '10000000')

    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
    //const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const minBalances = ['0.001', '0.001']
    const txReceipt = await oceanPool.exitPoolExactInV2(
      contractDeployer,
      poolAddress,
      //   tokens,
      minBalances,
      '1'
    )
    assert(txReceipt != null)
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
    const event = txReceipt.events.PoolBalanceChanged
    //console.log(event)
  })

  it('#exitPoolV2 - should remove SOME liquidity with Exact Amount OUT', async () => {
    await oceanPool.approveVault(contractDeployer, poolAddress, '10000000')

    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
    //const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]
    const minBalances = ['0.001', '0.001']
    const txReceipt = await oceanPool.exitPoolExactOutV2(
      contractDeployer,
      poolAddress,
      //tokens,
      minBalances,
      '1'
    )
    assert(txReceipt != null)
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
    const event = txReceipt.events.PoolBalanceChanged
    // console.log(event)
  })

  it('#collectMarketplaceFee - should succeed to call if recipient is marketFeeCollector', async () => {
    const test = await oceanPool.setMarketFeeCollector(
      contractDeployer,
      poolAddress,
      user2
    )
    assert(test != null)
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))

    const txReceipt = await oceanPool.collectMarketplaceFee(
      contractDeployer,
      poolAddress,
      user2
    )
    assert(txReceipt != null)
  })

  it('#collectOceanCommunityFee - should succeed to call if recipient is OPFFeeCollector', async () => {
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
    const OPFFeeCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'
    const txReceipt = await oceanPool.collectOceanCommunityFee(
      contractDeployer,
      poolAddress,
      OPFFeeCollector
    )
    assert(txReceipt != null)
  })

  it('#collectOceanCommunityFee - should FAIL to call if recipient is NOT OPFFeeCollector', async () => {
    console.log(await oceanPool.getTokenBalance(contractDeployer, poolAddress))
    const OPFFeeCollector = user2
    const txReceipt = await oceanPool.collectOceanCommunityFee(
      contractDeployer,
      poolAddress,
      OPFFeeCollector
    )
    assert(txReceipt == null)
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

    receipt = await oceanPool.deployPool(
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

  it('#deployAndJoin - should deploy a new pool with 2 tokens on BAL V2, and ADDING LIQUIDITY', async () => {
    const tokens = [contracts.mockOceanAddress, contracts.mockDT20Address]

    const weights = ['0.5', '0.5']

    const NAME = 'Two-token Pool'
    const SYMBOL = 'OCEAN-DT-50-50'
    const swapFeePercentage = 3e15 // 0.3%
    const marketFee = 1e15
    const initialBalances = ['50', '100']
    poolAddress = await oceanPool.deployAndJoin(
      contractDeployer,
      NAME,
      SYMBOL,
      tokens,
      weights,
      swapFeePercentage,
      marketFee,
      contractDeployer,
      initialBalances
    )
    assert(poolAddress != null)
    console.log(poolAddress)
  })

  it('#swapExactIn - should swap from Ocean to Datatoken', async () => {
    const oceanBalanceBeforeSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockOceanAddress
    )

    const amount = '10'
    receipt = await oceanPool.swapExactIn(
      contractDeployer,
      poolAddress,
      contracts.mockOceanAddress,
      contracts.mockDT20Address,
      amount,
      '0.1'
    )
    assert(receipt != null)

    const oceanBalanceAfterSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockOceanAddress
    )

    assert(
      parseFloat(oceanBalanceBeforeSwap) ==
        parseFloat(oceanBalanceAfterSwap) + parseFloat(amount)
    )
  })

  it('#swapExactIn - should swap from DT to Ocean', async () => {
    const dtBalanceBeforeSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockDT20Address
    )

    const amount = '10'
    receipt = await oceanPool.swapExactIn(
      contractDeployer,
      poolAddress,
      contracts.mockDT20Address,
      contracts.mockOceanAddress,
      amount,
      '0.1'
    )
    assert(receipt != null)

    const dtBalanceAfterSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockDT20Address
    )

    assert(
      parseFloat(dtBalanceBeforeSwap) ==
        parseFloat(dtBalanceAfterSwap) + parseFloat(amount)
    )
  })

  it('#swapExactOut - should swap from Ocean to Datatoken', async () => {
    const dtBalanceBeforeSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockDT20Address
    )

    const amount = '10'
    receipt = await oceanPool.swapExactOut(
      contractDeployer,
      poolAddress,
      contracts.mockOceanAddress,
      contracts.mockDT20Address,
      amount,
      '1000'
    )
    assert(receipt != null)

    const dtBalanceAfterSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockDT20Address
    )

    assert(
      parseFloat(dtBalanceBeforeSwap) ==
        parseFloat(dtBalanceAfterSwap) - parseFloat(amount)
    )
  })

  it('#swapExactOut - should swap from DT to Ocean', async () => {
    const oceanBalanceBeforeSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockOceanAddress
    )

    const amount = '10'
    receipt = await oceanPool.swapExactOut(
      contractDeployer,
      poolAddress,
      contracts.mockDT20Address,
      contracts.mockOceanAddress,
      amount,
      '1000'
    )
    assert(receipt != null)

    const oceanBalanceAfterSwap = await oceanPool.getTokenBalance(
      contractDeployer,
      contracts.mockOceanAddress
    )

    assert(
      parseFloat(oceanBalanceBeforeSwap) ==
        parseFloat(oceanBalanceAfterSwap) - parseFloat(amount)
    )
  })

  it('#getOceanFeePercentage - should get ocean swap fee for a given pool', async () => {
    // OCEAN FEE IS ZERO BECAUSE THERE'S OCEAN TOKEN INTO THE POOL

    const txReceipt = await oceanPool.getOceanFeePercentage(poolAddress)
    assert(txReceipt == '0')
  })

  it('#getMarketFeePercentage - should get market swap fee for a given pool', async () => {
    const txReceipt = await oceanPool.getMarketFeePercentage(poolAddress)
    assert(txReceipt == '0.001')
  })

  it('#getTotalCommunityFees - should get total ocean community fees for a specific token', async () => {
    const feesInOcean = await oceanPool.getTotalCommunityFees(poolAddress, 0)
    assert(feesInOcean == '0')
    const feesInDT = await oceanPool.getTotalCommunityFees(poolAddress, 1)
    assert(feesInDT == '0')
  })

  it('#getTotalMarketFees - should get total ocean community fees for a specific token', async () => {
    const feesInOcean = await oceanPool.getTotalMarketFees(poolAddress, 0)
    assert(feesInOcean != '0')
    const feesInDT = await oceanPool.getTotalMarketFees(poolAddress, 1)
    assert(feesInDT != '0')
  })

  it('#getCollectedCommunityFees - should get total ocean community fees for a specific token', async () => {
    // THEY ARE ALL ZERO since pool has ocean token
    const feesInOcean = await oceanPool.getCollectedCommunityFees(poolAddress, 0)
    assert(feesInOcean == '0')
    const feesInDT = await oceanPool.getCollectedCommunityFees(poolAddress, 1)
    assert(feesInDT == '0')
  })

  it('#getCollectedMarketFees - should get total ocean community fees for a specific token', async () => {
    // THEY ARE ALL ZERO because we haven't withdrawn anything yet
    const feesInOcean = await oceanPool.getCollectedMarketFees(poolAddress, 0)
    assert(feesInOcean == '0')
    const feesInDT = await oceanPool.getCollectedMarketFees(poolAddress, 1)
    assert(feesInDT == '0')
  })

  it('#collectMarketplaceFee - should succeed to call if recipient is marketFeeCollector', async () => {
    const receipt = await oceanPool.setMarketFeeCollector(
      contractDeployer,
      poolAddress,
      user2
    )
    assert(receipt != null)

    assert((await oceanPool.getTokenBalance(user2, contracts.mockOceanAddress)) == '0')
    assert((await oceanPool.getTokenBalance(user2, contracts.mockDT20Address)) == '0')
    const txReceipt = await oceanPool.collectMarketplaceFee(
      contractDeployer,
      poolAddress,
      user2
    )
    assert(txReceipt != null)
    const tokens = await oceanPool.getPoolTokens(poolAddress)

    let feesInDT, feesInOcean
    if (tokens[0] == contracts.mockOceanAddress) {
      feesInOcean = await oceanPool.getTotalMarketFees(poolAddress, 0)
      feesInDT = await oceanPool.getTotalMarketFees(poolAddress, 1)
    } else {
      feesInDT = await oceanPool.getTotalMarketFees(poolAddress, 0)
      feesInOcean = await oceanPool.getTotalMarketFees(poolAddress, 1)
    }

    assert(feesInDT != '0')
    assert(feesInOcean != '0')

    assert(
      (await oceanPool.getTokenBalance(user2, contracts.mockOceanAddress)) == feesInOcean
    )
    assert(
      (await oceanPool.getTokenBalance(user2, contracts.mockDT20Address)) == feesInDT
    )
  })

  it('#getInternalBalance - should get internal vault balances for a user', async () => {
    // contractDeployer never left any balances into the vault.
    // NOTE that balances are not pool specific. we only use the pool address to get the tokens addresses we want to check.
    // But we could pass any token address
    const tokens = await oceanPool.getPoolTokens(poolAddress)

    const internalBalances = await oceanPool.getInternalBalance(contractDeployer, tokens)

    assert(internalBalances[0] == 0)
    assert(internalBalances[1] == 0)
  })

  it('#hasApprovedRelayer- should return if a relayer has been approved by a user', async () => {
    // user2 is the relayer we would like to check. will get false since we haven't authorized any relayers.
    // see BALANCER V2 for more detail on how to become a 'RELAYER', requires governance approval first

    assert((await oceanPool.hasApprovedRelayer(contractDeployer, user2)) == false)
  })

  it('#getRateBTP- should get the actual rate for 1 BTP token', async () => {
    // Rate starts at 1 and grows over time the more swap we do
    assert(parseFloat(await oceanPool.getRateBPT(poolAddress)) > 1)
  })

  it('#genericSwap - should be able to swap from Ocean to DT using the generic function, EXACT OUT', async () => {
    const amountOut = '10' // amount of DT20 we'd like to get from the swap and send to user3

    receipt = await oceanPool.swapGeneric(
      contractDeployer,
      poolAddress,
      1, // EXACT OUT (GIVEN OUT enum)
      contracts.mockOceanAddress,
      contracts.mockDT20Address,
      amountOut,
      '0x', // userData
      contractDeployer, //sender
      user3, // receiver
      false, // we don't use internal balances
      false, // we don't use internal balances
      '1000' // max Ocean In
    )
    assert(receipt != null)

    // we check user3 has received the amount we asked for (10)
    assert(
      (await oceanPool.getTokenBalance(user3, contracts.mockDT20Address)) == amountOut
    )
  })

  it('#genericSwap - should be able to swap from Ocean to DT using the generic function, EXACT OUT, but with internal balances', async () => {
    const amountOut = '10' // amount of DT20 we'd like to get from the swap and send to user4 (this time internal balance)

    receipt = await oceanPool.swapGeneric(
      contractDeployer,
      poolAddress,
      1, // EXACT OUT (GIVEN OUT enum)
      contracts.mockOceanAddress,
      contracts.mockDT20Address,
      amountOut,
      '0x', // userData
      contractDeployer, //sender
      user4, // receiver
      false, // we don't use internal balances
      true, // we want to get 10 DT to user4 but store them as internal balance
      '1000' // max Ocean In
    )
    assert(receipt != null)

    // user4 has received no tokens because they are stored as internal balance
    assert((await oceanPool.getTokenBalance(user4, contracts.mockDT20Address)) == '0')

    // we now check the internal balance for user4
    const dtInternal = await oceanPool.getInternalBalance(user4, [
      contracts.mockDT20Address
    ])

    assert(dtInternal[0] == parseFloat(web3.utils.toWei(amountOut)))
  })
})
