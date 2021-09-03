import { DDO } from '../ddo/DDO';
import DID from '../ocean/DID';
import { Logger } from '../utils';
import { WebServiceConnector } from '../ocean/utils/WebServiceConnector';
import { Metadata, ValidateMetadata } from '../ddo/interfaces';
export interface QueryResult {
    results: DDO[];
    page: number;
    totalPages: number;
    totalResults: number;
}
export interface SearchQuery {
    offset?: number;
    page?: number;
    query: {
        match?: {
            [property: string]: string | number | boolean | Record<string, string | number | boolean>;
        };
        query_string?: {
            [property: string]: string | number | string[] | number[] | boolean;
        };
        simple_query_string?: {
            [property: string]: string | number | string[] | number[] | boolean;
        };
    };
    sort?: {
        [jsonPath: string]: number;
    };
}
export declare class MetadataCache {
    fetch: WebServiceConnector;
    private logger;
    private metadataCacheUri;
    private get url();
    constructor(metadataCacheUri: string, logger: Logger);
    getVersionInfo(): Promise<any>;
    getAccessUrl(accessToken: any, payload: any): Promise<string>;
    queryMetadata(query: SearchQuery): Promise<QueryResult>;
    storeDDO(ddo: DDO): Promise<DDO>;
    encryptDDO(ddo: any): Promise<any>;
    validateMetadata(metadata: Metadata | DDO): Promise<ValidateMetadata>;
    retrieveDDO(did: DID | string, metadataServiceEndpoint?: string): Promise<DDO>;
    retrieveDDOByUrl(metadataServiceEndpoint?: string): Promise<DDO>;
    transferOwnership(did: DID | string, newOwner: string, updated: string, signature: string): Promise<string>;
    getOwnerAssets(owner: string): Promise<QueryResult>;
    retire(did: DID | string, updated: string, signature: string): Promise<string>;
    getServiceEndpoint(did: DID): string;
    getURI(): string;
    private transformResult;
}
