import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../../TestContractHandler'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import { Contract, ethers } from 'ethers'
//import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC20Factory.sol/ERC20Factory.json'
import Metadata from '@oceanprotocol/contracts/artifacts/contracts/metadata/Metadata.sol/Metadata.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import MockOldDT from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockOldDT.sol/MockOldDT.json'
import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../../src/factories/NFTFactory'
import { DT20Factory } from '../../../src/factories/DT20Factory'
import { DataTokens } from '../../../src/datatokens/Datatokens'

const web3 = new Web3('http://127.0.0.1:8545')

describe('DT20 Test', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: TestContractHandler
  let nftDatatoken: NFTDataToken
  let nftFactory: NFTFactory
  let erc20DT: DataTokens
  let erc20Factory: DT20Factory
  let nftAddress: string
  let erc20Address: string

  
  const nftName = 'NFT'
  const nftSymbol = 'NFTSymbol'
  const nftTemplateIndex = 1
  const data = web3.utils.asciiToHex('SomeData')
  const flags = web3.utils.asciiToHex(
    'f8929916089218bdb4aa78c3ecd16633afd44b8aef89299160'
  )

  // setData() argument
 
  const value = web3.utils.asciiToHex('SomeData')

 
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
    nftOwner = contracts.accounts[0]
    user1 = contracts.accounts[1]
    user2 = contracts.accounts[2]
    await contracts.deployContracts(nftOwner)
    

  
  })

  it('should set ERC721Factory on ERC20Factory', async () => {
    erc20Factory = new DT20Factory(
      contracts.factory20Address,
     // ERC20Factory.abi as AbiItem[],
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

    nftAddress = await nftFactory.createNFT(
      nftOwner,
      data,
      flags,
      nftName,
      nftSymbol,
      nftTemplateIndex
    )
    //console.log(nftAddress)

    nftDatatoken = new NFTDataToken(
      
      web3,
      LoggerInstance
      // ERC721Template.abi as AbiItem[],
    )
  })

  it('should create a new ERC20 DT Contract from NFT contract', async () => {
    await nftDatatoken.addERC20Deployer(nftAddress,nftOwner, nftOwner)
    erc20Address = await nftDatatoken.createERC20(nftAddress,nftOwner, nftOwner,'1000')
    assert(erc20Address != null)
    console.log(erc20Address)
  })

  it('should initialize DT20 Instance', async () => {
    erc20DT = new DataTokens(web3,LoggerInstance)
  })

  it('#mint - should mint DT20 to user1, if Minter', async () => {
    assert(((await erc20DT.getPermissions(erc20Address,nftOwner)).minter) == true)
    await erc20DT.mint(erc20Address,nftOwner,'10',user1)
    
    assert(await erc20DT.balance(erc20Address,user1) == '10')
  })

  it('#addMinter - should add user1 as minter, if ERC20Deployer permission (at 721 level), the user1 mints', async () => {
    assert(((await nftDatatoken.getPermissions(nftAddress,nftOwner)).deployERC20) == true)
    assert(((await erc20DT.getPermissions(erc20Address,user1)).minter) == false)
    
    await erc20DT.addMinter(erc20Address,nftOwner,user1)

   assert(((await erc20DT.getPermissions(erc20Address,user1)).minter) == true)

    await erc20DT.mint(erc20Address, user1,'10',nftOwner)
    
    assert(await erc20DT.balance(erc20Address,nftOwner) == '10')
  })

  it('#removeMinter - should remove user1 as minter, if ERC20Deployer permission (at 721 level)', async () => {
    assert(((await nftDatatoken.getPermissions(nftAddress,nftOwner)).deployERC20) == true)
    assert(((await erc20DT.getPermissions(erc20Address,user1)).minter) == true)
    
    await erc20DT.removeMinter(erc20Address,nftOwner,user1)

    assert(((await erc20DT.getPermissions(erc20Address,user1)).minter) == false)

  
  })

  it('#setData - should set a value into 725Y standard, if ERC20Deployer permission (at 721 level)', async () => {
    assert(((await nftDatatoken.getPermissions(nftAddress,nftOwner)).deployERC20) == true)
    
    await erc20DT.setData(erc20Address,nftOwner,value)

    const key = web3.utils.keccak256(erc20Address)
    assert(await nftDatatoken.getData(nftAddress,key) == value)
    
  
  })

  it('#setFeeCollector - should set a new feeCollector, if NFT Owner', async () => {
   // IF NOT SET, feeCollector is NFT OWNER
    assert(await erc20DT.getFeeCollector(erc20Address) == nftOwner)
    await erc20DT.setFeeCollector(erc20Address,nftOwner,user1)
    assert(await erc20DT.getFeeCollector(erc20Address) == user1)
    
  
  })

  it('#cleanPermissions - should clean permissions at ERC20 level and set Fee Collector as NFT Owner, if NFT Owner', async () => {
     
     assert(((await erc20DT.getPermissions(erc20Address,nftOwner)).minter) == true)

     assert(await erc20DT.getFeeCollector(erc20Address) == user1)

     await erc20DT.cleanPermissions(erc20Address,nftOwner)

     assert(await erc20DT.getFeeCollector(erc20Address) == nftOwner)

     assert(((await erc20DT.getPermissions(erc20Address,nftOwner)).minter) == false)
     
   
   })

  
})
