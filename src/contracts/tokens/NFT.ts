import { AbiItem } from 'web3-utils'
import { TransactionReceipt } from 'web3-eth'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import { LoggerInstance, generateDtName, estimateGas } from '../../utils'
import { Contract } from 'web3-eth-contract'
import { MetadataProof, MetadataAndTokenURI, NftRoles } from '../../@types'
import { SmartContract } from '..'

export class Nft extends SmartContract {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return ERC721Template.abi as AbiItem[]
  }

  /**
   *  Estimate gas cost for createDatatoken token creation
   * @param {String} nftAddress NFT address
   * @param {String} address User address
   * @param {String} minter User set as initial minter for the Datatoken
   * @param {String} paymentCollector initial paymentCollector for this DT
   * @param {String} mpFeeAddress Consume marketplace fee address
   * @param {String} feeToken address of the token marketplace wants to add fee on top
   * @param {String} feeAmount amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {Number} templateIndex NFT template index
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasCreateDatatoken(
    nftAddress: string,
    address: string,
    minter: string,
    paymentCollector: string,
    mpFeeAddress: string,
    feeToken: string,
    feeAmount: string,
    cap: string,
    name?: string,
    symbol?: string,
    templateIndex?: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)
    return estimateGas(
      address,
      nftContract.methods.createERC20,
      templateIndex,
      [name, symbol],
      [minter, paymentCollector, mpFeeAddress, feeToken],
      [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
      []
    )
  }

  /**
   * Create new ERC20 Datatoken - only user with DatatokenDeployer permission can succeed
   * @param {String} nftAddress NFT address
   * @param {String} address User address
   * @param {String} minter User set as initial minter for the Datatoken
   * @param {String} paymentCollector initial paymentCollector for this DT
   * @param {String} mpFeeAddress Consume marketplace fee address
   * @param {String} feeToken address of the token marketplace wants to add fee on top
   * @param {String} feeAmount amount of feeToken to be transferred to mpFeeAddress on top, will be converted to WEI
   * @param {String} cap Maximum cap (Number) - will be converted to wei
   * @param {String} name Token name
   * @param {String} symbol Token symbol
   * @param {Number} templateIndex NFT template index
   * @return {Promise<string>} ERC20 Datatoken address
   */
  public async createDatatoken(
    nftAddress: string,
    address: string,
    minter: string,
    paymentCollector: string,
    mpFeeAddress: string,
    feeToken: string,
    feeAmount: string,
    cap: string,
    name?: string,
    symbol?: string,
    templateIndex?: number
  ): Promise<string> {
    if ((await this.getNftPermissions(nftAddress, address)).deployERC20 !== true) {
      throw new Error(`Caller is not DatatokenDeployer`)
    }
    if (!templateIndex) templateIndex = 1

    // Generate name & symbol if not present
    if (!name || !symbol) {
      ;({ name, symbol } = generateDtName())
    }

    // Create 721contract object
    const nftContract = this.getContract(nftAddress)

    const estGas = await estimateGas(
      address,
      nftContract.methods.createERC20,
      templateIndex,
      [name, symbol],
      [minter, paymentCollector, mpFeeAddress, feeToken],
      [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
      []
    )

    // Call createERC20 token function of the contract
    const trxReceipt = await nftContract.methods
      .createERC20(
        templateIndex,
        [name, symbol],
        [minter, paymentCollector, mpFeeAddress, feeToken],
        [this.web3.utils.toWei(cap), this.web3.utils.toWei(feeAmount)],
        []
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    let tokenAddress = null
    try {
      tokenAddress = trxReceipt.events.TokenCreated.returnValues[0]
    } catch (e) {
      LoggerInstance.error(`ERROR: Failed to create datatoken : ${e.message}`)
    }
    return tokenAddress
  }

  /**
   * Estimate gas cost for add manager call
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasAddManager(
    nftAddress: string,
    address: string,
    manager: string,
    contractInstance?: Contract
  ) {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(address, nftContract.methods.addManager, manager)
  }

  /**
   * Add Manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be assing manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addManager(nftAddress: string, address: string, manager: string) {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await estimateGas(address, nftContract.methods.addManager, manager)

    // Invoke addManager function of the contract
    const trxReceipt = await nftContract.methods.addManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeManager method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasRemoveManager(
    nftAddress: string,
    address: string,
    manager: string,
    contractInstance?: Contract
  ) {
    const nftContract = contractInstance || this.getContract(nftAddress)
    return estimateGas(address, nftContract.methods.removeManager, manager)
  }

  /**
   * Removes a specific manager for NFT Contract (only NFT Owner can succeed)
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {String} manager User adress which is going to be removed as manager
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeManager(nftAddress: string, address: string, manager: string) {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await estimateGas(address, nftContract.methods.removeManager, manager)

    // Invoke removeManager function of the contract
    const trxReceipt = await nftContract.methods.removeManager(manager).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /**
   *  Estimate gas cost for addToCreateERC20List method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} datatokenDeployer User adress which is going to have DatatokenDeployer permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasAddDatatokenDeployer(
    nftAddress: string,
    address: string,
    datatokenDeployer: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)
    return estimateGas(
      address,
      nftContract.methods.addToCreateERC20List,
      datatokenDeployer
    )
  }

  /**
   * Add DatatokenDeployer permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} datatokenDeployer User adress which is going to have DatatokenDeployer permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addDatatokenDeployer(
    nftAddress: string,
    address: string,
    datatokenDeployer: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    // Estimate gas for addToCreateERC20List method
    const estGas = await estimateGas(
      address,
      nftContract.methods.addToCreateERC20List,
      datatokenDeployer
    )

    // Invoke addToCreateERC20List function of the contract
    const trxReceipt = await nftContract.methods
      .addToCreateERC20List(datatokenDeployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeFromCreateERC20List method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} datatokenDeployer Address of the user to be revoked DatatokenDeployer Permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasRemoveDatatokenDeployer(
    nftAddress: string,
    address: string,
    datatokenDeployer: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(
      address,
      nftContract.methods.removeFromCreateERC20List,
      datatokenDeployer
    )
  }

  /**
   * Remove DatatokenDeployer permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} datatokenDeployer Address of the user to be revoked DatatokenDeployer Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeDatatokenDeployer(
    nftAddress: string,
    address: string,
    datatokenDeployer: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address === datatokenDeployer &&
        (await this.getNftPermissions(nftAddress, address)).deployERC20 !== true)
    ) {
      throw new Error(`Caller is not Manager nor DatatokenDeployer`)
    }
    const estGas = await estimateGas(
      address,
      nftContract.methods.removeFromCreateERC20List,
      datatokenDeployer
    )

    // Call removeFromCreateERC20List function of the contract
    const trxReceipt = await nftContract.methods
      .removeFromCreateERC20List(datatokenDeployer)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addToMetadataList method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasAddMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(address, nftContract.methods.addToMetadataList, metadataUpdater)
  }

  /**
   * Add Metadata Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater User adress which is going to have Metadata Updater permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.addToMetadataList,
      metadataUpdater
    )

    // Call addToMetadataList function of the contract
    const trxReceipt = await nftContract.methods.addToMetadataList(metadataUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeFromMetadataList method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async esGasRemoveMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(
      address,
      nftContract.methods.removeFromMetadataList,
      metadataUpdater
    )
  }

  /**
   * Remove Metadata Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} metadataUpdater Address of the user to be revoked Metadata updater Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeMetadataUpdater(
    nftAddress: string,
    address: string,
    metadataUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address !== metadataUpdater &&
        (await this.getNftPermissions(nftAddress, address)).updateMetadata !== true)
    ) {
      throw new Error(`Caller is not Manager nor Metadata Updater`)
    }

    const estGas = await this.esGasRemoveMetadataUpdater(
      nftAddress,
      address,
      metadataUpdater,
      nftContract
    )

    // Call removeFromMetadataList function of the contract
    const trxReceipt = await nftContract.methods
      .removeFromMetadataList(metadataUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addTo725StoreList method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater User adress which is going to have Store Updater permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasAddStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(address, nftContract.methods.addTo725StoreList, storeUpdater)
  }

  /**
   * Add Store Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater User adress which is going to have Store Updater permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async addStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftPermissions(nftAddress, address)).manager !== true) {
      throw new Error(`Caller is not Manager`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.addTo725StoreList,
      storeUpdater
    )

    // Call addTo725StoreList function of the contract
    const trxReceipt = await nftContract.methods.addTo725StoreList(storeUpdater).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /**
   *  Estimate gas cost for removeFrom725StoreList method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasRemoveStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(address, nftContract.methods.removeFrom725StoreList, storeUpdater)
  }

  /**
   * Remove Store Updater permission - only Manager can succeed
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Manager adress
   * @param {String} storeUpdater Address of the user to be revoked Store Updater Permission
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async removeStoreUpdater(
    nftAddress: string,
    address: string,
    storeUpdater: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if (
      (await this.getNftPermissions(nftAddress, address)).manager !== true ||
      (address !== storeUpdater &&
        (await this.getNftPermissions(nftAddress, address)).store !== true)
    ) {
      throw new Error(`Caller is not Manager nor storeUpdater`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.removeFrom725StoreList,
      storeUpdater
    )

    // Call removeFrom725StoreList function of the contract
    const trxReceipt = await nftContract.methods
      .removeFrom725StoreList(storeUpdater)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   *  Estimate gas cost for cleanPermissions method
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasCleanPermissions(
    nftAddress: string,
    address: string,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(address, nftContract.methods.cleanPermissions)
  }

  /**
   * This function allows to remove all ROLES at NFT level: Managers, DatatokenDeployer, MetadataUpdater, StoreUpdater
   * Even NFT Owner has to readd himself as Manager
   * Permissions at Datatoken level stay.
   * Only NFT Owner  can call it.
   * @param {String} nftAddress NFT contract address
   * @param {String} address NFT Owner adress
   * @return {Promise<TransactionReceipt>} trxReceipt
   */

  public async cleanPermissions(
    nftAddress: string,
    address: string
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== address) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const estGas = await estimateGas(address, nftContract.methods.cleanPermissions)

    // Call cleanPermissions function of the contract
    const trxReceipt = await nftContract.methods.cleanPermissions().send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for transfer NFT method
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasTransferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(
      nftOwner,
      nftContract.methods.transferFrom,
      nftOwner,
      nftReceiver,
      tokenId
    )
  }

  /**
   * Transfers the NFT
   * will clean all permissions both on NFT and Datatoken level.
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async transferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await estimateGas(
      nftOwner,
      nftContract.methods.transferFrom,
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .transferFrom(nftOwner, nftReceiver, tokenIdentifier)
      .send({
        from: nftOwner,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for safeTransfer NFT method
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasSafeTransferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(
      nftOwner,
      nftContract.methods.safeTransferFrom,
      nftOwner,
      nftReceiver,
      tokenId
    )
  }

  /**
   * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
   * will clean all permissions both on NFT and Datatoken level.
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {String} nftReceiver User which will receive the NFT, will also be set as Manager
   * @param {Number} tokenId The id of the token to be transfered
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async safeTransferNft(
    nftAddress: string,
    nftOwner: string,
    nftReceiver: string,
    tokenId?: number
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if ((await this.getNftOwner(nftAddress)) !== nftOwner) {
      throw new Error(`Caller is not NFT Owner`)
    }

    const tokenIdentifier = tokenId || 1

    const estGas = await estimateGas(
      nftOwner,
      nftContract.methods.safeTransferFrom,
      nftOwner,
      nftReceiver,
      tokenIdentifier
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods
      .safeTransferFrom(nftOwner, nftReceiver, tokenIdentifier)
      .send({
        from: nftOwner,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  // TODO: Finish this description
  /**
   * Estimate gas cost for setMetadata  method
   * @param {String} nftAddress NFT contract address
   * @param {String} metadataUpdater metadataUpdater address
   * @param {Number} metadataState User which will receive the NFT, will also be set as Manager
   * @param {String} metadataDecryptorUrl
   * @param {Number} tokenId The id of the token to be transfered
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasSetMetadata(
    nftAddress: string,
    metadataUpdater: string,
    metadataState: number,
    metadataDecryptorUrl: string,
    metadataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string,
    metadataProofs?: MetadataProof[],
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)
    if (!metadataProofs) metadataProofs = []
    return estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaData,
      metadataState,
      metadataDecryptorUrl,
      metadataDecryptorAddress,
      flags,
      data,
      metadataHash,
      metadataProofs
    )
  }

  /**
   * safeTransferNFT Used for transferring the NFT, can be used by an approved relayer
   * will clean all permissions both on NFT and Datatoken level.
   * @param {String} nftAddress NFT contract address
   * @param {String} address Caller address NFT Owner adress
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadata(
    nftAddress: string,
    address: string,
    metadataState: number,
    metadataDecryptorUrl: string,
    metadataDecryptorAddress: string,
    flags: string,
    data: string,
    metadataHash: string,
    metadataProofs?: MetadataProof[]
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)
    if (!metadataProofs) metadataProofs = []
    if (!(await this.getNftPermissions(nftAddress, address)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }
    const estGas = await estimateGas(
      address,
      nftContract.methods.setMetaData,
      metadataState,
      metadataDecryptorUrl,
      metadataDecryptorAddress,
      flags,
      data,
      metadataHash,
      metadataProofs
    )
    const trxReceipt = await nftContract.methods
      .setMetaData(
        metadataState,
        metadataDecryptorUrl,
        metadataDecryptorAddress,
        flags,
        data,
        metadataHash,
        metadataProofs
      )
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for setMetadata  method
   * @param {String} nftAddress NFT contract address
   * @param {String} metadataUpdater metadataUpdater address
   * @param {MetaDataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasSetMetadataAndTokenURI(
    nftAddress: string,
    metadataUpdater: string,
    metadataAndTokenURI: MetadataAndTokenURI,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)
    const sanitizedMetadataAndTokenURI = {
      ...metadataAndTokenURI,
      metadataProofs: metadataAndTokenURI.metadataProofs || []
    }
    return estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaDataAndTokenURI,
      sanitizedMetadataAndTokenURI
    )
  }

  /**
   *  Helper function to improve UX sets both MetaData & TokenURI in one tx
   * @param {String} nftAddress NFT contract address
   * @param {String} address Caller address
   * @param {MetadataAndTokenURI} metadataAndTokenURI metaDataAndTokenURI object
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadataAndTokenURI(
    nftAddress: string,
    metadataUpdater: string,
    metadataAndTokenURI: MetadataAndTokenURI
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)
    if (!(await this.getNftPermissions(nftAddress, metadataUpdater)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }
    const sanitizedMetadataAndTokenURI = {
      ...metadataAndTokenURI,
      metadataProofs: metadataAndTokenURI.metadataProofs || []
    }
    const estGas = await estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaDataAndTokenURI,
      sanitizedMetadataAndTokenURI
    )
    const trxReceipt = await nftContract.methods
      .setMetaDataAndTokenURI(sanitizedMetadataAndTokenURI)
      .send({
        from: metadataUpdater,
        gas: estGas + 1,
        gasPrice: await this.getFairGasPrice()
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for setMetadataState  method
   * @param {String} nftAddress NFT contract address
   * @param {String} nftOwner Current NFT Owner adress
   * @param {Number} metadataState new metadata state
   * @param {Contract} nftContract optional contract instance
   * @return {Promise<any>}
   */
  public async estGasGasSetMetadataState(
    nftAddress: string,
    metadataUpdater: string,
    metadataState: number,
    contractInstance?: Contract
  ): Promise<any> {
    const nftContract = contractInstance || this.getContract(nftAddress)

    return estimateGas(
      metadataUpdater,
      nftContract.methods.setMetaDataState,
      metadataState
    )
  }

  /**
   * setMetadataState Used for updating the metadata State
   * @param {String} nftAddress NFT contract address
   * @param {String} address Caller address => metadata updater
   * @param {Number} metadataState new metadata state
   * @return {Promise<TransactionReceipt>} trxReceipt
   */
  public async setMetadataState(
    nftAddress: string,
    address: string,
    metadataState: number
  ): Promise<TransactionReceipt> {
    const nftContract = this.getContract(nftAddress)

    if (!(await this.getNftPermissions(nftAddress, address)).updateMetadata) {
      throw new Error(`Caller is not Metadata updater`)
    }

    const estGas = await estimateGas(
      address,
      nftContract.methods.setMetaDataState,
      metadataState
    )

    // Call transferFrom function of the contract
    const trxReceipt = await nftContract.methods.setMetaDataState(metadataState).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })

    return trxReceipt
  }

  /** Estimate gas cost for setTokenURI method
   * @param nftAddress NFT contract address
   * @param address user adress
   * @param data input data for TokenURI
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async estGasSetTokenURI(
    nftAddress: string,
    address: string,
    data: string
  ): Promise<any> {
    const nftContract = this.getContract(nftAddress)

    return estimateGas(address, nftContract.methods.setTokenURI, '1', data)
  }

  /** set TokenURI on an nft
   * @param nftAddress NFT contract address
   * @param address user adress
   * @param data input data for TokenURI
   * @return {Promise<TransactionReceipt>} transaction receipt
   */
  public async setTokenURI(
    nftAddress: string,
    address: string,
    data: string
  ): Promise<any> {
    const nftContract = this.getContract(nftAddress)

    const estGas = await estimateGas(address, nftContract.methods.setTokenURI, '1', data)
    const trxReceipt = await nftContract.methods.setTokenURI('1', data).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await this.getFairGasPrice()
    })
    return trxReceipt
  }

  /** Get Owner
   * @param {String} nftAddress NFT contract address
   * @return {Promise<string>} string
   */
  public async getNftOwner(nftAddress: string): Promise<string> {
    const nftContract = this.getContract(nftAddress)
    const trxReceipt = await nftContract.methods.ownerOf(1).call()
    return trxReceipt
  }

  /** Get users NFT Permissions
   * @param {String} nftAddress NFT contract address
   * @param {String} address user adress
   * @return {Promise<NftRoles>}
   */
  public async getNftPermissions(nftAddress: string, address: string): Promise<NftRoles> {
    const nftContract = this.getContract(nftAddress)
    const roles = await nftContract.methods.getPermissions(address).call()
    return roles
  }

  /** Get users Metadata, return Metadata details
   * @param {String} nftAddress NFT contract address
   * @return {Promise<Objecta>}
   */
  public async getMetadata(nftAddress: string): Promise<Object> {
    const nftContract = this.getContract(nftAddress)
    return await nftContract.methods.getMetaData().call()
  }

  /** Get users DatatokenDeployer role
   * @param {String} nftAddress NFT contract address
   * @param {String} address user adress
   * @return {Promise<boolean>}
   */
  public async isDatatokenDeployer(
    nftAddress: string,
    address: string
  ): Promise<boolean> {
    const nftContract = this.getContract(nftAddress)
    const isDatatokenDeployer = await nftContract.methods.isERC20Deployer(address).call()
    return isDatatokenDeployer
  }

  /** Gets data at a given `key`
   * @param {String} nftAddress NFT contract address
   * @param {String} key the key which value to retrieve
   * @return {Promise<string>} The data stored at the key
   */
  public async getData(nftAddress: string, key: string): Promise<string> {
    const nftContract = this.getContract(nftAddress)
    const data = await nftContract.methods.getData(key).call()
    return data
  }

  /** Gets data at a given `key`
   * @param {String} nftAddress NFT contract address
   * @param {String} id
   * @return {Promise<string>} The data stored at the key
   */
  public async getTokenURI(nftAddress: string, id: number): Promise<string> {
    const nftContract = this.getContract(nftAddress)
    const data = await nftContract.methods.tokenURI(id).call()
    return data
  }
}
