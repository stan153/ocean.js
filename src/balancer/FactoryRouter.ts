import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { Logger } from '../utils'
import defaultRouterABI from '@oceanprotocol/contracts/artifacts/contracts/pools/factories/OceanPoolFactoryRouter.sol/OceanPoolFactoryRouter.json'
import defaultVaultABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IVault.sol/IVault.json'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'

export class FactoryRouter {
  public GASLIMIT_DEFAULT = 1000000
  public web3: Web3 = null
  public routerABI: AbiItem | AbiItem[]
  public vaultABI: AbiItem | AbiItem[]
  public routerAddress: string 
  public vaultAddress: string 
  public logger: Logger
  public router: Contract
  public vault: Contract

  /**
   * Instantiate FactoryRouter (independently of Ocean).
   * @param {String} routerAddress
   * @param {AbiItem | AbiItem[]} routerABI
   * @param {Web3} web3
   */

  constructor(
    web3: Web3,
    logger: Logger,
    routerAddress: string,
    vaultAddress: string,
    routerABI?: AbiItem | AbiItem[]
  ) {
    this.web3 = web3
    this.routerAddress = routerAddress
    this.vaultAddress = vaultAddress
    this.routerABI = routerABI || (defaultRouterABI.abi as AbiItem[])
    this.vaultABI = defaultVaultABI.abi as AbiItem[]
    this.logger = logger
    this.router = new this.web3.eth.Contract(this.routerABI, this.routerAddress)
    this.vault = new this.web3.eth.Contract(this.vaultABI, this.vaultAddress)
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
   * @return pool address
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
  ): Promise<string> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }
    let check = tokens.sort((a: any, b: any) => a - b)
    if (check != tokens) {
      throw new Error(`Tokens not SORTED BAL#101`)
    }

    let weightsInWei = []
    for (let i = 0; i < weights.length; i++) {
      weightsInWei.push(this.web3.utils.toWei(weights[i]))
    }
    let poolAddress = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .deployPool(
          name,
          symbol,
          tokens,
          weightsInWei,
          swapFeePercentage,
          swapMarketFee,
          owner
        )
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await this.router.methods
        .deployPool(
          name,
          symbol,
          tokens,
          weightsInWei,
          swapFeePercentage,
          swapMarketFee,
          owner
        )
        .send({ from: account, gas: estGas + 1 })
      poolAddress = trxReceipt.events.NewPool.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create new pool: ${e.message}`)
    }
    return poolAddress
  }

  /**
   * Creates a new pool on OCEAN Factory fork ( from BALANCER V1)
   * @param account user which triggers transaction
   * @param controller pool controller address
   * @return pool address
   */
  public async deployPoolWithFork(account: string, controller: string): Promise<string> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let poolAddress = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .deployPoolWithFork(controller)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPoolWithFork')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await this.router.methods
        .deployPoolWithFork(controller)
        .send({ from: account, gas: estGas + 1 })

      poolAddress = trxReceipt.events.NewForkPool.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create new pool with fork: ${e.message}`)
    }
    return poolAddress
  }

  /**
   * Add a new token that, if present into the pool, won't charge 0.1% community fee - only Router Owner
   * @param account user which triggers transaction
   * @param oceanToken pool controller address
   * @return txId
   */
  public async addOceanToken(
    account: string,
    oceanToken: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) != account) {
      throw new Error(`Caller is not Router Owner`)
    }
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let trxReceipt = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .addOceanToken(oceanToken)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas addOceanToken')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.router.methods
        .addOceanToken(oceanToken)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to add a new OceanToken: ${e.message}`)
    }
    return trxReceipt
  }

  /** Get Token on ocean list
   * @return {Promise<boolean>} boolean
   */
  public async getOceanTokens(tokenAddress: string): Promise<boolean> {
    const trxReceipt = await this.router.methods.oceanTokens(tokenAddress).call()
    return trxReceipt
  }

  /** Get Router Owner
   * @return {Promise<string>} string
   */
  public async getOwner(): Promise<string> {
    const trxReceipt = await this.router.methods.routerOwner().call()
    return trxReceipt
  }

  /**
   * Creates a new pool on BALANCER V2
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param sender pool symbol
   * @param recipient array of token addresses to be added into the pool
   * @param request array of token weights (same order as tokens array)
   * @return txId
   */
  public async joinPoolV2(
    account: string,
    poolId: number,
    sender: string,
    recipient: string,
    request: string
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
        .joinPool(poolId, sender, recipient, request)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .joinPool(poolId, sender, recipient, request)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to create new pool: ${e.message}`)
    }
    return trxReceipt
  }
}
