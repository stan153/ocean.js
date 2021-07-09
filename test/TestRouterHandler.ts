import { timingSafeEqual } from 'crypto';
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'

const oceanAddress = "0x967da4048cd07ab37855c090aaf366e4ce1b9f48";
const vaultAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

export class TestRouterHandler {
  public accounts: string[]
  public ForkTemplate: Contract
  public ForkFactory: Contract
  public Router: Contract
  public MockERC20: Contract
  public MockOcean: Contract
  public ForkTemplateBytecode: string
  public ForkFactoryBytecode: string
  public RouterBytecode: string
  public MockERC20Bytecode: string
  public MockOceanBytecode: string

  public forkTemplateAddress: string
  public forkFactoryAddress: string
  public routerAddress: string
  public mockERC20Address: string
  public mockDT20Address: string
  public mockOceanAddress: string
  public web3: Web3

  constructor(
    ForkTemplateABI: AbiItem | AbiItem[],
    ForkFactoryABI: AbiItem | AbiItem[],
    RouterABI: AbiItem | AbiItem[],
    MockERC20ABI: AbiItem | AbiItem[],
    MockOceanABI: AbiItem | AbiItem[],
    forkTemplateBytecode: string,
    factoryTemplateBytecode: string,
    routerBytecode: string,
    mockERC20Bytecode: string,
    mockOceanBytecode: string,
    web3: Web3
  ) {
    this.web3 = web3
    this.ForkTemplate = new this.web3.eth.Contract(ForkTemplateABI)
    this.ForkFactory = new this.web3.eth.Contract(ForkFactoryABI)
    this.Router = new this.web3.eth.Contract(RouterABI)
    this.MockERC20 = new this.web3.eth.Contract(MockERC20ABI)
    this.MockOcean = new this.web3.eth.Contract(MockOceanABI)
   
    this.ForkTemplateBytecode = forkTemplateBytecode
    this.ForkFactoryBytecode = factoryTemplateBytecode
    this.RouterBytecode = routerBytecode
    this.MockERC20Bytecode = mockERC20Bytecode
    this.MockOceanBytecode = mockOceanBytecode
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
    estGas = await this.ForkTemplate.deploy({
      data: this.ForkTemplateBytecode,
      arguments: []
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.forkTemplateAddress = await this.ForkTemplate.deploy({
      data: this.ForkTemplateBytecode,
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
    estGas = await this.ForkFactory.deploy({
      data: this.ForkFactoryBytecode,
      arguments: [this.forkTemplateAddress]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.forkFactoryAddress = await this.ForkFactory.deploy({
      data: this.ForkFactoryBytecode,
      arguments: [this.forkTemplateAddress]
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

  
    // DEPLOY MOCK OCEAN
    estGas = await this.MockOcean.deploy({
      data: this.MockOceanBytecode,
      arguments: [minter]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.mockOceanAddress = await this.MockOcean.deploy({
      data: this.MockOceanBytecode,
      arguments: [minter]
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })


     // DEPLOY MOCK 1 ERC20
     estGas = await this.MockERC20.deploy({
      data: this.MockERC20Bytecode,
      arguments: [minter, 'UNISWAP','UNI']
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.mockERC20Address = await this.MockERC20.deploy({
      data: this.MockERC20Bytecode,
      arguments: [minter,'UNISWAP','UNI']
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

         // DEPLOY MOCK DT20
     estGas = await this.MockERC20.deploy({
      data: this.MockERC20Bytecode,
      arguments: [minter, 'DATATOKEN','DT20']
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.mockDT20Address = await this.MockERC20.deploy({
      data: this.MockERC20Bytecode,
      arguments: [minter,'USDC Coin','USDC']
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
    estGas = await this.Router.deploy({
      data: this.RouterBytecode,
      arguments: [minter,this.mockOceanAddress,vaultAddress, this.forkFactoryAddress]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.routerAddress = await this.Router.deploy({
      data: this.RouterBytecode,
      arguments: [minter,this.mockOceanAddress,vaultAddress, this.forkFactoryAddress]
    })
      .send({
        from: minter,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

    //   // DEPLOY METADATA CONTRACT
    //   estGas = await this.Metadata.deploy({
    //     data: this.MetadataBytecode,
    //     arguments: [this.factory20Address]
    //   }).estimateGas(function (err, estGas) {
    //     if (err) console.log('DeployContracts: ' + err)
    //     return estGas
    //   })
    //   // deploy the contract and get it's address
    //   this.metadataAddress = await this.Metadata.deploy({
    //     data: this.MetadataBytecode,
    //     arguments: [this.factory20Address]
    //   })
    //     .send({
    //       from: minter,
    //       gas: estGas + 1,
    //       gasPrice: '3000000000'
    //     })
    //     .then(function (contract) {
    //       return contract.options.address
    //     })
    // //    // console.log(this.Metadata)

    // // DEPLOY ERC721 FACTORY
    // estGas = await this.ERC721Factory.deploy({
    //   data: this.ERC721FactoryBytecode,
    //   arguments: [this.template721Address, communityCollector,this.factory20Address,this.metadataAddress]
    // }).estimateGas(function (err, estGas) {
    //   if (err) console.log('DeployContracts: ' + err)
    //   return estGas
    // })
    // // deploy the contract and get it's address
    // this.factory721Address = await this.ERC721Factory.deploy({
    //   data: this.ERC721FactoryBytecode,
    //   arguments: [this.template721Address,communityCollector,this.factory20Address,this.metadataAddress]
    // })
    //   .send({
    //     from: minter,
    //     gas: estGas + 1,
    //     gasPrice: '3000000000'
    //   })
    //   .then(function (contract) {
    //     return contract.options.address
    //   })

      
    // //  // TODO: SET ERC721 Factory address in ERC20 Factory
   
  }
}
