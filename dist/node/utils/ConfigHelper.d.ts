import Config from '../models/Config';
export interface ConfigHelperConfig extends Config {
    networkId: number;
    network: string;
    subgraphUri: string;
    explorerUri: string;
    oceanTokenSymbol: string;
}
export declare const configHelperNetworks: ConfigHelperConfig[];
export declare class ConfigHelper {
    getAddressesFromEnv(network: string): Partial<ConfigHelperConfig>;
    getConfig(network: string | number, infuraProjectId?: string): Config;
}
