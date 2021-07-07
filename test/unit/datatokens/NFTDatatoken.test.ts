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

const web3 = new Web3('http://127.0.0.1:8545')

describe('NFTDatatoken', () => {
  let nftOwner: string
  let user1: string
  let user2: string
  let contracts: TestContractHandler
  let nftDatatoken: NFTDataToken
  let nftFactory: NFTFactory
  let erc20Factory: DT20Factory
  let nftAddress: string
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

  it('#createERC20 - should create a new ERC20 DT from NFT contract', async () => {
    await nftDatatoken.addERC20Deployer(nftAddress,nftOwner, nftOwner)
    const erc20Address = await nftDatatoken.createERC20(nftAddress,nftOwner, nftOwner,'10000')
    assert(erc20Address != null)
    console.log(erc20Address)
  })

  it('#addManager - should add a new Manager', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).manager == false)

    await nftDatatoken.addManager(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).manager == true)
  })

  it('#removeManager - should remove a Manager', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).manager == true)

    await nftDatatoken.removeManager(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).manager == false)
  })

  it('#executeCall - should call executeCall from Manager', async () => {
    const operation = 0
    const to = user2
    const value = '10'
    const data = web3.utils.asciiToHex('SomeData')

    await nftDatatoken.executeCall(nftAddress,nftOwner, operation, to, value, data)
  })

  it('#setNewData - should setNewData if Store updater', async () => {
    await nftDatatoken.addStoreUpdater(nftAddress,nftOwner, user1)

    await nftDatatoken.setNewData(nftAddress,user1, key, value)

    assert((await nftDatatoken.getData(nftAddress,key)) == value)
  })

  it('#cleanPermissions - should cleanPermissions if NFTOwner', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == true)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).manager == true)

    await nftDatatoken.cleanPermissions(nftAddress,nftOwner)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == false)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).manager == false)

    // NOW WE ReADD nftOwner as manager
    await nftDatatoken.addManager(nftAddress,nftOwner, nftOwner)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).manager == true)
  })

  it('#addStoreUpdater #removeStoreUpdater - should add and remove from Store Updater if Manager', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == false)

    await nftDatatoken.addStoreUpdater(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == true)

    await nftDatatoken.removeStoreUpdater(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == false)
  })

  it('#addERC20Deployer #removeERC20Deployer - should add and remove from ERC20deployer if Manager', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).deployERC20 == false)

    await nftDatatoken.addERC20Deployer(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).deployERC20 == true)

    await nftDatatoken.removeERC20Deployer(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).deployERC20 == false)
  })

  it('#addMetadataUpdate #removeMetadataUpdate - should add and remove from Metadata Updater if Manager', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).updateMetadata == false)

    await nftDatatoken.addMetadataUpdater(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).updateMetadata == true)

    await nftDatatoken.removeMetadataUpdater(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user1)).updateMetadata == false)
  })

  it('should succed to use view functions', async () => {
    assert((await nftDatatoken.getName(nftAddress)) == nftName)
    assert((await nftDatatoken.getSymbol(nftAddress)) == nftSymbol)
    assert((await nftDatatoken.getOwner(nftAddress)) == nftOwner)

    assert((await nftDatatoken.getPermissions(nftAddress,user2)).manager == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user2)).updateMetadata == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user2)).deployERC20 == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user2)).store == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user2)).v3Minter == false)

    assert((await nftDatatoken.getData(nftAddress,key)) == value)
  })

  // TODO: add function into NFTDatatoken for proposeMinter?
  it('it proposeMinter() for V3 Integration', async () => {
    // CREATE MOCK V3 DT WHERE NFT OWNER IS ALSO OWNER/MINTER
    v3ContractAddress = await new web3.eth.Contract(MockOldDT.abi as AbiItem[])
      .deploy({
        data: MockOldDT.bytecode,
        arguments: []
      })
      .send({
        from: nftOwner,
        gas: 5515515,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })
    console.log(v3ContractAddress)
    v3Contract = new web3.eth.Contract(MockOldDT.abi as AbiItem[], v3ContractAddress)

    // PROPOSE NFT ADDRESS AS MINTER
    await v3Contract.methods.proposeMinter(nftAddress).send({ from: nftOwner })
  })

  it('#wrapV3DT - nftOwner calls wrapV3DT and set himself as minter at the 721 level', async () => {
    await nftDatatoken.wrapV3DT(nftAddress,nftOwner, v3ContractAddress, nftOwner)
  })

  it('#mintV3DT - nftOwner has v3Minter permission and mint some V3ERC20 to user2', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).v3Minter == true)

    await nftDatatoken.mintV3DT(nftAddress,nftOwner, v3ContractAddress, user2, '10')

    assert(
      (await v3Contract.methods.balanceOf(user2).call()).toString() ==
        nftDatatoken.toWei('10')
    )
  })

  it('#addV3Minter - manager succeed to add a new V3 minter, then new v3Minter mints', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user2)).v3Minter == false)

    await nftDatatoken.addV3Minter(nftAddress,nftOwner, user2)

    assert((await nftDatatoken.getPermissions(nftAddress,user2)).v3Minter == true)

    await nftDatatoken.mintV3DT(nftAddress,user2, v3ContractAddress, user1, '10')

    assert(
      (await v3Contract.methods.balanceOf(user1).call()).toString() ==
        nftDatatoken.toWei('10')
    )
  })

  it('#removeV3Minter - manager succeed to remove a V3 minter', async () => {
    assert((await nftDatatoken.getPermissions(nftAddress,user2)).v3Minter == true)

    await nftDatatoken.removeV3Minter(nftAddress,nftOwner, user2)

    assert((await nftDatatoken.getPermissions(nftAddress,user2)).v3Minter == false)
  })

  it('#setDataV3 - v3 Minter should succed to set DataV3 (update metadata)', async () => {
    const keyV3 = web3.utils.keccak256(v3ContractAddress)
    const newValue = web3.utils.asciiToHex('SomeData')

    assert((await nftDatatoken.getData(nftAddress,keyV3)) == null)

    await nftDatatoken.setDataV3(nftAddress,nftOwner, v3ContractAddress, newValue, flags, data)

    assert((await nftDatatoken.getData(nftAddress,keyV3)) == newValue)
  })

  it('#transferNFT - should transfer the NFT and clean all permissions, set new owner as manager', async () => {
    await nftDatatoken.addManager(nftAddress,nftOwner, user2)
    await nftDatatoken.addMetadataUpdater(nftAddress,nftOwner, user1)
    await nftDatatoken.addStoreUpdater(nftAddress,user2, user1)
    await nftDatatoken.addERC20Deployer(nftAddress,user2, user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user2)).manager == true)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).manager == true)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).manager == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).updateMetadata == true)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == true)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).deployERC20 == true)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).v3Minter == true)

    assert((await nftDatatoken.getOwner(nftAddress)) == nftOwner)

    await nftDatatoken.transferNFT(nftAddress,nftOwner, user1)

    assert((await nftDatatoken.getOwner(nftAddress)) == user1)

    assert((await nftDatatoken.getPermissions(nftAddress,user2)).manager == false)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).manager == false)
    // NEW OWNER IS SET AS MANAGER WHEN TRANSFERRING
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).manager == true)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).updateMetadata == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).store == false)
    assert((await nftDatatoken.getPermissions(nftAddress,user1)).deployERC20 == false)
    assert((await nftDatatoken.getPermissions(nftAddress,nftOwner)).v3Minter == false)
  })
})
