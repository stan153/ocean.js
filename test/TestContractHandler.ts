import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'

const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'

export class TestContractHandler {
  public accounts: string[]
  public ERC721Factory: Contract
  public ERC20Factory: Contract
  public ERC20Template: Contract
  public ERC721Template: Contract
  public Metadata: Contract

  public ERC721FactoryBytecode: string
  public ERC20FactoryBytecode: string
  public ERC20TemplateBytecode: string
  public ERC721TemplateBytecode: string
  public MetadataBytecode: string

  public factory721Address: string
  public template721Address: string
  public metadataAddress: string
  public factory20Address: string
  public template20Address: string
  public web3: Web3

  constructor(
    ERC721FactoryABI: AbiItem | AbiItem[],
    ERC20FactoryABI: AbiItem | AbiItem[],
    ERC721TemplateABI: AbiItem | AbiItem[],
    ERC20TemplateABI: AbiItem | AbiItem[],
    MetadataABI: AbiItem | AbiItem[],
    factory721Bytecode: string,
    factory20Bytecode: string,
    template721Bytecode: string,
    template20Bytecode: string,
    metadataBytecode: string,
    web3: Web3
  ) {
    this.web3 = web3
    this.ERC721Factory = new this.web3.eth.Contract(ERC721FactoryABI)
    this.ERC20Factory = new this.web3.eth.Contract(ERC20FactoryABI)
    this.ERC20Template = new this.web3.eth.Contract(ERC20TemplateABI)
    this.ERC721Template = new this.web3.eth.Contract(ERC721TemplateABI)
    this.Metadata = new this.web3.eth.Contract(MetadataABI)
    this.ERC721FactoryBytecode = factory721Bytecode
    this.ERC20FactoryBytecode = factory20Bytecode
    this.ERC20TemplateBytecode = template20Bytecode
    this.ERC721TemplateBytecode = template721Bytecode
    this.MetadataBytecode = metadataBytecode
  }

  public async getAccounts(): Promise<string[]> {
    this.accounts = await this.web3.eth.getAccounts()
    return this.accounts
  }

  public async deployContracts(minter: string) {
    let estGas
   // console.log(this.ERC721TemplateBytecode)
   // console.log(this.ERC20TemplateBytecode)
   // DEPLOY ERC20 TEMPLATE
   // get est gascost
    estGas = await this.ERC20Template.deploy({
      data: this.ERC20TemplateBytecode,
      arguments: []
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.template20Address = await this.ERC20Template.deploy({
      data: this.ERC20TemplateBytecode,
      arguments: []
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

    // DEPLOY ERC721 TEMPLATE
    // get est gascost
    estGas = await this.ERC721Template.deploy({
      data: this.ERC721TemplateBytecode,
      arguments: []
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.template721Address = await this.ERC721Template.deploy({
      data: this.ERC721TemplateBytecode,
      arguments: []
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

  

    // DEPLOY ERC20 FACTORY
    estGas = await this.ERC20Factory.deploy({
      data: this.ERC20FactoryBytecode,
      arguments: [this.template20Address, communityCollector]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.factory20Address = await this.ERC20Factory.deploy({
      data: this.ERC20FactoryBytecode,
      arguments: [this.template20Address, communityCollector]
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

      // DEPLOY METADATA CONTRACT
      estGas = await this.Metadata.deploy({
        data: this.MetadataBytecode,
        arguments: [this.factory20Address]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.metadataAddress = await this.Metadata.deploy({
        data: this.MetadataBytecode,
        arguments: [this.factory20Address]
      })
        .send({
          from: minter,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    //    // console.log(this.Metadata)

    // DEPLOY ERC721 FACTORY
    estGas = await this.ERC721Factory.deploy({
      data: this.ERC721FactoryBytecode,
      arguments: [this.template721Address, communityCollector,this.factory20Address,this.metadataAddress]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.factory721Address = await this.ERC721Factory.deploy({
      data: this.ERC721FactoryBytecode,
      arguments: [this.template721Address,communityCollector,this.factory20Address,this.metadataAddress]
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

      
    //  // TODO: SET ERC721 Factory address in ERC20 Factory
   
  }
}
