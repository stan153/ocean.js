import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultFactory721ABI from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import { Logger, getFairGasPrice } from '../utils'
import wordListDefault from '../data/words.json'
import { TransactionReceipt } from 'web3-core'
import BigNumber from 'bignumber.js'
import Decimal from 'decimal.js'
import { Contract } from 'web3-eth-contract'

interface Template {
  templateAddress: string
  isActive: boolean
}
// TODO: add updateMetadata function
/**
 * Provides an interface for NFT DataTokens
 */
export class NFTFactory {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721ABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  public factory721: Contract
  /**
   * Instantiate DataTokens (independently of Ocean).
   * @param {String} factory721Address
   * @param {AbiItem | AbiItem[]} factory721ABI
   * @param {Web3} web3
   */
  constructor(
    factory721Address: string,
    web3: Web3,
    logger: Logger,
    factory721ABI?: AbiItem | AbiItem[],
    startBlock?: number
  ) {
    this.factory721Address = factory721Address
    this.factory721ABI = factory721ABI || (defaultFactory721ABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
    this.factory721 = new this.web3.eth.Contract(
      this.factory721ABI,
      this.factory721Address
    )
  }

  /**
   * Generate new datatoken name & symbol from a word list
   * @return {<{ name: String; symbol: String }>} datatoken name & symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"
   */
  public generateDtName(wordList?: { nouns: string[]; adjectives: string[] }): {
    name: string
    symbol: string
  } {
    const list = wordList || wordListDefault
    const random1 = Math.floor(Math.random() * list.adjectives.length)
    const random2 = Math.floor(Math.random() * list.nouns.length)
    const indexNumber = Math.floor(Math.random() * 100)

    // Capitalized adjective & noun
    const adjective = list.adjectives[random1].replace(/^\w/, (c) => c.toUpperCase())
    const noun = list.nouns[random2].replace(/^\w/, (c) => c.toUpperCase())

    const name = `${adjective} ${noun} Token`
    // use first 3 letters of name, uppercase it, and add random number
    const symbol = `${(
      adjective.substring(0, 3) + noun.substring(0, 3)
    ).toUpperCase()}-${indexNumber}`

    return { name, symbol }
  }

  /**
   * Create new NFT
   * @param {String} address
   * @param {String} metadataCacheUri
   * @param {String} flags
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {Number} templateIndex NFT template index
   * @return {Promise<string>} NFT datatoken address
   */
  public async createNFT(
    address: string,
    metadataCacheUri: string,
    flags: string,
    name?: string,
    symbol?: string,
    templateIndex?: number
  ): Promise<string> {
    if (!templateIndex) templateIndex = 1

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = this.generateDtName())
    }

    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await this.factory721.methods
        .deployERC721Contract(name, symbol, metadataCacheUri, flags, templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .deployERC721Contract(name, symbol, metadataCacheUri, flags, templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /** Get Current NFT Count (NFT created)
   * @return {Promise<number>} Number of NFT created from this factory
   */
  public async getCurrentNFTCount(): Promise<number> {
    const trxReceipt = await this.factory721.methods.getCurrentTokenCount().call()
    return trxReceipt
  }

  

  /** Get Current Template Count
   * @return {Promise<number>} Number of Template added to this factory
   */
  public async getCurrentTemplateCount(): Promise<number> {
    const count = await this.factory721.methods.getCurrentTemplateCount().call()
    return count
  }

  /** Get Current Template Count
   * @param {Number} index Template index
   * @return {Promise<Template>} Number of Template added to this factory
   */
  public async getTokenTemplate(index: number): Promise<Template> {
    const template = await this.factory721.methods.getTokenTemplate(index).call()
    return template
  }

  /**
   * Add a new erc721 token template - only factory Owner
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
      estGas = await this.factory721.methods
        .addTokenTemplate(templateAddress)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .addTokenTemplate(templateAddress)
      .send({
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
      estGas = await this.factory721.methods
        .disableTokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
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
      estGas = await this.factory721.methods
        .reactivateTokenTemplate(templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await this.factory721.methods
      .reactivateTokenTemplate(templateIndex)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }
}
