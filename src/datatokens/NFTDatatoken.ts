import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'

import defaultFactory721ABI from '@oceanprotocol/contracts/artifacts/DTFactory.json' // TODO: update
import defaultNFTDatatokenABI from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json' //TODO: update
import { Logger, getFairGasPrice } from '../utils'
import wordListDefault from '../data/words.json'
import { TransactionReceipt } from 'web3-core'
import BigNumber from 'bignumber.js'
import Decimal from 'decimal.js'

/**
 * Provides an interface for NFT DataTokens
 */
export class DataTokens {
  public GASLIMIT_DEFAULT = 1000000
  public factory721Address: string
  public factory721ABI: AbiItem | AbiItem[]
  public nftDatatokenABI: AbiItem | AbiItem[]
  public web3: Web3
  private logger: Logger
  public startBlock: number
  /**
   * Instantiate DataTokens (independently of Ocean).
   * @param {String} factory721Address
   * @param {AbiItem | AbiItem[]} factory721ABI
   * @param {AbiItem | AbiItem[]} nftDatatokenABI
   * @param {Web3} web3
   */
  constructor(
    factory721Address: string,
    factory721ABI: AbiItem | AbiItem[],
    nftDatatokenABI: AbiItem | AbiItem[],
    web3: Web3,
    logger: Logger,
    startBlock?: number
  ) {
    this.factory721Address = factory721Address
    this.factory721ABI = factory721ABI || (defaultFactory721ABI.abi as AbiItem[])
    this.nftDatatokenABI = nftDatatokenABI || (defaultNFTDatatokenABI.abi as AbiItem[])
    this.web3 = web3
    this.logger = logger
    this.startBlock = startBlock || 0
  }

  /**
   * Generate new datatoken name & symbol from a word list
   * @return {<{ name: String; symbol: String }>} datatoken name & symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"
   */
  public generateDtName(wordList?: {
    nouns: string[]
    adjectives: string[]
  }): {
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

    // Create 721factory contract object
    const factory721 = new this.web3.eth.Contract(
      this.factory721ABI,
      this.factory721Address,
      {
        from: address
      }
    )
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await factory721.methods
        .deployERC721Contract(name, symbol, metadataCacheUri, flags, templateIndex)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await factory721.methods
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

  /**
   * Create new ERC20 datatoken
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} minter User set as initial minter for the ERC20
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {Number} templateIndex NFT template index
   * @return {Promise<string>} ERC20 datatoken address
   */
  public async createERC20(
    address: string,
    nftAddress: string,
    minter: string,
    name?: string,
    symbol?: string,
    cap?: string,
    templateIndex?: number
  ): Promise<string> {
    if (!templateIndex) templateIndex = 1
    if (!cap) cap = '1000'

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = this.generateDtName())
    }

    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .createERC20(name, symbol, cap, templateIndex, minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke createToken function of the contract
    const trxReceipt = await contract721.methods
      .createERC20(name, symbol, cap, templateIndex, minter)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.ERC20Created.returnValues[0]
    } catch (e) {
      this.logger.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /**
   * Add Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} manager User which is going to be the manager
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addManager(
    address: string,
    nftAddress: string,
    manager: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .addManager(manager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods.addManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} manager User which is going to be removed from Manager permission
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async removeManager(
    address: string,
    nftAddress: string,
    manager: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .addManager(manager)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke removeManager function of the contract

    const trxReceipt = await contract721.methods.addManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove Manager for NFT Contract (only Managers can succeed)
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} manager User which is going to be removed from Manager permission
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async executeCall(
    address: string,
    nftAddress: string,
    operation: number,
    to: string,
    value: string,
    data: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .executeCall(operation, to, this.web3.utils.toWei(value), data)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await contract721.methods
      .executeCall(operation, to, this.web3.utils.toWei(value), data)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Set Arbitrary Key and Value into the 725Y standard - ONLY user with Store Updater permission can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} key key for retriving the data stored
   * @param {String} value data stored
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async setNewData(
    address: string,
    nftAddress: string,
    key: string,
    value: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .setNewData(key, value)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await contract721.methods.setNewData(key, value).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Set data for V3 ERC20
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} flags flags for Aqua
   * @param {String} value  data for ERC725Y standard
   * @param {String} data data for Metadata(Aqua)
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async setDataV3(
    address: string,
    nftAddress: string,
    erc20Address: string,
    value: string,
    flags: string,
    data: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .setDataV3(erc20Address, value, flags, data)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await contract721.methods
      .setDataV3(erc20Address, value, flags, data)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Clean Permissions at the 721 Level (manager,store updater, metadata updater, erc20 deployer, v3Minter)
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async cleanPermissions(
    address: string,
    nftAddress: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .cleanPermissions()
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await contract721.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Integration for V3 erc20 datatoken - Only erc20.minter() can do it.
   * Requires erc20.proposeMinter(nftAddress) call first.(similar to an approval for erc20)
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} erc20Address v3 datatoken address
   * @param {String} minter address which will be included into V3Minter permissions
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async wrapV3DT(
    address: string,
    nftAddress: string,
    erc20Address: string,
    minter: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .wrapV3DT(erc20Address, minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await contract721.methods.wrapV3DT(erc20Address, minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Mint V3 erc20 datatokens - Only user with v3Minter permission can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} erc20Address v3 datatoken address
   * @param {String} to address which receives the erc20 datatokens
   * @param {String} value amount of dt to mint(ether unit), will be converted to wei
   * @return {Promise<TransactionReceipt>} transactionId
   */

  public async mintV3DT(
    address: string,
    nftAddress: string,
    erc20Address: string,
    to: string,
    value: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .mintV3DT(erc20Address, to, this.web3.utils.toWei(value))
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke function of the contract

    const trxReceipt = await contract721.methods
      .mintV3DT(erc20Address, to, this.web3.utils.toWei(value))
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

  /**
   * Add V3Minter for wrapped V3 datatokens - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} v3minter User which is going to be the V3Minter
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addV3Minter(
    address: string,
    nftAddress: string,
    v3minter: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .addV3Minter(v3minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods.addV3Minter(v3minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove V3Minter permission for wrapped V3 datatokens - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} v3minter User which will be removed from V3 Minter permission
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async removeV3Minter(
    address: string,
    nftAddress: string,
    v3minter: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .removeV3Minter(v3minter)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods.removeV3Minter(v3minter).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Transfer the NFT, will clean all permissions both on erc721 and erc20 level.
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} to User which will receive the NFT, will also be set as Manager
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async transferNFT(
    address: string,
    nftAddress: string,
    to: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .transferFrom(address, to, 1) // tokenId = 1
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods.transferFrom(address, to, 1).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Add Store Updater permission (725Y standard) - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} storeUpdater User which is going to be the store updater
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async addStoreUpdater(
    address: string,
    nftAddress: string,
    storeUpdater: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .addTo725StoreList(storeUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods.addTo725StoreList(storeUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }

  /**
   * Remove Store Updater permission (725Y standard) - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} storeUpdater Revoke Permission to this user
   * @return {Promise<TransactionReceipt>} transactionId
   */
  public async removeStoreUpdater(
    address: string,
    nftAddress: string,
    storeUpdater: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .removeFrom725StoreList(storeUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods
      .removeFrom725StoreList(storeUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }



  /**
   * Add ERC20Deployer permission - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} erc20Deployer User which is going to have erc20Deployer permission
   * @return {Promise<TransactionReceipt>} transactionId
   */
   public async addERC20Deployer(
    address: string,
    nftAddress: string,
    erc20Deployer: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .addToCreateERC20List(erc20Deployer)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods.addToCreateERC20List(erc20Deployer).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3)
    })

    return trxReceipt
  }


  /**
   * Remove ERC20Deployer permission - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} erc20Deployer Revoke Permission to this user
   * @return {Promise<TransactionReceipt>} transactionId
   */
   public async removeERC20Deployer(
    address: string,
    nftAddress: string,
    erc20Deployer: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .removeFromCreateERC20List(erc20Deployer)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods
      .removeFromCreateERC20List(erc20Deployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }


   /**
   * Add Metadata Updater permission - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} metadataUpdater User which is going to have metadata updater permission
   * @return {Promise<TransactionReceipt>} transactionId
   */
    public async addMetadataUpdater(
      address: string,
      nftAddress: string,
      metadataUpdater: string
    ): Promise<TransactionReceipt> {
      // Create 721contract object
      const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
        from: address
      })
      const gasLimitDefault = this.GASLIMIT_DEFAULT
      let estGas
      try {
        estGas = await contract721.methods
          .addToMetadataList(metadataUpdater)
          .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
      } catch (e) {
        estGas = gasLimitDefault
      }
  
      // Invoke addManager function of the contract
  
      const trxReceipt = await contract721.methods.addToMetadataList(metadataUpdater).send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })
  
      return trxReceipt
    }


     /**
   * Remove Metadata Updater permission - only Manager can succeed
   * @param {String} address
   * @param {String} nftAddress
   * @param {String} metadataUpdater Revoke Permission to this user
   * @return {Promise<TransactionReceipt>} transactionId
   */
   public async removeMetadataUpdater(
    address: string,
    nftAddress: string,
    metadataUpdater: string
  ): Promise<TransactionReceipt> {
    // Create 721contract object
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress, {
      from: address
    })
    const gasLimitDefault = this.GASLIMIT_DEFAULT
    let estGas
    try {
      estGas = await contract721.methods
        .removeFromMetadataList(metadataUpdater)
        .estimateGas({ from: address }, (err, estGas) => (err ? gasLimitDefault : estGas))
    } catch (e) {
      estGas = gasLimitDefault
    }

    // Invoke addManager function of the contract

    const trxReceipt = await contract721.methods
      .removeFromMetadataList(metadataUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3)
      })

    return trxReceipt
  }

   /** Gets data at a given `key`
   * @param {String} nftAddress
   * @param {String} key the key which value to retrieve
   * @return {Promise<string>} The data stored at the key
   */
    public async getData(nftAddress: string, key: string): Promise<string> {
      const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
      const trxReceipt = await contract721.methods.getData(key).call()
      return trxReceipt
    }


  /** Get Name
   * @param {String} nftAddress
   * @return {Promise<string>} string
   */
  public async getName(nftAddress: string): Promise<string> {
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
    const trxReceipt = await contract721.methods.name().call()
    return trxReceipt
  }

  /** Get Symbol
   * @param {String} nftAddress
   * @return {Promise<string>} string
   */
  public async getSymbol(nftAddress: string): Promise<string> {
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
    const trxReceipt = await contract721.methods.symbol().call()
    return trxReceipt
  }

  /** Get Symbol
   * @param {String} nftAddress
   * @return {Promise<string>} string
   */
  public async getOwner(nftAddress: string): Promise<string> {
    const contract721 = new this.web3.eth.Contract(this.nftDatatokenABI, nftAddress)
    const trxReceipt = await contract721.methods.ownerOf(1).call()
    return trxReceipt
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

}
