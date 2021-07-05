import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { LoggerInstance } from '../../src/utils'
import Web3 from 'web3'
import { ethers } from "ethers";
//import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC20Factory.sol/ERC20Factory.json'
import Metadata from '@oceanprotocol/contracts/artifacts/contracts/metadata/Metadata.sol/Metadata.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'

import { NFTDataToken } from '../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../src/factories/NFTFactory'
import { DT20Factory } from '../../src/factories/DT20Factory'


const web3 = new Web3('http://127.0.0.1:8545')



describe('NFTDatatoken', () => {
  let minter: string
  let newMinter: string
  let spender: string
  let balance: string
  let contracts: TestContractHandler
  let nftDatatoken: NFTDataToken
  let nftFactory : NFTFactory
  let erc20Factory: DT20Factory
  let tokenAddress: string
  const tokenAmount = '100'
  const blob = 'https://example.com/dataset-1'

  // TODO: complete NFT Datatoken unit test
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
    minter = contracts.accounts[0]
    spender = contracts.accounts[1]
    newMinter = contracts.accounts[2]
    await contracts.deployContracts(minter)
    

   
  })

  it('should initialize datatokens class', async () => {
    console.log(contracts.factory721Address)
    console.log(contracts.template721Address)
    console.log(contracts.metadataAddress)
    console.log(contracts.factory20Address)
    console.log(contracts.template20Address)
    nftFactory = new NFTFactory(
      contracts.factory721Address,
      ERC721Factory.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    nftDatatoken = new NFTDataToken(
      contracts.template721Address,
      ERC721Factory.abi as AbiItem[],
      ERC721Template.abi as AbiItem[],
      web3,
      LoggerInstance
    )

    erc20Factory = new DT20Factory(
      contracts.factory20Address,
      ERC20Factory.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    const data = web3.utils.asciiToHex('SomeData');
    const flags = web3.utils.asciiToHex('f8929916089218bdb4aa78c3ecd16633afd44b8aef89299160');
      //console.log(nftDatatoken)
     // console.log(web3.eth.accounts)
     const result = await nftFactory.getCurrentTemplateCount()
     console.log(result.toString())
    await erc20Factory.setERC721Factory(minter,contracts.factory721Address)
    //  console.log(nftFactory)
    const result1 = await nftFactory.addTokenTemplate(minter,contracts.template20Address)
    console.log(result1)
    const result2 = await nftFactory.getCurrentTemplateCount()
     console.log(result2.toString())
     await nftFactory.createNFT(minter, data, flags)
    //assert(nftDatatoken !== null)
  })

  
  })