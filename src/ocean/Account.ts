import BigNumber from 'bignumber.js'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

/**
 * Account information.
 */
export default class Accounts extends Instantiable {
    private password?: string

    private token?: string

    constructor(private id: string = '0x0', config?: InstantiableConfig) {
        super()
        if (config) {
            this.setInstanceConfig(config)
        }
    }

    public getId() {
        return this.id
    }

    public setId(id) {
        this.id = id
    }

    /**
     * Set account password.
     * @param {string} password Password for account.
     */
    public setPassword(password: string): void {
        this.password = password
    }

    /**
     * Returns account password.
     * @return {string} Account password.
     */
    public getPassword(): string {
        return this.password
    }

    // TODO - Check with Samer if authentificate is still needed or we can use sign

    /**
     * Set account token.
     * @param {string} token Token for account.
     
    public setToken(token: string): void {
        this.token = token
    }
    */
    /**
     * Returns account token.
     * @return {Promise<string>} Account token.
     
    public async getToken(): Promise<string> {
        return this.token || this.ocean.auth.restore(this)
    }
    */

    /**
     * Returns if account token is stored.
     * @return {Promise<boolean>} Is stored.
     
    public isTokenStored(): Promise<boolean> {
        return this.ocean.auth.isStored(this)
    }
    */
    /**
     * Authenticate the account.
     
    public authenticate() {
        return this.ocean.auth.store(this)
    }
    */

    /**
     * Balance of Any Token.
     * @return {Promise<number>}
     */
    public async getTokenBalance(TokenAdress: string): Promise<number> {
        // TO DO
        return 0
    }

    /**
     * Symbol of a Token
     * @return {Promise<string>}
     */
    public async getTokenSymbol(TokenAdress: string): Promise<string> {
        // TO DO
        return ''
    }

    /**
     * Balance of Ether.
     * @return {Promise<number>}
     */
    public async getEtherBalance(): Promise<number> {
        // TO DO
        /* return this.web3.eth
            .getBalance(this.id, 'latest')
            .then((balance: string): number => {
                return new BigNumber(balance).toNumber()
            })
        */
        return 0
    }
}