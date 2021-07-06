import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { LoggerInstance } from '../../src/utils'
import Web3 from 'web3'
import { Contract, ethers } from 'ethers'
//import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC20Factory.sol/ERC20Factory.json'
import Metadata from '@oceanprotocol/contracts/artifacts/contracts/metadata/Metadata.sol/Metadata.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import MockOldDT from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockOldDT.sol/MockOldDT.json'
import { NFTDataToken } from '../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../src/factories/NFTFactory'
import { DT20Factory } from '../../src/factories/DT20Factory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('NFTDatatoken', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let balance: string
  let contracts: TestContractHandler
  let nftDatatoken: NFTDataToken
  let nftFactory: NFTFactory
  let erc20Factory: DT20Factory
  let newNFTAddress: string
  let v3ContractAddress: string
  let tokenAddress: string
  let v3Contract

  const tokenAmount = '100'
  const blob = 'https://example.com/dataset-1'
  const nftName = 'NFT'
  const nftSymbol = 'NFTSymbol'
  const nftTemplateIndex = 1
  const data = web3.utils.asciiToHex('SomeData')
  const flags = web3.utils.asciiToHex(
    'f8929916089218bdb4aa78c3ecd16633afd44b8aef89299160'
  )

  // setNewData() arguments
  const key = web3.utils.keccak256('ARBITRARY_KEY')
  const value = web3.utils.asciiToHex('SomeData')

  const v3Datatoken = '0xa2B8b3aC4207CFCCbDe4Ac7fa40214fd00A2BA71'
  const v3DTOwner = '0x12BD31628075C20919BA838b89F414241b8c4869'
  // TODO: add V3 Integration
  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      ERC721Factory.abi as AbiItem[],
      ERC20Factory.abi as AbiItem[],
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      Metadata.abi as AbiItem[],
      ERC721Factory.bytecode,
      ERC20Factory.bytecode,
      ERC721Template.bytecode,
      ERC20Template.bytecode,
      Metadata.bytecode,
      web3
    )
    await contracts.getAccounts()
    nftOwner = contracts.accounts[0]
    user1 = contracts.accounts[1]
    user2 = contracts.accounts[2]
    await contracts.deployContracts(nftOwner)
    

  
  })

  it('should set ERC721Factory on ERC20Factory', async () => {
    erc20Factory = new DT20Factory(
      contracts.factory20Address,
      ERC20Factory.abi as AbiItem[],
      web3,
      LoggerInstance
    )

    await erc20Factory.setERC721Factory(nftOwner, contracts.factory721Address)
  })

  it('should initialize NFTFactory instance and create a new NFT', async () => {
    nftFactory = new NFTFactory(
      contracts.factory721Address,
      web3,
      LoggerInstance
      // ERC721Factory.abi as AbiItem[],
    )

    newNFTAddress = await nftFactory.createNFT(
      nftOwner,
      data,
      flags,
      nftName,
      nftSymbol,
      nftTemplateIndex
    )
    //console.log(newNFTAddress)

    nftDatatoken = new NFTDataToken(
      newNFTAddress,
      web3,
      LoggerInstance
      // ERC721Template.abi as AbiItem[],
    )
  })

  it('should create a new ERC20 DT from NFT contract', async () => {
    await nftDatatoken.addERC20Deployer(nftOwner, nftOwner)
    const erc20Address = await nftDatatoken.createERC20(nftOwner, nftOwner)
    console.log(erc20Address)
  })

  it('should add a new Manager', async () => {
    assert((await nftDatatoken.getPermissions(user1)).manager == false)

    await nftDatatoken.addManager(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).manager == true)
  })

  it('should remove a Manager', async () => {
    assert((await nftDatatoken.getPermissions(user1)).manager == true)

    await nftDatatoken.removeManager(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).manager == false)
  })

  it('should call executeCall from Manager', async () => {
    const operation = 0
    const to = user2
    const value = '10'
    const data = web3.utils.asciiToHex('SomeData')

    await nftDatatoken.executeCall(nftOwner, operation, to, value, data)
  })

  it('should setNewData if Store updater', async () => {
    await nftDatatoken.addStoreUpdater(nftOwner, user1)

    await nftDatatoken.setNewData(user1, key, value)

    assert((await nftDatatoken.getData(key)) == value)
  })

  it('should cleanPermissions if NFTOwner', async () => {
    assert((await nftDatatoken.getPermissions(user1)).store == true)
    assert((await nftDatatoken.getPermissions(nftOwner)).manager == true)

    await nftDatatoken.cleanPermissions(nftOwner)

    assert((await nftDatatoken.getPermissions(user1)).store == false)
    assert((await nftDatatoken.getPermissions(nftOwner)).manager == false)

    // NOW WE ReADD nftOwner as manager
    await nftDatatoken.addManager(nftOwner, nftOwner)
    assert((await nftDatatoken.getPermissions(nftOwner)).manager == true)
  })

  it('should add and remove from Store Updater if Manager', async () => {
    assert((await nftDatatoken.getPermissions(user1)).store == false)

    await nftDatatoken.addStoreUpdater(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).store == true)

    await nftDatatoken.removeStoreUpdater(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).store == false)
  })

  it('should add and remove from ERC20deployer if Manager', async () => {
    assert((await nftDatatoken.getPermissions(user1)).deployERC20 == false)

    await nftDatatoken.addERC20Deployer(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).deployERC20 == true)

    await nftDatatoken.removeERC20Deployer(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).deployERC20 == false)
  })

  it('should add and remove from Metadata Updater if Manager', async () => {
    assert((await nftDatatoken.getPermissions(user1)).updateMetadata == false)

    await nftDatatoken.addMetadataUpdater(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).updateMetadata == true)

    await nftDatatoken.removeMetadataUpdater(nftOwner, user1)

    assert((await nftDatatoken.getPermissions(user1)).updateMetadata == false)
  })

  it('should succed to use view functions', async () => {
    assert((await nftDatatoken.getName()) == nftName)
    assert((await nftDatatoken.getSymbol()) == nftSymbol)
    assert((await nftDatatoken.getOwner()) == nftOwner)

    assert((await nftDatatoken.getPermissions(user2)).manager == false)
    assert((await nftDatatoken.getPermissions(user2)).updateMetadata == false)
    assert((await nftDatatoken.getPermissions(user2)).deployERC20 == false)
    assert((await nftDatatoken.getPermissions(user2)).store == false)
    assert((await nftDatatoken.getPermissions(user2)).v3Minter == false)

    assert((await nftDatatoken.getData(key)) == value)
  })


  it('it proposeMinter() for V3 Integration', async () => {
    
  // CREATE MOCK V3 DT WHERE NFT OWNER IS ALSO OWNER/MINTER
    v3ContractAddress = await new web3.eth.Contract(MockOldDT.abi as AbiItem[]).deploy({
      data:MockOldDT.bytecode,
      arguments: []
    })
      .send({
        from:nftOwner,
        gas: 5515515,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })
    console.log(v3ContractAddress)
    v3Contract = new web3.eth.Contract(MockOldDT.abi as AbiItem[],v3ContractAddress)

    // PROPOSE NFT ADDRESS AS MINTER
    await v3Contract.methods.proposeMinter(newNFTAddress).send({ from: nftOwner })
    

  })

  it('nftOwner calls wrapV3DT and set himself as minter at the 721 level', async () => {
    
    
   await nftDatatoken.wrapV3DT(nftOwner,v3ContractAddress,nftOwner)

  })

  it('nftOwner has v3Minter permission and mint some V3ERC20 to user2', async () => {
    assert((await nftDatatoken.getPermissions(nftOwner)).v3Minter == true)
    
    await nftDatatoken.mintV3DT(nftOwner,v3ContractAddress,user2,'10')

    assert((await v3Contract.methods.balanceOf(user2).call()).toString() == nftDatatoken.toWei('10'))
   })
})
