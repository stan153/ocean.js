import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultFactoryABI from '@oceanprotocol/contracts/artifacts/contracts/ERC20Factory.sol/ERC20Factory.json' 
import { Logger, getFairGasPrice } from '../utils'

import { TransactionReceipt } from 'web3-core'

import { Contract } from 'web3-eth-contract'

interface Template {
  templateAddress: string
  isActive: boolean
}

/**
 * Provides an interface for ERC20 DataTokens Factory
 */
export class DT20Factory {
  public GASLIMIT_DEFAULT = 1000000
  public factoryAddress: string
  public factoryABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  public factory: Contract
  /**
   * Instantiate ERC20Factory (independently of Ocean).
   * @param {String} factoryAddress
   * @param {AbiItem | AbiItem[]} factoryABI
   * @param {Web3} web3
   */
  constructor(
    factoryAddress: string,
    
    web3: Web3,
    logger: Logger,
    factoryABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.factoryAddress = factoryAddress
    this.factoryABI = factoryABI || (defaultFactoryABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
    this.factory = new this.web3.eth.Contract(this.factoryABI, this.factoryAddress)
  }

  /** Get Current ERC20 Count (ERC20 created)
   * @return {Promise<number>} Number of NFT created from this factory
   */
  public async getCurrentTokenCount(): Promise<number> {
    const trxReceipt = await this.factory.methods.getCurrentTokenCount().call()
    return trxReceipt
  }

  /** Get Current Template Count
   * @return {Promise<number>} Number of Template added to this factory
   */
  public async getCurrentTemplateCount(): Promise<number> {
    const count = await this.factory.methods.getCurrentTemplateCount().call()
    return count
  }

  /** Get Current Template Count
   * @param {Number} index Template index
   * @return {Promise<Template>} Number of Template added to this factory
   */
  public async getTokenTemplate(index: number): Promise<Template> {
    const template = await this.factory.methods.getTokenTemplate(index).call()
    return template
  }

   /** Get ERC721Factory Address
   * @return {Promise<string>} NFT Factory Address
   */
    public async getNFTFactory(): Promise<string> {
      const trxReceipt = await this.factory.methods.erc721Factory().call()
      return trxReceipt
    }
  /**
   * Add a new erc20 token template - only factory Owner
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addTokenTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory.methods
        .addTokenTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract
    const trxReceipt = await this.factory.methods.addTokenTemplate(templateAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Disable token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to disable
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async disableTokenTemplate(
    address: string,
    templateIndex: number
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory.methods
        .disableTokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract
    const trxReceipt = await this.factory.methods
      .disableTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Reactivate a previously disabled token template - only factory Owner
   * @param {String} address
   * @param {Number} templateIndex index of the template we want to reactivate
   * @return {Promise<TransactionReceipt>} current token template count
   */
  public async reactivateTokenTemplate(
    address: string,
    templateIndex: number
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory.methods
        .reactivateTokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract
    const trxReceipt = await this.factory.methods
      .reactivateTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }


  /**
   * Set the erc721 factory address - only ERC20 Factory OWNER
   * @param {String} address
   * @param {String} NFTFactoryAddress NFT factory address
   * @return {Promise<TransactionReceipt>}
   */
   public async setERC721Factory(
    address: string,
    NFTFactoryAddress: string
  ): Promise<TransactionReceipt> {
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory.methods
        .setERC721Factory(NFTFactoryAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract
    const trxReceipt = await this.factory.methods.setERC721Factory(NFTFactoryAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }
}
