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
import { DT20Factory } from '../../../src/factories/DT20Factory'

const web3 = new Web3('http://127.0.0.1:8545')

describe('DT20 Factory test', () => {
  let factoryOwner: string
  let user1: string
  let user2: string
  let contracts: TestContractHandler
  let erc20Factory: DT20Factory

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
    user1 = contracts.accounts[1]
    user2 = contracts.accounts[2]
    await contracts.deployContracts(factoryOwner)
  })

  it('should initialize a new DT20Factory', async () => {
    erc20Factory = new DT20Factory(contracts.factory20Address, web3, LoggerInstance)
  })

  it('#setERC721Factory - should fail to set the ERC721 Factory address if factoryOwner', async () => {
    assert(
      (await erc20Factory.setERC721Factory(user1, contracts.factory721Address)) == null
    )
  })

  it('#setERC721Factory - should set the ERC721 Factory address if factoryOwner', async () => {
    assert(
      (await erc20Factory.getNFTFactory()) == '0x0000000000000000000000000000000000000000'
    )

    await erc20Factory.setERC721Factory(factoryOwner, contracts.factory721Address)
    assert((await erc20Factory.getNFTFactory()) == contracts.factory721Address)
  })

  it('#getCurrentTokenCount - should succeed to use view function', async () => {
    assert((await erc20Factory.getCurrentTokenCount()) == 1) // fix in contracts, let's start from zero and not one
  })

  it('#getCurrentTemplateCount - should succed to use view function', async () => {
    assert((await erc20Factory.getCurrentTemplateCount()) == 1)
  })

  it('#getTokenTemplate - should succeed to use view function', async () => {
    assert(
      (await erc20Factory.getTokenTemplate(1)).templateAddress ==
        contracts.template20Address
    )
    assert((await erc20Factory.getTokenTemplate(1)).isActive == true)
  })

  it('#addTokenTemplate - should fail to add a new ERC20 Template, if NOT factory Owner', async () => {
    assert(
      (await erc20Factory.addTokenTemplate(user1, contracts.template20Address)) == null
    )
  })

  it('#addTokenTemplate - should succeed to add a new ERC20 Template, if factory Owner', async () => {
    assert((await erc20Factory.getCurrentTemplateCount()) == 1)

    await erc20Factory.addTokenTemplate(factoryOwner, contracts.template20Address)
    assert((await erc20Factory.getCurrentTemplateCount()) == 2)

    assert(
      (await erc20Factory.getTokenTemplate(2)).templateAddress ==
        contracts.template20Address
    )
    assert((await erc20Factory.getTokenTemplate(2)).isActive == true)
  })

  it('#disableTokenTemplate - should fail to disable a new ERC20 Template, if factory Owner', async () => {
    assert((await erc20Factory.disableTokenTemplate(user1, 2)) == null)
  })

  it('#disableTokenTemplate - should succeed to disable a ERC20 Template, if factory Owner', async () => {
    assert((await erc20Factory.getTokenTemplate(2)).isActive == true)
    await erc20Factory.disableTokenTemplate(factoryOwner, 2)
    assert((await erc20Factory.getTokenTemplate(2)).isActive == false)
  })

  it('#reactivateTokenTemplate - should fail to reactivate a new ERC20 Template, if NOT factory Owner', async () => {
    assert((await erc20Factory.reactivateTokenTemplate(user1, 2)) == null)
  })

  it('#reactivateTokenTemplate - should succeed to reactivate a previously disabled ERC20 Template, if factory Owner', async () => {
    assert((await erc20Factory.getTokenTemplate(2)).isActive == false)
    await erc20Factory.reactivateTokenTemplate(factoryOwner, 2)
    assert((await erc20Factory.getTokenTemplate(2)).isActive == true)
  })
})
