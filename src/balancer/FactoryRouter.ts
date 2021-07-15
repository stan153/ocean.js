import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { Logger } from '../utils'
import defaultRouterABI from '@oceanprotocol/contracts/artifacts/contracts/pools/factories/OceanPoolFactoryRouter.sol/OceanPoolFactoryRouter.json'
import defaultVaultABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IVault.sol/IVault.json'
import defaultPoolABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IPool.sol/IPool.json'
import defaultERC20ABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import { TransactionReceipt } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import Decimal from 'decimal.js'

// TODO: add exitPool function, add swaps function
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
  public poolABI: AbiItem | AbiItem[]
  public erc20ABI: AbiItem | AbiItem[]

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
    this.poolABI = defaultPoolABI.abi as AbiItem[]
    this.erc20ABI = defaultERC20ABI.abi as AbiItem[]
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

  /** Get Pool ID
   * @return {Promise<string>} pool ID
   */
  public async getPoolId(poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.poolABI, poolAddress)
    const trxReceipt = await pool.methods.getPoolId().call()
    return trxReceipt
  }

  /** Get LP Balance
   * @return {Promise<string>} LP balance
   */
  public async getLPBalance(account: string, poolAddress: string): Promise<string> {
    const pool = new this.web3.eth.Contract(this.erc20ABI, poolAddress)
    const trxReceipt = await pool.methods.balanceOf(account).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /**
   * Approve spender to spent amount tokens
   * @param {String} account
   * @param {String} tokenAddress
   * @param {String} spender
   * @param {String} amount  (always expressed as wei)
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
      const currentAllowence = await this.allowanceVault(tokenAddress, account)
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
      this.logger.error(`ERRPR: Failed to approve spender to spend tokens : ${e.message}`)
    }
    return result
  }

  /**
   * Get Alloance for both DataToken and Ocean
   * @param {String } tokenAdress
   * @param {String} owner
  
   */
  public async allowanceVault(
    tokenAdress: string,
    owner: string
    //spender: string
  ): Promise<string> {
    const erc20 = new this.web3.eth.Contract(this.erc20ABI, tokenAdress)
    const trxReceipt = await erc20.methods.allowance(owner, this.vaultAddress).call()
    return this.web3.utils.fromWei(trxReceipt)
  }
  /**
   * Add liquidity on BALANCER V2
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param sender user who sends the tokens, if != account must authorize account
   * @param recipient receiver of LP tokens
   * @return txId
   */
  public async joinPoolV2(
    account: string,
    poolAddress: string,
    // sender: string,
    // recipient: string,
    tokens: string[],
    initialBalances: string[],
    joinKind: number
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    // 1 DT = 10 Ocean
    let initBalancesInWei = []
    for (let i = 0; i < initialBalances.length; i++) {
      initBalancesInWei.push(this.web3.utils.toWei(initialBalances[i]))
    }

    const JOIN_KIND_INIT = joinKind // UPDATE WHEN DECIDING IF THERE'S GONNA BE 2 SEPARATE FUNCTIONS FOR INITIAL LIQ ADD AND GENERAL ADD

    // Construct magic userData
    const initUserData = this.web3.eth.abi.encodeParameters(
      ['uint256', 'uint256[]'],
      [JOIN_KIND_INIT, initBalancesInWei]
    )

    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: initBalancesInWei,
      userData: initUserData,
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
    }
    return trxReceipt
  }

  /**
   * Remove liquidity on BALANCER V2
   * @param account user which triggers transaction
   * @param poolId pool name
   * @param sender user who sends the tokens, if != account must authorize account
   * @param recipient receiver of LP tokens
   * @return txId
   */
  public async exitPoolV2(
    account: string,
    poolAddress: string,
    // sender: string,
    // recipient: string,
    tokens: string[],
    minAmountsOut: string[],
    exitKind: number,
    btpIn?: string
  ): Promise<TransactionReceipt> {
    if (this.web3 === null) {
      this.logger.error('ERROR: Web3 object is null')
      return null
    }

    // 1 DT = 10 Ocean
    let minAmountsOutInWei = []
    for (let i = 0; i < minAmountsOut.length; i++) {
      minAmountsOutInWei.push(this.web3.utils.toWei(minAmountsOut[i]))
    }
    let userData = null
    if (exitKind == 1) {
      // Construct magic userData
      userData = this.web3.eth.abi.encodeParameters(
        ['uint256', 'uint256'],
        [exitKind, this.web3.utils.toWei(btpIn)]
      )
    } else if(exitKind == 2) {
      userData = this.web3.eth.abi.encodeParameters(
        ['uint256', 'uint256[]','uint256'],
        [exitKind, minAmountsOutInWei, this.web3.utils.toWei('1000')])
    } 

    const exitPoolRequest = {
      assets: tokens,
      minAmountsOut: minAmountsOutInWei,
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
      this.logger.log('Error estimate gas deployPool')
      this.logger.log(e)
      estGas = gasLimitDefault
    }
    try {
      trxReceipt = await this.vault.methods
        .exitPool(poolId, account, account, exitPoolRequest)
        .send({ from: account, gas: estGas + 1 })
    } catch (e) {
      this.logger.error(`ERROR: Failed to join a pool: ${e.message}`)
    }
    return trxReceipt
  }
}
