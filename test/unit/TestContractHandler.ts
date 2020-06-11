import { Contract } from 'web3-eth-contract'

const Web3 = require('web3')
const web3 = new Web3("http://127.0.0.1:8545")

export class TestContractHandler {
    public factory: Contract
    public template: Contract
    public accounts: string[]
    public factoryAddress: string
    public templateAddress: string

    constructor(
        factoryABI: object,
        datatokensABI: object
    ){
	    this.factory = new web3.eth.Contract(factoryABI)
	    this.template = new web3.eth.Contract(datatokensABI)
    }

    public async getAccounts() {
        this.accounts = await web3.eth.getAccounts()
    }
 
	public async deployContracts(minter: string) {
        let estGas

        let blob = 'https://example.com/dataset-1'
        let cap = 1400000000

        // Deploy Template
        let templateBytecode = "0x60806040526000600360006101000a81548160ff0219169083151502179055506000600360016101000a81548160ff0219169083151502179055503480156200004757600080fd5b5060405162002b0838038062002b08833981018060405260a08110156200006d57600080fd5b8101908080516401000000008111156200008657600080fd5b828101905060208101848111156200009d57600080fd5b8151856001820283011164010000000082111715620000bb57600080fd5b50509291906020018051640100000000811115620000d857600080fd5b82810190506020810184811115620000ef57600080fd5b81518560018202830111640100000000821117156200010d57600080fd5b5050929190602001805190602001909291908051906020019092919080516401000000008111156200013e57600080fd5b828101905060208101848111156200015557600080fd5b81518560018202830111640100000000821117156200017357600080fd5b5050929190505050620001998585858585620001a5640100000000026401000000009004565b505050505050620004b2565b60008073ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1614156200022e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603081526020018062002a856030913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff16600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614620002d7576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602f81526020018062002ad9602f913960400191505060405180910390fd5b6000831162000332576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602481526020018062002ab56024913960400191505060405180910390fd5b60006008819055508260078190555085600490805190602001906200035992919062000403565b5081600690805190602001906200037292919062000403565b5084600590805190602001906200038b92919062000403565b5083600960006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506001600360016101000a81548160ff021916908315150217905550600360019054906101000a900460ff16905095945050505050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200044657805160ff191683800117855562000477565b8280016001018555821562000477579182015b828111156200047657825182559160200191906001019062000459565b5b5090506200048691906200048a565b5090565b620004af91905b80821115620004ab57600081600090555060010162000491565b5090565b90565b6125c380620004c26000396000f3fe608060405260043610610147576000357c01000000000000000000000000000000000000000000000000000000009004806340c10f19116100c8578063a9059cbb1161008c578063a9059cbb14610821578063aa271e1a14610894578063b187bd26146108fd578063dd62ed3e1461092c578063fca3b5aa146109b1578063fde0e7a814610a0257610147565b806340c10f191461065457806370a08231146106a25780638456cb591461070757806395d89b411461071e578063a457c2d7146107ae57610147565b8063313ce5671161010f578063313ce56714610545578063355274ea14610570578063392e53cd1461059b57806339509351146105ca5780633f4ba83a1461063d57610147565b806306fdde031461014c578063095ea7b3146101dc5780630a6f3d9b1461024f57806318160ddd1461048757806323b872dd146104b2575b600080fd5b34801561015857600080fd5b50610161610a92565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156101a1578082015181840152602081019050610186565b50505050905090810190601f1680156101ce5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156101e857600080fd5b50610235600480360360408110156101ff57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610b34565b604051808215151515815260200191505060405180910390f35b34801561025b57600080fd5b5061046d600480360360a081101561027257600080fd5b810190808035906020019064010000000081111561028f57600080fd5b8201836020820111156102a157600080fd5b803590602001918460018302840111640100000000831117156102c357600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505091929192908035906020019064010000000081111561032657600080fd5b82018360208201111561033857600080fd5b8035906020019184600183028401116401000000008311171561035a57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190803590602001906401000000008111156103e757600080fd5b8201836020820111156103f957600080fd5b8035906020019184600183028401116401000000008311171561041b57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610bae565b604051808215151515815260200191505060405180910390f35b34801561049357600080fd5b5061049c610c2e565b6040518082815260200191505060405180910390f35b3480156104be57600080fd5b5061052b600480360360608110156104d557600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610c38565b604051808215151515815260200191505060405180910390f35b34801561055157600080fd5b5061055a610cb4565b6040518082815260200191505060405180910390f35b34801561057c57600080fd5b50610585610cbe565b6040518082815260200191505060405180910390f35b3480156105a757600080fd5b506105b0610cc8565b604051808215151515815260200191505060405180910390f35b3480156105d657600080fd5b50610623600480360360408110156105ed57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610cdf565b604051808215151515815260200191505060405180910390f35b34801561064957600080fd5b50610652610d59565b005b6106a06004803603604081101561066a57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610e81565b005b3480156106ae57600080fd5b506106f1600480360360208110156106c557600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505061102c565b6040518082815260200191505060405180910390f35b34801561071357600080fd5b5061071c611074565b005b34801561072a57600080fd5b5061073361119d565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610773578082015181840152602081019050610758565b50505050905090810190601f1680156107a05780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156107ba57600080fd5b50610807600480360360408110156107d157600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061123f565b604051808215151515815260200191505060405180910390f35b34801561082d57600080fd5b5061087a6004803603604081101561084457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506112b9565b604051808215151515815260200191505060405180910390f35b3480156108a057600080fd5b506108e3600480360360208110156108b757600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611333565b604051808215151515815260200191505060405180910390f35b34801561090957600080fd5b5061091261138d565b604051808215151515815260200191505060405180910390f35b34801561093857600080fd5b5061099b6004803603604081101561094f57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506113a4565b6040518082815260200191505060405180910390f35b3480156109bd57600080fd5b50610a00600480360360208110156109d457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505061142b565b005b348015610a0e57600080fd5b50610a1761157b565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610a57578082015181840152602081019050610a3c565b50505050905090810190601f168015610a845780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b606060048054600181600116156101000203166002900480601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610b2a5780601f10610aff57610100808354040283529160200191610b2a565b820191906000526020600020905b815481529060010190602001808311610b0d57829003601f168201915b5050505050905090565b6000600360009054906101000a900460ff1615610b9c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b610ba6838361161d565b905092915050565b6000600360019054906101000a900460ff1615610c16576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260358152602001806123d36035913960400191505060405180910390fd5b610c23868686868661163b565b905095945050505050565b6000600254905090565b6000600360009054906101000a900460ff1615610ca0576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b610cab84848461188d565b90509392505050565b6000600854905090565b6000600754905090565b6000600360019054906101000a900460ff16905090565b6000600360009054906101000a900460ff1615610d47576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b610d518383611966565b905092915050565b600360009054906101000a900460ff16610dbe576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603081526020018061251f6030913960400191505060405180910390fd5b600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610e64576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260218152602001806124086021913960400191505060405180910390fd5b6000600360006101000a81548160ff021916908315150217905550565b600360009054906101000a900460ff1615610ee7576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610f8d576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260218152602001806124086021913960400191505060405180910390fd5b600754610faa82610f9c610c2e565b611a1990919063ffffffff16565b111561101e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601f8152602001807f44617461546f6b656e54656d706c6174653a206361702065786365656465640081525060200191505060405180910390fd5b6110288282611aa1565b5050565b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b600360009054906101000a900460ff16156110da576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614611180576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260218152602001806124086021913960400191505060405180910390fd5b6001600360006101000a81548160ff021916908315150217905550565b606060058054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156112355780601f1061120a57610100808354040283529160200191611235565b820191906000526020600020905b81548152906001019060200180831161121857829003601f168201915b5050505050905090565b6000600360009054906101000a900460ff16156112a7576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b6112b18383611c5c565b905092915050565b6000600360009054906101000a900460ff1615611321576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b61132b8383611d29565b905092915050565b60008173ffffffffffffffffffffffffffffffffffffffff16600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16149050919050565b6000600360009054906101000a900460ff16905090565b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b600360009054906101000a900460ff1615611491576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180612385602c913960400191505060405180910390fd5b600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614611537576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260218152602001806124086021913960400191505060405180910390fd5b80600960006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b606060068054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156116135780601f106115e857610100808354040283529160200191611613565b820191906000526020600020905b8154815290600101906020018083116115f657829003601f168201915b5050505050905090565b600061163161162a611d47565b8484611d4f565b6001905092915050565b60008073ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1614156116c2576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603081526020018061244f6030913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff16600960009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614611769576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602f8152602001806124cb602f913960400191505060405180910390fd5b600083116117c2576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602481526020018061247f6024913960400191505060405180910390fd5b60006008819055508260078190555085600490805190602001906117e79291906122bc565b5081600690805190602001906117fe9291906122bc565b5084600590805190602001906118159291906122bc565b5083600960006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506001600360016101000a81548160ff021916908315150217905550600360019054906101000a900460ff16905095945050505050565b600061189a848484611f46565b61195b846118a6611d47565b611956856040518060600160405280602881526020016124a360289139600160008b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600061190c611d47565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546121fc9092919063ffffffff16565b611d4f565b600190509392505050565b6000611a0f611973611d47565b84611a0a8560016000611984611d47565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008973ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054611a1990919063ffffffff16565b611d4f565b6001905092915050565b600080828401905083811015611a97576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601b8152602001807f536166654d6174683a206164646974696f6e206f766572666c6f77000000000081525060200191505060405180910390fd5b8091505092915050565b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415611b44576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601f8152602001807f45524332303a206d696e7420746f20746865207a65726f20616464726573730081525060200191505060405180910390fd5b611b5981600254611a1990919063ffffffff16565b600281905550611bb0816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054611a1990919063ffffffff16565b6000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b6000611d1f611c69611d47565b84611d1a856040518060600160405280602581526020016125736025913960016000611c93611d47565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008a73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546121fc9092919063ffffffff16565b611d4f565b6001905092915050565b6000611d3d611d36611d47565b8484611f46565b6001905092915050565b600033905090565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415611dd5576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602481526020018061254f6024913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415611e5b576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806123b16022913960400191505060405180910390fd5b80600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925836040518082815260200191505060405180910390a3505050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415611fcc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260258152602001806124fa6025913960400191505060405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415612052576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260238152602001806123626023913960400191505060405180910390fd5b6120bd81604051806060016040528060268152602001612429602691396000808773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546121fc9092919063ffffffff16565b6000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550612150816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054611a1990919063ffffffff16565b6000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a3505050565b60008383111582906122a9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561226e578082015181840152602081019050612253565b50505050905090810190601f16801561229b5780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b5060008385039050809150509392505050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106122fd57805160ff191683800117855561232b565b8280016001018555821561232b579182015b8281111561232a57825182559160200191906001019061230f565b5b509050612338919061233c565b5090565b61235e91905b8082111561235a576000816000905550600101612342565b5090565b9056fe45524332303a207472616e7366657220746f20746865207a65726f206164647265737345524332305061757361626c653a207468697320746f6b656e20636f6e74726163742069732070617573656445524332303a20617070726f766520746f20746865207a65726f206164647265737344617461546f6b656e54656d706c6174653a20746f6b656e20696e7374616e636520616c726561647920696e697469616c697a656444617461546f6b656e54656d706c6174653a20696e76616c6964206d696e74657245524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e636544617461546f6b656e54656d706c6174653a20496e76616c6964206d696e7465722c20207a65726f206164647265737344617461546f6b656e54656d706c6174653a20496e76616c6964206361702076616c756545524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e636544617461546f6b656e54656d706c6174653a20496e76616c6964206d696e7465722c207a65726f206164647265737345524332303a207472616e736665722066726f6d20746865207a65726f206164647265737345524332305061757361626c653a207468697320746f6b656e20636f6e7472616374206973206e6f742070617573656445524332303a20617070726f76652066726f6d20746865207a65726f206164647265737345524332303a2064656372656173656420616c6c6f77616e63652062656c6f77207a65726fa165627a7a72305820cb935813b86dca206b416693f24e646300f651bfdb0df08b80e68f17d10455a2002944617461546f6b656e54656d706c6174653a20496e76616c6964206d696e7465722c20207a65726f206164647265737344617461546f6b656e54656d706c6174653a20496e76616c6964206361702076616c756544617461546f6b656e54656d706c6174653a20496e76616c6964206d696e7465722c207a65726f2061646472657373"
        // get est gascost
        estGas =  await this.template.deploy({
                           data:templateBytecode, 
                           arguments:['Template Contract', 'TEMPLATE', minter, cap, blob]
                          })                       
                          .estimateGas(function(err, estGas){
                                return estGas
                          })
        // deploy the contract and get it's address
        this.templateAddress = await this.template.deploy({
                           data:templateBytecode, 
                           arguments:['Template Contract', 'TEMPLATE', minter, cap, blob]
                           })
                           .send({
                               from: minter,
                               gas: estGas+1,
                               gasPrice: '12345678'
                           })
                           .then(function(contract){
                                return contract.options.address
                           })
        // Deploy Factory
        let factoryBytecode = "0x60806040526001805534801561001457600080fd5b50604051602080610ff08339810180604052602081101561003457600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100cb576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180610fc4602c913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050610ea98061011b6000396000f3fe608060405234801561001057600080fd5b506004361061005e576000357c01000000000000000000000000000000000000000000000000000000009004806345576f94146100635780637a36b3ee1461015e578063e939567914610329575b600080fd5b61011c6004803603602081101561007957600080fd5b810190808035906020019064010000000081111561009657600080fd5b8201836020820111156100a857600080fd5b803590602001918460018302840111640100000000831117156100ca57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505091929192905050506103d0565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6102ae6004803603604081101561017457600080fd5b810190808035906020019064010000000081111561019157600080fd5b8201836020820111156101a357600080fd5b803590602001918460018302840111640100000000831117156101c557600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505091929192908035906020019064010000000081111561022857600080fd5b82018360208201111561023a57600080fd5b8035906020019184600183028401116401000000008311171561025c57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610b29565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156102ee5780820151818401526020810190506102d3565b50505050905090810190601f16801561031b5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6103556004803603602081101561033f57600080fd5b8101908080359060200190929190505050610bf1565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561039557808201518184015260208101905061037a565b50505050905090810190601f1680156103c25780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b60006103fc6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff16610d40565b9050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161415610484576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526038815260200180610e466038913960400191505060405180910390fd5b60606104cf6040518060400160405280600281526020017f44540000000000000000000000000000000000000000000000000000000000008152506104ca600154610bf1565b610b29565b9050606081905060008390508073ffffffffffffffffffffffffffffffffffffffff16630a6f3d9b8484337fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8a6040518663ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018080602001806020018673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200185815260200180602001848103845289818151815260200191508051906020019080838360005b838110156105c75780820151818401526020810190506105ac565b50505050905090810190601f1680156105f45780820380516001836020036101000a031916815260200191505b50848103835288818151815260200191508051906020019080838360005b8381101561062d578082015181840152602081019050610612565b50505050905090810190601f16801561065a5780820380516001836020036101000a031916815260200191505b50848103825285818151815260200191508051906020019080838360005b83811015610693578082015181840152602081019050610678565b50505050905090810190601f1680156106c05780820380516001836020036101000a031916815260200191505b5098505050505050505050602060405180830381600087803b1580156106e557600080fd5b505af11580156106f9573d6000803e3d6000fd5b505050506040513d602081101561070f57600080fd5b8101908080519060200190929190505050508073ffffffffffffffffffffffffffffffffffffffff1663392e53cd6040518163ffffffff167c010000000000000000000000000000000000000000000000000000000002815260040160206040518083038186803b15801561078357600080fd5b505afa158015610797573d6000803e3d6000fd5b505050506040513d60208110156107ad57600080fd5b8101908080519060200190929190505050610813576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602c815260200180610e1a602c913960400191505060405180910390fd5b7fb51c8cbe199ffe8b0d1d39b62d473569750653cb18b165f77ae423b3900180ad846000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1685604051808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200180602001828103825283818151815260200191508051906020019080838360005b838110156108fc5780820151818401526020810190506108e1565b50505050905090810190601f1680156109295780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a1816040518082805190602001908083835b6020831061096c5780518252602082019150602081019050602083039250610949565b6001836020036101000a0380198251168184511680821785525050505050509050019150506040518091039020836040518082805190602001908083835b602083106109cd57805182526020820191506020810190506020830392506109aa565b6001836020036101000a03801982511681845116808217855250505050505090500191505060405180910390208573ffffffffffffffffffffffffffffffffffffffff167f5242aec5021ca3b80047b99ba11a4f6ee963561e3ca5c01854964affbf18c0897fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff33438b604051808581526020018473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610ad4578082015181840152602081019050610ab9565b50505050905090810190601f168015610b015780820380516001836020036101000a031916815260200191505b509550505050505060405180910390a460018060008282540192505081905550505050919050565b606082826040516020018083805190602001908083835b60208310610b635780518252602082019150602081019050602083039250610b40565b6001836020036101000a03801982511681845116808217855250505050505090500182805190602001908083835b60208310610bb45780518252602082019150602081019050602083039250610b91565b6001836020036101000a03801982511681845116808217855250505050505090500192505050604051602081830303815290604052905092915050565b60606000821415610c39576040518060400160405280600181526020017f30000000000000000000000000000000000000000000000000000000000000008152509050610d3b565b600082905060005b60008214610c63578080600101915050600a8281610c5b57fe5b049150610c41565b6060816040519080825280601f01601f191660200182016040528015610c985781602001600182028038833980820191505090505b50905060006001830390508593505b60008414610d3357600a8481610cb957fe5b066030017f01000000000000000000000000000000000000000000000000000000000000000282828060019003935081518110610cf257fe5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a905350600a8481610d2b57fe5b049350610ca7565b819450505050505b919050565b600080826c010000000000000000000000000290506040517f3d602d80600a3d3981f3363d3d373d3d3d363d7300000000000000000000000081528160148201527f5af43d82803e903d91602b57fd5bf3000000000000000000000000000000000060288201526037816000f09250507f117c72e6c25f0a072e36e148df71468ce2f3dbe7defec5b2c257a6e3eb65278c82604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390a15091905056fe466163746f72793a20556e61626c6520746f20696e697469616c697a6520746f6b656e20696e7374616e6365466163746f72793a204661696c656420746f20706572666f726d206d696e696d616c206465706c6f79206f662061206e657720746f6b656ea165627a7a723058208661a4f1759a51204c39e8e7507448b81499f1f9e035fda3f65d9daaadaa2c1c0029466163746f72793a20496e76616c696420546f6b656e466163746f727920696e697469616c697a6174696f6e"
        estGas = await this.factory.deploy({
                           data:factoryBytecode, 
                           arguments:[this.templateAddress]
                           })
                          .estimateGas(function(err, estGas){
                                return estGas
                          })
        // deploy the contract and get it's address
        this.factoryAddress = await this.factory.deploy({
                           data:factoryBytecode, 
                           arguments:[this.templateAddress]
                           })
                           .send({
                               from: minter,
                               gas: estGas+1,
                               gasPrice: '12345678'
                           })
                           .then(function(contract){
                                return contract.options.address
                           })
    }
}