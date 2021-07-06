import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

//import defaultFactoryABI from '@oceanprotocol/contracts/artifacts/DTFactory.json' // TODO update
import defaultDatatokensABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'  // TODO update
import { Logger, getFairGasPrice } from '../utils'
import { TransactionReceipt } from 'web3-core'
import BigNumber from 'bignumber.js'
import Decimal from 'decimal.js'

/**
 * Provides an interface to DataTokens
 */
export class DataTokens {
  public GASLIMIT_DEFAULT = 1000000
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public datatokensABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  /**
   * Instantiate ERC20 DataTokens (independently of Ocean).
   * @param {AbiItem | AbiItem[]} datatokensABI
   * @param {Web3} web3
   */
  constructor(
    web3: Web3,
    logger: Logger,
    datatokensABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {

    this.datatokensABI = datatokensABI || (defaultDatatokensABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
  }

  /**
   * Approve
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {string} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async approve(
    dataTokenAddress: string,
    spender: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .approve(spender, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await datatoken.methods
      .approve(spender, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

  /**
   * Mint
   * @param {String} dataTokenAddress
   * @param {String} address
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} toAddress   - only if toAddress is different from the minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async mint(
    dataTokenAddress: string,
    address: string,
    amount: string,
    toAddress?: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const capAvailble = await this.getCap(dataTokenAddress)
    if (new Decimal(capAvailble).gte(amount)) {
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await datatoken.methods
          .mint(toAddress || address, this.web3.utils.toWei(amount))
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      const trxReceipt = await datatoken.methods
        .mint(toAddress || address, this.web3.utils.toWei(amount))
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } else {
      throw new Error(`Mint amount exceeds cap available`)
    }
  }

  /**
   * Add Minter for an ERC20 datatoken - only ERC20Deployer(from 721 level) can succeed
   * @param {String} address
   * @param {String} dataTokenAddress
   * @param {String} minter User which is going to be a Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addMinter(
    address: string,
    dataTokenAddress: string,
    minter: string
  ): Promise<TransactionReceipt> {
    // Create ERC20 contract object
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .addMinter(minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await datatoken.methods.addMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Revoke Minter permission for an ERC20 datatoken - only ERC20Deployer(from 721 level) can succeed
   * @param {String} address
   * @param {String} dataTokenAddress
   * @param {String} minter User which will be removed from Minter permission
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async removeMinter(
    address: string,
    dataTokenAddress: string,
    minter: string
  ): Promise<TransactionReceipt> {
    // Create ERC20 contract object
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .removeMinter(minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await datatoken.methods.removeMinter(minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Set a value into 725Y standard(at 721 level), key(for later retrival) is calculated by the contract as keccak256(dataTokenAddress)
   * only ERC20Deployer(from 721 level) can succeed
   * @param {String} address
   * @param {String} dataTokenAddress
   * @param {String} value Data to be stored into 725Y standard
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async setData(
    address: string,
    dataTokenAddress: string,
    value: string
  ): Promise<TransactionReceipt> {
    // Create ERC20 contract object
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .setData(value)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await datatoken.methods.setData(value).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Clean Permissions (minter permissions at erc20 level, not at 721)for an ERC20 datatoken - onlyNFTOwner
   * @param address
   * @param dataTokenAddress erc20 dt where we want to clean permissions
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async cleanPermissions(
    address: string,
    dataTokenAddress: string
  ): Promise<TransactionReceipt> {
    // Create ERC20 contract object
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .cleanPermissions()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await datatoken.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Set a new fee Collector, if feeCollector is address(0), feeCollector is NFT Owner
   * only NFT owner can call
   * @param address
   * @param dataTokenAddress erc20 dt where we want to clean permissions
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async setFeeCollector(
    address: string,
    dataTokenAddress: string,
    feeCollector: string
  ): Promise<TransactionReceipt> {
    // Create ERC20 contract object
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .setFeeCollector(feeCollector)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await datatoken.methods.setFeeCollector(feeCollector).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /** Get Fee Collector
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getFeeCollector(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.getFeeCollector().call()
    return trxReceipt
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transfer(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    return this.transferToken(dataTokenAddress, toAddress, amount, address)
  }

  /**
   * Transfer as number from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferToken(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const weiAmount = this.web3.utils.toWei(amount)
    return this.transferWei(dataTokenAddress, toAddress, weiAmount, address)
  }

  /**
   * Transfer in wei from address to toAddress
   * @param {String} dataTokenAddress
   * @param {String} toAddress
   * @param {String} amount Number of datatokens, as number. Expressed as wei
   * @param {String} address
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferWei(
    dataTokenAddress: string,
    toAddress: string,
    amount: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .transfer(toAddress, amount)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await datatoken.methods.transfer(toAddress, amount).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })
    return trxReceipt
  }

  /**
   * Transfer from fromAddress to address  (needs an Approve operation before)
   * @param {String} dataTokenAddress
   * @param {String} fromAddress
   * @param {String} amount Number of datatokens, as number. Will be converted to wei
   * @param {String} address
   * @return {Promise<string>} transactionId
   */
  public async transferFrom(
    dataTokenAddress: string,
    fromAddress: string,
    amount: string,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .transferFrom(fromAddress, address, this.web3.utils.toWei(amount))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    const trxReceipt = await datatoken.methods
      .transferFrom(fromAddress, address, this.web3.utils.toWei(amount))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
    return trxReceipt
  }

  /**
   * Get Address Balance for datatoken
   * @param {String} dataTokenAddress
   * @param {String} address
   * @return {Promise<String>} balance  Number of datatokens. Will be converted from wei
   */
  public async balance(dataTokenAddress: string, address: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const balance = await datatoken.methods.balanceOf(address).call()
    return this.web3.utils.fromWei(balance)
  }

  /**
   * Get Alloance
   * @param {String } dataTokenAddress
   * @param {String} owner
   * @param {String} spender
   */
  public async allowance(
    dataTokenAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: spender
    })
    const trxReceipt = await datatoken.methods.allowance(owner, spender).call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Get Name
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getName(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.name().call()
    return trxReceipt
  }

  /** Get Symbol
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getSymbol(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.symbol().call()
    return trxReceipt
  }

  /** Get Cap
   * @param {String} dataTokenAddress
   * @return {Promise<string>} string
   */
  public async getCap(dataTokenAddress: string): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
    const trxReceipt = await datatoken.methods.cap().call()
    return this.web3.utils.fromWei(trxReceipt)
  }

  /** Convert to wei
   * @param {String} amount
   * @return {Promise<string>} string
   */
  public toWei(amount: string): string {
    return this.web3.utils.toWei(amount)
  }

  /** Convert from wei
   * @param {String} amount
   * @return {Promise<string>} string
   */
  public fromWei(amount: string): string {
    return this.web3.utils.fromWei(amount)
  }

  /** Start Order
   * @param {String} dataTokenAddress
   * @param {String} consumer consumer Address
   * @param {String} amount
   * @param {Number} serviceId
   * @param {String} mpFeeAddress
   * @param {String} address consumer Address
   * @return {Promise<string>} string
   */
  public async startOrder(
    dataTokenAddress: string,
    consumer: string,
    amount: string,
    serviceId: number,
    mpFeeAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    if (!mpFeeAddress) mpFeeAddress = '0x0000000000000000000000000000000000000000'
    try {
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await datatoken.methods
          .startOrder(
            consumer,
            this.web3.utils.toWei(amount),
            String(serviceId),
            mpFeeAddress
          )
          .estimateGas({ from: address }, (err, estGas) =>
            err ? gasLimitDefault : estGas
          )
      } catch (e) {
        estGas = gasLimitDefault
      }
      const trxReceipt = await datatoken.methods
        .startOrder(
          consumer,
          this.web3.utils.toWei(amount),
          String(serviceId),
          mpFeeAddress
        )
        .send({
          from: address,
          gas: estGas + 1,
          gasPrice: await getFairGasPrice(this.web3)
        })
      return trxReceipt
    } catch (e) {
      this.logger.error(`ERROR: Failed to start order : ${e.message}`)
      throw new Error(`Failed to start order: ${e.message}`)
    }
  }

  /** Search and return txid for a previous valid order with the same params
   * @param {String} dataTokenAddress
   * @param {String} amount
   * @param {String} did
   * @param {Number} serviceId
   * @param {Number} timeout service timeout
   * @param {String} address consumer Address
   * @return {Promise<string>} string
   */
  // Note that getPreviousValidOrders() only works on Eth (see: https://github.com/oceanprotocol/ocean.js/issues/741)
  public async getPreviousValidOrders(
    dataTokenAddress: string,
    amount: string,
    serviceId: number,
    timeout: number,
    address: string
  ): Promise<string> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    let fromBlock
    if (timeout > 0) {
      const lastBlock = await this.web3.eth.getBlockNumber()
      fromBlock = lastBlock - timeout
      if (fromBlock < this.startBlock) fromBlock = this.startBlock
    } else {
      fromBlock = this.startBlock
    }
    const events = await datatoken.getPastEvents('OrderStarted', {
      filter: { consumer: address },
      fromBlock,
      toBlock: 'latest'
    })
    for (let i = 0; i < events.length; i++) {
      if (
        String(events[i].returnValues.amount) === this.web3.utils.toWei(String(amount)) &&
        String(events[i].returnValues.serviceId) === String(serviceId) &&
        events[i].returnValues.consumer.toLowerCase() === address.toLowerCase()
      ) {
        if (timeout === 0) return events[i].transactionHash
        const blockDetails = await this.web3.eth.getBlock(events[i].blockHash)
        const expiry = new BigNumber(blockDetails.timestamp).plus(timeout)
        const unixTime = new BigNumber(Math.floor(Date.now() / 1000))
        if (unixTime.isLessThan(expiry)) return events[i].transactionHash
      }
    }
    return null
  }

  public getStartOrderEventSignature(): string {
    const abi = this.datatokensABI as AbiItem[]
    const eventdata = abi.find(function (o) {
      if (o.name === 'OrderStarted' && o.type === 'event') return o
    })
    const topic = this.web3.eth.abi.encodeEventSignature(eventdata as any)
    return topic
  }

  /**
   * Purpose a new minter
   * @param {String} dataTokenAddress
   * @param {String} newMinter
   * @param {String} address - only current minter can call this
   * @return {Promise<string>} transactionId
   */
  public async proposeMinter(
    dataTokenAddress: string,
    newMinterAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .proposeMinter(newMinterAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await datatoken.methods.proposeMinter(newMinterAddress).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      this.logger.error('ERROR: Propose minter failed')
      return null
    }
  }

  /**
   * Approve minter role
   * @param {String} dataTokenAddress
   * @param {String} address - only proposad minter can call this
   * @return {Promise<string>} transactionId
   */
  public async approveMinter(
    dataTokenAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await datatoken.methods
        .approveMinter()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }
    try {
      const trxReceipt = await datatoken.methods.approveMinter().send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
      return trxReceipt
    } catch (e) {
      return null
    }
  }

  // /** Check if an address has the minter role
  //  * @param {String} dataTokenAddress
  //  * * @param {String} address
  //  * @return {Promise<string>} string
  //  */
  // public async isMinter(dataTokenAddress: string, address: string): Promise<boolean> {
  //   const datatoken = new this.web3.eth.Contract(this.datatokensABI, dataTokenAddress)
  //   const trxReceipt = await datatoken.methods.isMinter(address).call()
  //   return trxReceipt
  // }
}
