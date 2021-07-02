import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { LoggerInstance } from '../../src/utils'
import Web3 from 'web3'
//import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import factory721ABI from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import nftDatatokenABI from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import { NFTDataToken } from '../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../src/factories/NFTFactory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('DataTokens', () => {
  let minter: string
  let newMinter: string
  let spender: string
  let balance: string
  let contracts: TestContractHandler
  let nftDatatoken: NFTDataToken
  let nftFactory : NFTFactory
  let tokenAddress: string
  const tokenAmount = '100'
  const blob = 'https://example.com/dataset-1'

  // TODO: update TestContractHandler for deploying v4 Contracts
  it('should deploy contracts', async () => {
    contracts = new TestContractHandler(
      factory721ABI as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      datatokensTemplate.bytecode,
      factory.bytecode,
      web3
    )
    await contracts.getAccounts()
    minter = contracts.accounts[0]
    spender = contracts.accounts[1]
    newMinter = contracts.accounts[2]
    await contracts.deployContracts(minter)
  })

  it('should initialize datatokens class', async () => {
    const accounts = await web3.eth.getAccounts()
    const owner = accounts[0]

    nftFactory = new NFTFactory(
      '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
      factory721ABI.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    nftDatatoken = new NFTDataToken(
      '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
      factory721ABI.abi as AbiItem[],
      nftDatatokenABI.abi as AbiItem[],
      web3,
      LoggerInstance
    )
      //console.log(nftDatatoken)
     // console.log(web3.eth.accounts)
     const result = await nftFactory.getCurrentTemplateCount()
     console.log(result)

    //  const result1 = await nftFactory.createNFT(owner,'0x0','0x0')
    //  console.log(result1)
    //assert(nftDatatoken !== null)
  })

  
  })