var Triarc;
(function (Triarc) {
    var RemoteDataStore;
    (function (_RemoteDataStore) {
        "use strict";
        var LocalDataStorage = (function () {
            function LocalDataStorage() {
            }
            LocalDataStorage.prototype.remove = function (key) {
                localStorage.removeItem(key);
            };
            LocalDataStorage.prototype.get = function (key) {
                var item = localStorage.getItem(key);
                if (item !== null) {
                    try {
                        return angular.fromJson(item);
                    }
                    catch (e) {
                    }
                }
                return null;
            };
            LocalDataStorage.prototype.set = function (key, storageItem) {
                if (!angular.isDate(storageItem.creationDate)) {
                    storageItem.creationDate = new Date();
                }
                var item = localStorage.getItem(key);
                if (item == null) {
                    this.addNew(key, storageItem);
                }
                else {
                    try {
                        var fromJson = angular.fromJson(item);
                        if (angular.isObject(fromJson)) {
                            fromJson.localUpdateDate = new Date();
                            fromJson.data = storageItem.data;
                            fromJson.eTag = storageItem.eTag;
                            this.setItem(key, fromJson);
                        }
                        else {
                            // todo log
                            this.addNew(key, storageItem);
                        }
                    }
                    catch (e) {
                        // todo log
                        this.addNew(key, storageItem);
                    }
                }
            };
            LocalDataStorage.prototype.addNew = function (key, storageItem) {
                storageItem.localUpdateDate = new Date();
                this.setItem(key, storageItem);
            };
            LocalDataStorage.prototype.setItem = function (key, storageItem) {
                var json = angular.toJson(storageItem, false);
                localStorage.setItem(key, json);
            };
            return LocalDataStorage;
        })();
        _RemoteDataStore.LocalDataStorage = LocalDataStorage;
        var WebSqlDataStorage = (function () {
            function WebSqlDataStorage() {
            }
            WebSqlDataStorage.prototype.remove = function (key) {
            };
            WebSqlDataStorage.prototype.get = function (url) {
                return null;
            };
            WebSqlDataStorage.prototype.set = function (key, storageItem) {
            };
            return WebSqlDataStorage;
        })();
        _RemoteDataStore.WebSqlDataStorage = WebSqlDataStorage;
        (function (DataStorageType) {
            DataStorageType[DataStorageType["LocalStorage"] = 0] = "LocalStorage";
            DataStorageType[DataStorageType["WebSql"] = 1] = "WebSql";
        })(_RemoteDataStore.DataStorageType || (_RemoteDataStore.DataStorageType = {}));
        var DataStorageType = _RemoteDataStore.DataStorageType;
        var RemoteDataStore = (function () {
            function RemoteDataStore($http, $q, $requestSender) {
                this.$http = $http;
                this.$q = $q;
                this.$requestSender = $requestSender;
                this._transactions = [];
                this._dataStorage = new LocalDataStorage();
            }
            RemoteDataStore.prototype.get = function (dataRequest, getOptions) {
                var _this = this;
                var defer = this.$q.defer();
                var loadedHandler = angular.noop;
                var changedHandler = angular.noop;
                if (angular.isObject(getOptions)) {
                    if (angular.isFunction(getOptions.changed))
                        changedHandler = getOptions.changed;
                }
                var startTime = new Date();
                var storageItem = this.getLocal(dataRequest);
                if (storageItem == null) {
                    var reqPromise = this.$requestSender.requestValue(dataRequest);
                    return this.updateStore(dataRequest, reqPromise).then(function (r) {
                        _this._transactions.push({
                            dataRequest: dataRequest,
                            ended: new Date(),
                            result: r,
                            source: "initial server",
                            started: startTime,
                            storageItem: _this.getLocal(dataRequest)
                        });
                        return r;
                    }, function (e) { return e; });
                }
                else {
                    var response = new Triarc.Data.DataResponse(storageItem.data, 0 /* Success */);
                    defer.resolve(response);
                    // todo start triggering update
                    var reqPromise = this.$requestSender.requestValue(dataRequest);
                    this._transactions.push({
                        dataRequest: dataRequest,
                        ended: new Date(),
                        result: response,
                        source: "local",
                        started: startTime,
                        storageItem: storageItem
                    });
                    this.updateStore(dataRequest, reqPromise).then(function (p) {
                        _this._transactions.push({
                            dataRequest: dataRequest,
                            ended: new Date(),
                            result: p,
                            source: "update server",
                            started: startTime,
                            storageItem: _this.getLocal(dataRequest)
                        });
                        changedHandler(p.data);
                    }, function (err) {
                        // todo
                    });
                }
                return defer.promise;
            };
            RemoteDataStore.prototype.getLocal = function (dataRequest) {
                return this._dataStorage.get(this.getKey(dataRequest));
            };
            RemoteDataStore.prototype.removeLocal = function (dataRequest) {
                return this._dataStorage.remove(this.getKey(dataRequest));
            };
            RemoteDataStore.prototype.getTransactions = function () {
                return this._transactions;
            };
            RemoteDataStore.prototype.getKey = function (dataRequest) {
                // todo add post support
                return dataRequest.url;
            };
            RemoteDataStore.prototype.setDataStorage = function (dataStorage) {
                if (dataStorage == 0 /* LocalStorage */) {
                    this._dataStorage = new LocalDataStorage();
                }
                else {
                    this._dataStorage = new WebSqlDataStorage();
                }
            };
            RemoteDataStore.prototype.enqueueRequest = function (request, requestOptions) {
            };
            RemoteDataStore.prototype.updateStore = function (dataRequest, reqPromise) {
                var _this = this;
                return reqPromise.then(function (req) {
                    if (req.isSuccessful()) {
                        _this.storeData(RemoteDataStore.getKey(dataRequest), req);
                    }
                    else {
                    }
                    return req;
                }, function (err) {
                    return err;
                    // todo define
                });
            };
            RemoteDataStore.getKey = function (dataRequest) {
                // todo check verb
                if (dataRequest.method.toUpperCase() == "GET") {
                    return dataRequest.url;
                }
                else {
                    throw "not supported http verb for remote storage";
                }
            };
            RemoteDataStore.prototype.storeData = function (key, response) {
                var storageItem = {
                    creationDate: new Date(),
                    data: response.data,
                    eTag: response.httpReponse.headers["etag"],
                    localUpdateDate: new Date()
                };
                this._dataStorage.set(key, storageItem);
            };
            RemoteDataStore.serviceId = "$remoteData";
            RemoteDataStore.$inject = ["$http", "$q", "$requestSender"];
            return RemoteDataStore;
        })();
        _RemoteDataStore.RemoteDataStore = RemoteDataStore;
        var tlRemoteDataStoreModule = angular.module("tlRemoteDataStore", ["tlDataServices"]);
        tlRemoteDataStoreModule.service(RemoteDataStore.serviceId, RemoteDataStore);
    })(RemoteDataStore = Triarc.RemoteDataStore || (Triarc.RemoteDataStore = {}));
})(Triarc || (Triarc = {}));

