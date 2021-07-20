import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { TransactionReceipt, Log } from 'web3-core'
import defaultVaultABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IVault.sol/IVault.json'
import defaultPoolABI from '@oceanprotocol/contracts/artifacts/contracts/pools/WeightedPool.sol/WeightedPool.json'
import defaultERC20ABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import { EventData, Filter } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'
import { SubscribablePromise, Logger, didNoZeroX, didPrefixed } from '../utils'
import Decimal from 'decimal.js'
import { FactoryRouter } from './FactoryRouter'
import { Contract } from 'web3-eth-contract'

declare type PoolTransactionType = 'swap' | 'join' | 'exit'

const POOL_MAX_AMOUNT_IN_LIMIT = 0.25 // maximum 1/4 of the pool reserve
const POOL_MAX_AMOUNT_OUT_LIMIT = 0.25 // maximum 1/4 of the pool reserve
const BPFACTORY_DEPLOY_BLOCK = 0
const MAX_AWAIT_PROMISES = 10 // infura has a limit of 10 requests/sec
export interface PoolDetails {
  poolAddress: string
  tokens: string[]
}

export interface PoolShare {
  poolAddress: string
  shares: string
  did: string
}

export interface TokensReceived {
  dtAmount: string
  oceanAmount: string
}

export interface PoolTransaction {
  poolAddress: string
  dtAddress: string
  caller: string
  transactionHash: string
  blockNumber: number
  timestamp: number
  tokenIn?: string
  tokenOut?: string
  tokenAmountIn?: string
  tokenAmountOut?: string
  type: PoolTransactionType
}

export enum PoolCreateProgressStep {
  CreatingPool,
  ApprovingTokens,
  AddInitialLiquidity
}

/**
 * Ocean Pools submodule exposed under ocean.pool
 */
export class OceanPoolV4 extends FactoryRouter {
  public oceanAddress: string = null
  public dtAddress: string = null
  public startBlock: number
  public vaultABI: AbiItem | AbiItem[]
  public vaultAddress: string
  public vault: Contract
  public poolABI: AbiItem | AbiItem[]
  public erc20ABI: AbiItem | AbiItem[]
  constructor(
    web3: Web3,
    logger: Logger,
    vaultAddress: string,
    routerAddress: string,
    //oceanAddress: string = null,
    startBlock?: number
  ) {
    super(web3, logger, routerAddress)

    this.vaultAddress = vaultAddress
    this.vaultABI = defaultVaultABI.abi as AbiItem[]
    this.poolABI = defaultPoolABI.abi as AbiItem[]
    this.erc20ABI = defaultERC20ABI.abi as AbiItem[]
    this.vault = new this.web3.eth.Contract(this.vaultABI, this.vaultAddress)

    // if (oceanAddress) {
    //   this.oceanAddress = oceanAddress
    // }
    if (startBlock) this.startBlock = startBlock
    else this.startBlock = 0
  }

  /**
   * Creates a new pool on BALANCER V2
   * @param account user which triggers transaction
   * @param name pool name
   * @param symbol pool symbol
   * @param tokens array of token addresses to be added into the pool
   * @param weights array of token weights (same order as tokens array)
   * @param swapFeePercentage swapFee for Liquidity Providers
   * @param swapMarketFee fee that goes to marketplace runner on each swap
   * @return TxId
   */
  public async deployPool(
    account: string,
    name: string,
    symbol: string,
    tokens: string[], // tokens must be sorted from smaller to bigger (using .sort() for example)
    weights: string[], // IMPORTANT: weights MUST be in the same order of the tokens array. tokens[i] => weights[i]
    swapFeePercentage: number,
    swapMarketFee: number,
    owner: string
  ): Promise<TransactionReceipt> {
    return await super.deployPool(
      account,
      name,
      symbol,
      tokens, // tokens must be sorted from smaller to bigger (using .sort() for example)
      weights, // IMPORTANT: weights MUST be in the same order of the tokens array. tokens[i] => weights[i]
      swapFeePercentage,
      swapMarketFee,
      owner
    )
  }

  /**
     * Create DataToken pool
     @param {String} account
     * @param {String} dtAddress  DataToken address
     * @param {String} dtAmount DataToken amount
     * @param {String} dtWeight DataToken weight
     * @param {String} oceanAmount Ocean amount
     * @param {String} fee Swap fee. E.g. to get a 0.1% swapFee use `0.001`. The maximum allowed swapFee is `0.1` (10%).
     * @return {String}
     */
  public deployAndJoin(
    account: string,
    name: string,
    symbol: string,
    tokens: string[], // tokens must be sorted from smaller to bigger
    weights: string[], // IMPORTANT: weights MUST be in the same order of the tokens array. tokens[i] => weights[i]
    swapFeePercentage: number,
    swapMarketFee: number,
    owner: string,
    amountsIn: string[]
  ): SubscribablePromise<PoolCreateProgressStep, string> {
    if (tokens.length != weights.length || tokens.length != amountsIn.length) {
      this.logger.error('ERROR: Wrong array format')
      throw new Error('ERROR: Wrong array format')
    }

    // if (this.oceanAddress == null) {
    //   this.logger.error('ERROR: oceanAddress is not defined')
    //   throw new Error('ERROR: oceanAddress is not defined')
    // }
    // if (parseFloat(fee) > 0.1) {
    //   this.logger.error('ERROR: Swap fee too high. The maximum allowed swapFee is 10%')
    //   throw new Error('ERROR: Swap fee too high. The maximum allowed swapFee is 10%')
    // }
    // if (parseFloat(dtAmount) < 2) {
    //   this.logger.error('ERROR: Amount of DT is too low')
    //   throw new Error('ERROR: Amount of DT is too low')
    // }
    // if (parseFloat(dtWeight) > 9 || parseFloat(dtWeight) < 1) {
    //   this.logger.error('ERROR: Weight out of bounds (min 1, max9)')
    //   throw new Error('ERROR: Weight out of bounds (min 1, max9)')
    // }
    return new SubscribablePromise(async (observer) => {
      observer.next(PoolCreateProgressStep.CreatingPool)
      const createTxid = await super.deployPool(
        account,
        name,
        symbol,
        tokens, // tokens must be sorted from smaller to bigger (using .sort() for example)
        weights, // IMPORTANT: weights MUST be in the same order of the tokens array. tokens[i] => weights[i]
        swapFeePercentage,
        swapMarketFee,
        owner
      )
      if (!createTxid) {
        this.logger.error('ERROR: Failed to call deployAndJoin pool')
        throw new Error('ERROR: Failed to call deployAndJoin pool')
      }
      const poolAddress = createTxid.events.NewPool.returnValues[0]

      let txid
      for (let i = 0; i < tokens.length; i++) {
        let allowance = await this.allowanceVault(account, tokens[i])
        if (new Decimal(allowance).lt(amountsIn[i])) {
          observer.next(PoolCreateProgressStep.ApprovingTokens)
          txid = await this.approveVault(account, tokens[i], amountsIn[i])

          if (!txid) {
            this.logger.error(
              `ERROR: Failed to call approve for token address ${tokens[i]}, tokenIndex:${i}`
            )
            throw new Error(
              `ERROR: Failed to call approve for token address ${tokens[i]}, tokenIndex:${i}`
            )
          }
        }
      }

      observer.next(PoolCreateProgressStep.AddInitialLiquidity)
      txid = await this.initialJoinPoolV2(account, poolAddress, amountsIn)

      if (!txid) {
        this.logger.error(`ERROR: Failed to Add Liquidity on pool ${poolAddress}`)
        throw new Error(`ERROR: Failed to Add Liquidity on pool ${poolAddress}`)
      }
      // console.log(txid)
      return poolAddress
    })
  }

  /** Get Pool ID
   * @return {Promise<string>} pool ID
   */
  public async getPoolId(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.getPoolId().call()
    return trxReceipt
  }

  /** Get Pool Tokens
   * @return {Promise<string[]>} poolTokens addresses array
   */
  public async getPoolTokens(poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const poolId = await pool.methods.getPoolId().call()
    const trxReceipt = await this.vault.methods.getPoolTokens(poolId).call()
    return trxReceipt.tokens
  }

  /** Get Pool Tokens Balances
   * @return {Promise<string[]>} poolTokens balances array
   */
  public async getPoolBalances(poolAddress: string): Promise<string[]> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const poolId = await pool.methods.getPoolId().call()
    const trxReceipt = await this.vault.methods.getPoolTokens(poolId).call()
    return trxReceipt.balances
  }

  /** Get Swap Fee (that goes liquidity providers)
   * @return {Promise<string>} Ocean Fee (Decimals) => 0.001 => 0.1%
   */
  public async getSwapFeePercentage(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.getSwapFeePercentage().call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Ocean Fee on swap (for Ocean Community)
   * @return {Promise<string>} Ocean Fee (Decimals) => 0.001 => 0.1%
   */
  public async getOceanFeePercentage(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.swapFeeOcean().call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Total Community Fees
   * @return {Promise<string>} Total amount of fees that goes to Ocean Community, collected from a pool in a specific token
   */
  public async getTotalCommunityFees(
    poolAddress: string,
    tokenIndex: number
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.communityFees(tokenIndex).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Already Collected Community Fees
   * @return {Promise<string>} Amount of fees that were already withdrawn for the Ocean Community, collected from a pool in a specific token
   */
  public async getCollectedCommunityFees(
    poolAddress: string,
    tokenIndex: number
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.feesCollectedOPF(tokenIndex).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Market Fee
   * @return {Promise<string>} Market Fee (Decimals) => 0.001 => 0.1%
   */
  public async getMarketFeePercentage(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.swapFeeMarket().call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Total MarketFees
   * @return {Promise<string>} Total amount of fees that goes to the marketplace, collected from a pool in a specific token
   */
  public async getTotalmarketFees(
    poolAddress: string,
    tokenIndex: number
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.marketFees(tokenIndex).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Already Collected Market fees
   * @return {Promise<string>}  Amount of fees that were already withdrawn from the marketplace, collected from a pool in a specific token
   */
  public async getCollectedMarktetFees(
    poolAddress: string,
    tokenIndex: number
  ): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.feesCollectedMarket(tokenIndex).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get appreciation of one BPT relative to the
   * underlying tokens. This starts at 1 when the pool is created and grows over time
   * @return {Promise<number>}
   */
  public async getRateBPT(poolAddress: string): Promise<number> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.getRate().call()
    return trxReceipt
  }

  /** Get the internal balances on the Balancer Vault for a specific user and tokens
   * @return {Promise<number[]>} Array of balances, order as the tokens[]
   */
  public async getInternalBalance(account: string, tokens: string[]): Promise<number[]> {
    const trxReceipt = await this.vault.methods.getInternalBalance(account, tokens).call()
    return trxReceipt
  }

  /** Check if a relayer has been approved by a user
   * @return {Promise<boolean>} LP balance
   */
  public async hasApprovedRelayer(
    account: string,
    relayerAddress: string
  ): Promise<boolean> {
    const trxReceipt = await this.vault.methods
      .hasApprovedRelayer(account, relayerAddress)
      .call()
    return trxReceipt
  }

  /** Get a user's token Balance
   * @return {Promise<string>} Get user's token balance
   */
  public async getTokenBalance(account: string, tokenAddress: string): Promise<string> {
    const token = new this.web3.eth.Contract(this.erc20ABI, tokenAddress)
    const trxReceipt = await token.methods.balanceOf(account).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /**
   * Approve spender to spent amount tokens
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount
   * @param {String} force  if true, will overwrite any previous allowence. Else, will check if allowence is enough and will not send a transaction if it's not needed
   */
  async approveVault(
    account: string,
    tokenAddress: string,
    //spender: string,
    amount: string,
    force = false
  ): Promise<TransactionReceipt> {
    const minABI = [
      {
        constant: false,
        inputs: [
          {
            name: '_spender',
            type: 'address'
          },
          {
            name: '_value',
            type: 'uint256'
          }
        ],
        name: 'approve',
        outputs: [
          {
            name: '',
            type: 'bool'
          }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ] as AbiItem[]
    const token = new this.web3.eth.Contract(minABI, tokenAddress, {
      from: account
    })
    if (!force) {
      const currentAllowence = await this.allowanceVault(account, tokenAddress)
      if (new Decimal(currentAllowence).greaterThanOrEqualTo(amount)) {
        // we have enough
        return null
      }
    }
    let result = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await token.methods
        .approve(this.vaultAddress, this.web3.utils.toWei(amount))
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas approveVault()')
      this.logger.log(e)
      estGas = gasLimitDefault
    }

    try {
      result = await token.methods
        .approve(this.vaultAddress, this.web3.utils.toWei(amount))
        .send({
          from: account,
          gas: estGas + 1
          //  gasPrice: await getFairGasPrice(this.web3)
        })
    } catch (e) {
      this.logger.error(`ERROR: Failed to approve spender to spend tokens : ${e.message}`)
      throw new Error(`ERROR: Failed to approve spender to spend tokens : ${e.message}`)
    }
    return result
  }

  /**
     * Get Alloance for both DataToken and Ocean
     * @param {String } tokenAdress
     * @param {String} account
    
     */
  public async allowanceVault(
    account: string,
    tokenAddress: string

    //spender: string
  ): Promise<string> {
    const erc20 = new this.web3.eth.Contract(this.erc20ABI, tokenAddress)
    const trxReceipt = await erc20.methods.allowance(account, this.vaultAddress).call()
    return this.web3.utils.fromWei(trxReceipt)
  }
  /**
   * Add INITIAL liquidity on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param amountsIn token amounts to provide
   * @return txId
   */
  public async initialJoinPoolV2(
    account: string,
    poolAddress: string,
    amountsIn: string[]
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      throw new Error('ERROR: Web3 object is null')
      return null
    }

    let amountsInWei = []

    for (let i = 0; i < amountsIn.length; i++) {
      amountsInWei.push(this.web3.utils.toWei(amountsIn[i]))
    }

    let userData
    const joinKind = 0
    userData = this.web3.eth.abi.encodeParameters(
      ['uint256', 'uint256[]'],
      [joinKind, amountsInWei]
    )
    const tokens = await this.getPoolTokens(poolAddress)
    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: amountsInWei,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)
    console.log(poolId)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .joinPool(poolId, account, account, joinPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .joinPool(poolId, account, account, joinPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
      throw new Error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Add general liquidity on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param amountsIn token amounts to provide
   * @param minAmountBPT min LP token to receive back
   * @return txId
   */
  public async joinPoolV2(
    account: string,
    poolAddress: string,
    amountsIn: string[],
    minAmountBPT: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      throw new Error('ERROR: Web3 object is null')
      //return null
    }

    let amountsInWei = []

    for (let i = 0; i < amountsIn.length; i++) {
      amountsInWei.push(this.web3.utils.toWei(amountsIn[i]))
    }

    const joinKind = 1
    const userData = this.web3.eth.abi.encodeParameters(
      ['uint256', 'uint256[]', 'uint256'],
      [joinKind, amountsInWei, this.web3.utils.toWei(minAmountBPT)]
    )

    const tokens = await this.getPoolTokens(poolAddress)

    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: amountsInWei,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)
    //console.log(poolId)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .joinPool(poolId, account, account, joinPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas joinPoolV2')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .joinPool(poolId, account, account, joinPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
      throw new Error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Add single token liquidity on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param amountsIn array of amounts In.
   * @param minAmountBPT minimum amount of LP token to receive back
   * @param tokenIndex token index we want to add liquidity
   * @return txId
   */
  public async singleJoinPoolV2(
    account: string,
    poolAddress: string,
    amountsIn: string[],
    minAmountBPT: string,
    tokenIndex: number
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      throw new Error('ERROR: Web3 object is null')
      //return null
    }

    let amountsInWei = []

    for (let i = 0; i < amountsIn.length; i++) {
      amountsInWei.push(this.web3.utils.toWei(amountsIn[i]))
    }

    const joinKind = 2
    const userData = this.web3.eth.abi.encodeParameters(
      ['uint256', 'uint256', 'uint256'],
      [joinKind, this.web3.utils.toWei(minAmountBPT), tokenIndex]
    )
    const tokens = await this.getPoolTokens(poolAddress)
    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: amountsInWei,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .joinPool(poolId, account, account, joinPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .joinPool(poolId, account, account, joinPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
      throw new Error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Fully customizable liquity addition on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param tokens token addresses
   * @param amountsIn token amounts to provide
   * @param userData userData to select which type of joinPool we will perform
   * @param fromInternalBalance if we want to use internal balance and avoid external transfer
   * @param sender user which we take the tokens from. If different from account, account has to be approved as relayer
   * @param recipient user which will receive BTP (LP tokens)
   * @return txId
   */
  public async joinPoolV2Generic(
    account: string,
    poolAddress: string,
    tokens: string[],
    amountsIn: string[],
    userData: string,
    fromInternalBalance: boolean,
    sender: string,
    recipient: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      throw new Error('ERROR: Web3 object is null')
      //return null
    }

    let amountsInWei = []

    for (let i = 0; i < amountsIn.length; i++) {
      amountsInWei.push(this.web3.utils.toWei(amountsIn[i]))
    }

    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: amountsInWei,
      userData: userData,
      fromInternalBalance: fromInternalBalance
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .joinPool(poolId, sender, recipient, joinPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas joinPoolV2Generic')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .joinPool(poolId, sender, recipient, joinPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
      throw new Error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Remove liquidity with Exact Amount IN on BALANCER V2
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param minAmountsOut min token amounts to receive back for fixed btpIn
   * @param btpIn LP token to redeem
   * @return txId
   */
  public async exitPoolExactInV2(
    account: string,
    poolAddress: string,
    minAmountsOut: string[],
    btpIn: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let minAmountsOutInWei = []
    for (let i = 0; i < minAmountsOut.length; i++) {
      minAmountsOutInWei.push(this.web3.utils.toWei(minAmountsOut[i]))
    }
    let userData = null
    const exitKind = 1
    // Construct magic userData
    userData = this.web3.eth.abi.encodeParameters(
      ['uint256', 'uint256'],
      [exitKind, this.web3.utils.toWei(btpIn)]
    )

    const tokens = await this.getPoolTokens(poolAddress)
    const exitPoolRequest = {
      assets: tokens,
      minAmountsOut: minAmountsOutInWei,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)
    // console.log(poolId)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .exitPool(poolId, account, account, exitPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas exitPoolExactInV2')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .exitPool(poolId, account, account, exitPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to call exitPoolExactInV2: ${e.message}`)
      throw new Error('ERROR: Failed to call exitPoolExactInV2')
    }
    return trxReceipt
  }

  /**
   * Remove liquidity with Exact Amount OUT on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param amountsOut token amounts to receive
   * @param maxBtpIn max LP token amount to provide
   * @return txId
   */
  public async exitPoolExactOutV2(
    account: string,
    poolAddress: string,
    amountsOut: string[],
    maxBtpIn: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let amountsOutInWei = []
    for (let i = 0; i < amountsOut.length; i++) {
      amountsOutInWei.push(this.web3.utils.toWei(amountsOut[i]))
    }

    const exitKind = 2
    const userData = this.web3.eth.abi.encodeParameters(
      ['uint256', 'uint256[]', 'uint256'],
      [exitKind, amountsOutInWei, this.web3.utils.toWei(maxBtpIn)]
    )

    const tokens = await this.getPoolTokens(poolAddress)
    const exitPoolRequest = {
      assets: tokens,
      minAmountsOut: amountsOutInWei,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)
    console.log(poolId)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .exitPool(poolId, account, account, exitPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas exitPoolExactOutV2')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .exitPool(poolId, account, account, exitPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to call exitPoolExactOutV2: ${e.message}`)
      throw new Error(`ERROR: Failed to call exitPoolExactOutV2: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Fully customizable function to remove liquidity on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param tokens token addresses
   * @param minAmountsOut min token amounts to receive back for fixed btpIn
   * @param userData userData to select which type of joinPool we will perform
   * @param fromInternalBalance if we want to use internal balance and avoid external transfer
   * @param sender user which we take the tokens from. If different from account, account has to be approved as relayer
   * @param recipient user which will receive BTP (LP tokens)
   * @return txId
   */
  public async exitPoolV2Generic(
    account: string,
    poolAddress: string,
    tokens: string[],
    minAmountsOut: string[],
    userData: string,
    fromInternalBalance: boolean,
    sender: string,
    recipient: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let minAmountsOutInWei = []
    for (let i = 0; i < minAmountsOut.length; i++) {
      minAmountsOutInWei.push(this.web3.utils.toWei(minAmountsOut[i]))
    }

    const exitPoolRequest = {
      assets: tokens,
      minAmountsOut: minAmountsOutInWei,
      userData: userData,
      fromInternalBalance: fromInternalBalance
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)
    // console.log(poolId)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .exitPool(poolId, sender, recipient, exitPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas exitPoolExactInV2')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .exitPool(poolId, sender, recipient, exitPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to call exitPoolExactInV2: ${e.message}`)
      throw new Error('ERROR: Failed to call exitPoolExactInV2')
    }
    return trxReceipt
  }

  /**
   * Remove liquidity with Exact Amount OUT on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param marketplaceFeeCollector marketplace fee collector
   * @return txId
   */
  public async collectMarketplaceFee(
    account: string,
    poolAddress: string,
    marketplaceFeeCollector: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    const minAmountsOut = [0, 0]
    const exitKind = 4
    const userData = this.web3.eth.abi.encodeParameters(['uint256'], [exitKind])

    const tokens = await this.getPoolTokens(poolAddress)
    const exitPoolRequest = {
      assets: tokens,
      minAmountsOut: minAmountsOut,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .exitPool(poolId, account, marketplaceFeeCollector, exitPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .exitPool(poolId, account, marketplaceFeeCollector, exitPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Remove liquidity with Exact Amount OUT on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool address
   * @param OPFFeeCollector marketplace fee collector
   * @return txId
   */
  public async collectOceanCommunityFee(
    account: string,
    poolAddress: string,
    OPFFeeCollector: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    const minAmountsOut = [0, 0]
    const exitKind = 3
    const userData = this.web3.eth.abi.encodeParameters(['uint256'], [exitKind])

    const tokens = await this.getPoolTokens(poolAddress)
    const exitPoolRequest = {
      assets: tokens,
      minAmountsOut: minAmountsOut,
      userData: userData,
      fromInternalBalance: false
    }

    let trxReceipt = null
    const poolId = await this.getPoolId(poolAddress)
    console.log(poolId)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .exitPool(poolId, account, OPFFeeCollector, exitPoolRequest)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .exitPool(poolId, account, OPFFeeCollector, exitPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Remove liquidity with Exact Amount OUT on BALANCER V2
   * @param account user which triggers transaction
   * @param poolAddress pool name
   * @param marketplaceFeeCollector marketplace fee collector
   * @return txId
   */
  public async setMarketFeeCollector(
    account: string,
    poolAddress: string,
    marketplaceFeeCollector: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)

    let trxReceipt = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await pool.methods
        .updateMarketCollector(marketplaceFeeCollector)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas setMarketFeeCollector')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await pool.methods
        .updateMarketCollector(marketplaceFeeCollector)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to set Market Fee Collector: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Perform a swap with EXACT amount IN
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param assetIn token IN
   * @param assetOut token OUT
   * @param amountIn amount we want to swap (assetIn)
   * @param minOut minimum amount we would like to receive (assetOut)
   * @return txId
   */
  public async swapExactIn(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minOut: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    const swapStruct = {
      poolId: await this.getPoolId(poolAddress),
      kind: 0,
      assetIn: tokenIn,
      assetOut: tokenOut,
      amount: this.web3.utils.toWei(amountIn),
      userData: '0x'
    }
    const fundManagement = {
      sender: account,
      fromInternalBalance: false,
      recipient: account,
      toInternalBalance: false
    }

    const deadline = Math.round(new Date().getTime() / 1000 + 600000) // 10 minutes

    let trxReceipt = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT

    let estGas
    try {
      estGas = await this.vault.methods
        .swap(swapStruct, fundManagement, this.web3.utils.toWei(minOut), deadline)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .swap(swapStruct, fundManagement, this.web3.utils.toWei(minOut), deadline)
        .send({ from: account, value: 0, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swapExactIn: ${e.message}`)
      throw new Error(`ERROR: Failed to swapExactIn: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Perform a swap with EXACT amount OUT
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param assetIn token IN
   * @param assetOut token OUT
   * @param amountIn amount we want to receive from the swap (assetOut)
   * @param maxIn maximum amount we would like to provide (assetIn)
   * @return txId
   */
  public async swapExactOut(
    account: string,
    poolAddress: string,
    tokenIn: string,
    tokenOut: string,
    amountOut: string,
    maxIn: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    const swapStruct = {
      poolId: await this.getPoolId(poolAddress),
      kind: 1,
      assetIn: tokenIn,
      assetOut: tokenOut,
      amount: this.web3.utils.toWei(amountOut),
      userData: '0x'
    }
    const fundManagement = {
      sender: account,
      fromInternalBalance: false,
      recipient: account,
      toInternalBalance: false
    }

    const deadline = Math.round(new Date().getTime() / 1000 + 600000) // 10 minutes

    let trxReceipt = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.vault.methods
        .swap(swapStruct, fundManagement, this.web3.utils.toWei(maxIn), deadline)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .swap(swapStruct, fundManagement, this.web3.utils.toWei(maxIn), deadline)
        .send({ from: account, value: 0, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swapExactOut: ${e.message}`)
      throw new Error(`ERROR: Failed to swapExactOut: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Perform any kind of swap on BalancerV2, fully customizable
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param kind  type of swap input: GIVEN IN or GIVEN OUT {0,1}
   * @param tokenIn token IN
   * @param tokenOut token OUT
   * @param amount amount GIVEN IN or GIVEN OUT
   * @param userData userData for extra operation
   * @param sender user from which sending the token( if different from account, must have approved account as relayer)
   * @param recipient user which is going to receive the tokens after the swap
   * @param fromInternalBalance if we want to use internal balances instead of an external transferring
   * @param toInternalBalance if we want to keep the tokens into internal balances and not transferring them externally
   * @param limit minimum or max amount we would like to receive or provide
   * @return txId
   */
  public async swapGeneric(
    account: string,
    poolAddress: string,
    kind: number,
    tokenIn: string,
    tokenOut: string,
    amount: string,
    userData: string,
    sender: string,
    recipient: string,
    fromInternalBalance: boolean,
    toInternalBalance: boolean,
    limit: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    const swapStruct = {
      poolId: await this.getPoolId(poolAddress),
      kind: kind,
      assetIn: tokenIn,
      assetOut: tokenOut,
      amount: this.web3.utils.toWei(amount),
      userData: userData
    }
    const fundManagement = {
      sender: sender,
      fromInternalBalance: fromInternalBalance,
      recipient: recipient,
      toInternalBalance: toInternalBalance
    }

    const deadline = Math.round(new Date().getTime() / 1000 + 600000) // 10 minutes

    let trxReceipt = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT

    let estGas
    try {
      estGas = await this.vault.methods
        .swap(swapStruct, fundManagement, this.web3.utils.toWei(limit), deadline)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .swap(swapStruct, fundManagement, this.web3.utils.toWei(limit), deadline)
        .send({ from: account, value: 0, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swapExactIn: ${e.message}`)
      throw new Error(`ERROR: Failed to swapExactIn: ${e.message}`)
    }
    return trxReceipt
  }

  /**
   * Allows `relayer` to act as a relayer for `sender` if `approved` is true, and disallows it otherwise.
   * See BALANCER V2 docs for more detail on how relayer and approval works
   * @param account user which triggers transaction
   * @param sender pool name
   * @param relayer token IN
   * @param approved token OUT
   
   * @return txId
   */

  public async setRelayerApproval(
    account: string,
    sender: string,
    relayer: string,
    approved: boolean
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let trxReceipt = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT

    let estGas
    try {
      estGas = await this.vault.methods
        .setRelayerApproval(sender, relayer, approved)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .setRelayerApproval(sender, relayer, approved)
        .send({ from: account, value: 0, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to swapExactIn: ${e.message}`)
      throw new Error(`ERROR: Failed to swapExactIn: ${e.message}`)
    }
    return trxReceipt
  }
}
