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
  let newNFTAddress: string
  let erc20Address: string

  
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

  it('should create a new ERC20 DT Contract from NFT contract', async () => {
    await nftDatatoken.addERC20Deployer(nftOwner, nftOwner)
    erc20Address = await nftDatatoken.createERC20(nftOwner, nftOwner)
    assert(erc20Address != null)
    console.log(erc20Address)
  })

  it('should initialize DT20 Instance', async () => {
   
  })

  
})
