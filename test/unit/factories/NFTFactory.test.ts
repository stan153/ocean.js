import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC20Factory.sol/ERC20Factory.json'
import Metadata from '@oceanprotocol/contracts/artifacts/contracts/metadata/Metadata.sol/Metadata.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../../src/factories/NFTFactory'
import { DT20Factory } from '../../../src/factories/DT20Factory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('NFT Factory test', () => {
  let factoryOwner: string
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: TestContractHandler
  let nftDatatoken: NFTDataToken
  let nftFactory: NFTFactory
  let erc20Factory: DT20Factory
  let nftAddress: string
  let newNFTAddress: string
  let newNFTDatatoken: NFTDataToken

  const nftName = 'NFT'
  const nftSymbol = 'NFTSymbol'
  const nftTemplateIndex = 1
  const data = web3.utils.asciiToHex('SomeData')
  const flags = web3.utils.asciiToHex(
    'f8929916089218bdb4aa78c3ecd16633afd44b8aef89299160'
  )


  // TODO: complete unit test
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
    factoryOwner = contracts.accounts[0]
    nftOwner = contracts.accounts[1]
    user1 = contracts.accounts[2]
    await contracts.deployContracts(factoryOwner)
  })

  it('should set ERC721Factory on ERC20Factory', async () => {
    erc20Factory = new DT20Factory(
      contracts.factory20Address,
      //ERC20Factory.abi as AbiItem[],
      web3,
      LoggerInstance
    )

    await erc20Factory.setERC721Factory(factoryOwner, contracts.factory721Address)
  })

  it('should initialize NFTFactory instance, create a new NFT and initializing a NFT dt class', async () => {
    nftFactory = new NFTFactory(
      contracts.factory721Address,
      web3,
      LoggerInstance
      // ERC721Factory.abi as AbiItem[],
    )

    nftAddress = await nftFactory.createNFT(
      nftOwner,
      data,
      flags,
      nftName,
      nftSymbol,
      nftTemplateIndex
    )
    //console.log(newNFTAddress)

    nftDatatoken = new NFTDataToken(
      nftAddress,
      web3,
      LoggerInstance
      // ERC721Template.abi as AbiItem[],
    )
  })

  it('#createNFT - should create a second NFT Contract without specificifing name, symbol and templateIndex', async () => {
    newNFTAddress = await nftFactory.createNFT(nftOwner, data, flags)

    newNFTDatatoken = new NFTDataToken(
      newNFTAddress,
      web3,
      LoggerInstance
      // ERC721Template.abi as AbiItem[],
    )

    assert((await newNFTDatatoken.getName()) != null)
    assert((await newNFTDatatoken.getSymbol()) != null)
  })

  it('#getCurrentNFTCount - should succeed to use view function', async () => {
    assert((await nftFactory.getCurrentNFTCount()) == 3) // fix in contracts, let's start from zero and not one
  })

  it('#getCurrentTemplateCount - should succed to use view function', async () => {
    assert((await nftFactory.getCurrentTemplateCount()) == 1)
  })

  it('#getTokenTemplate - should succeed to use view function', async () => {
    assert(
      (await nftFactory.getTokenTemplate(1)).templateAddress ==
        contracts.template721Address
    )
    assert((await nftFactory.getTokenTemplate(1)).isActive == true)
  })

  it('#addTokenTemplate - should succeed to add a new ERC721 Template, if factory Owner', async () => {
    assert((await nftFactory.getCurrentTemplateCount()) == 1)
    
    await nftFactory.addTokenTemplate(factoryOwner,contracts.template721Address)
    assert((await nftFactory.getCurrentTemplateCount()) == 2)
    
    assert(
      (await nftFactory.getTokenTemplate(2)).templateAddress ==
        contracts.template721Address
    )
    assert((await nftFactory.getTokenTemplate(2)).isActive == true)

  })

  it('#disableTokenTemplate - should succeed to disable a ERC721 Template, if factory Owner', async () => {
    assert((await nftFactory.getTokenTemplate(2)).isActive == true)
    await nftFactory.disableTokenTemplate(factoryOwner,2)
    assert((await nftFactory.getTokenTemplate(2)).isActive == false)
   
  })

  it('#reactivateTokenTemplate - should succeed to reactivate a previously disabled ERC721 Template, if factory Owner', async () => {
    assert((await nftFactory.getTokenTemplate(2)).isActive == false)
    await nftFactory.reactivateTokenTemplate(factoryOwner,2)
    assert((await nftFactory.getTokenTemplate(2)).isActive == true)
   
  })


})
