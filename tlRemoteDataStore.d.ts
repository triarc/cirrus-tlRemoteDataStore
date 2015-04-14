declare module Triarc.RemoteDataStore {
    interface IConflictResult<T> {
        reject?: boolean;
        resolveObject?: T;
        accept?: boolean;
    }
    interface IConflict<T> {
        local: IStorageItem<T>;
        remote: IStorageItem<T>;
    }
    interface IGetOptions<T> {
        changed?(update: T): void;
        conflict?(conflic: IConflict<T>): IConflictResult<T>;
    }
    interface IRequestOptions<T> {
        success(T: any): void;
        timeout(T: any): void;
        fail(T: any): void;
    }
    interface IDataStorage {
        get<T>(key: string): IStorageItem<T>;
        set<T>(key: string, storageItem: IStorageItem<T>): void;
        remove(key: string): any;
    }
    class LocalDataStorage implements IDataStorage {
        remove(key: string): void;
        get(key: string): any;
        set<T>(key: string, storageItem: IStorageItem<T>): void;
        private addNew<T>(key, storageItem);
        private setItem<T>(key, storageItem);
    }
    interface IStorageItem<T> {
        creationDate: Date;
        localUpdateDate: Date;
        eTag: string;
        data: T;
    }
    class WebSqlDataStorage implements IDataStorage {
        remove(key: string): void;
        get(url: string): any;
        set<T>(key: string, storageItem: IStorageItem<T>): void;
    }
    enum DataStorageType {
        LocalStorage = 0,
        WebSql = 1,
    }
    interface IDataTransaction {
        dataRequest: Triarc.Data.DataRequest<any>;
        storageItem: IStorageItem<any>;
        started: Date;
        ended: Date;
        result: Triarc.Data.DataResponse<any>;
        source: string;
    }
    class RemoteDataStore {
        private $http;
        private $q;
        static serviceId: string;
        static $inject: string[];
        private _dataStorage;
        private _transactions;
        constructor($http: ng.IHttpService, $q: ng.IQService);
        get<T>(dataRequest: Triarc.Data.DataRequest<T>, getOptions?: IGetOptions<T>): ng.IPromise<Triarc.Data.DataResponse<T>>;
        getLocal<T>(dataRequest: Triarc.Data.DataRequest<T>): IStorageItem<T>;
        removeLocal<T>(dataRequest: Data.DataRequest<T>): any;
        getTransactions<T>(): IDataTransaction[];
        private getKey<T>(dataRequest);
        private setDataStorage(dataStorage);
        enqueueRequest<TResult, TRequest extends Triarc.Data.DataRequest<any>>(request: (any) => ng.IPromise<TResult>, requestOptions: IRequestOptions<TRequest>): void;
        private updateStore<T>(dataRequest, reqPromise);
        private static getKey<T>(dataRequest);
        private storeData<T>(key, response);
    }
}
