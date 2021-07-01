import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { Logger } from '../utils'
import defaultRouterABI from '@oceanprotocol/contracts/artifacts/BFactory.json' // TODO : update
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'

export class FactoryRouter {
  public GASLIMIT_DEFAULT = 1000000
  public web3: Web3 = null
  public routerABI: AbiItem | AbiItem[]
  public routerAddress: string
  public logger: Logger
  public router: Contract

  /**
   * Instantiate DataTokens (independently of Ocean).
   * @param {String} routerAddress
   * @param {AbiItem | AbiItem[]} routerABI
   * @param {Web3} web3
   */

  constructor(
    web3: Web3,
    logger: Logger,
    routerABI: AbiItem | AbiItem[] = null,
    routerAddress: string = null
  ) {
    this.web3 = web3
    this.routerAddress = routerAddress
    this.routerABI = routerABI || (defaultRouterABI.abi as AbiItem[])
    this.logger = logger
    this.router = new this.web3.eth.Contract(this.routerABI, this.routerAddress)
  }

  /**
   * Creates a new pool on BALANCER V2
   * @param account user which triggers transaction
   * @param name pool name
   * @param symbol pool symbol
   * @param tokens array of token addresses to be added into the pool
   * @param weights array of token weights (same order as tokens array)
   * @param swapFeePercentage swapFee for Liquidity Providers
   * @param swapMarketFee fee that goes to marketPlace runner on each swap
   * @return pool address
   */
  public async deployPool(
    account: string,
    name: string,
    symbol: string,
    tokens: string[],
    weights: number[],
    swapFeePercentage: number,
    swapMarketFee: number,
    owner: string
  ): Promise<string> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let poolAddress = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .deployPool(name, symbol,tokens, weights, swapFeePercentage, swapMarketFee, owner)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await this.router.methods.deployPool(name, tokens, weights, swapFeePercentage, swapMarketFee, owner).send({ from: account, gas: estGas + 1 })
      poolAddress = trxReceipt.events.NewPool.returnValues[0]// pooladdress = transactiondata.events.BPoolRegistered.returnValues[0]
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
   public async createPoolWithFork(
    account: string,
    controller: string
  ): Promise<string> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    let poolAddress = null
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.router.methods
        .createPoolWithFork(controller)
        .estimateGas({ from: account }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await this.router.methods.createPoolWithFork(controller).send({ from: account, gas: estGas + 1 })
      poolAddress = trxReceipt.events.NewPoolFork.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create new pool: ${e.message}`)
    }
    return poolAddress
  }
}
