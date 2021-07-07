import { assert } from 'chai'
import { AbiItem } from 'web3-utils/types'
import { TestRouterHandler } from '../../TestRouterHandler'
import { LoggerInstance } from '../../../src/utils'
import Web3 from 'web3'
import { Contract, ethers } from 'ethers'

import ForkTemplate from '@oceanprotocol/contracts/artifacts/contracts/oldV3Factory/BPool.sol/BPool.json'
import ForkFactory from '@oceanprotocol/contracts/artifacts/contracts/oldV3Factory/BFactory.sol/BFactory.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/factories/OceanPoolFactoryRouter.sol/OceanPoolFactoryRouter.json'
import { NFTDataToken } from '../../../src/datatokens/NFTDatatoken'
import { NFTFactory } from '../../../src/factories/NFTFactory'
import { DT20Factory } from '../../../src/factories/DT20Factory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Factory Router', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: TestRouterHandler
  let nftDatatoken: NFTDataToken
  let nftFactory: NFTFactory
  let erc20Factory: DT20Factory
  let newNFTAddress: string
  let v3ContractAddress: string
  let v3Contract

  
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
    contracts = new TestRouterHandler(
      ForkTemplate.abi as AbiItem[],
      ForkFactory.abi as AbiItem[],
      Router.abi as AbiItem[],
      ForkTemplate.bytecode,
      ForkFactory.bytecode,
      Router.bytecode,
      web3
    )
    await contracts.getAccounts()
    nftOwner = contracts.accounts[0]
    user1 = contracts.accounts[1]
    user2 = contracts.accounts[2]
    await contracts.deployContracts(nftOwner)
    

  
  })

  

 
})
