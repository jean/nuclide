"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const inversify_1 = require("inversify");
const Observable_1 = require("rxjs/Observable");
const helpers_1 = require("../helpers");
const constants_1 = require("./constants");
const types_1 = require("./types");
let ProcessService = class ProcessService {
    constructor(decoder) {
        this.decoder = decoder;
    }
    execObservable(file, args, options = {}) {
        const encoding = options.encoding = typeof options.encoding === 'string' && options.encoding.length > 0 ? options.encoding : constants_1.DEFAULT_ENCODING;
        delete options.encoding;
        const spawnOptions = Object.assign({}, options);
        if (!spawnOptions.env || Object.keys(spawnOptions).length === 0) {
            spawnOptions.env = Object.assign({}, process.env);
        }
        // Always ensure we have unbuffered output.
        spawnOptions.env.PYTHONUNBUFFERED = '1';
        if (!spawnOptions.env.PYTHONIOENCODING) {
            spawnOptions.env.PYTHONIOENCODING = 'utf-8';
        }
        const proc = child_process_1.spawn(file, args, spawnOptions);
        let procExited = false;
        const output = new Observable_1.Observable(subscriber => {
            const disposables = [];
            const on = (ee, name, fn) => {
                ee.on(name, fn);
                disposables.push({ dispose: () => ee.removeListener(name, fn) });
            };
            if (options.token) {
                disposables.push(options.token.onCancellationRequested(() => {
                    if (!procExited && !proc.killed) {
                        proc.kill();
                        procExited = true;
                    }
                }));
            }
            const sendOutput = (source, data) => {
                const out = this.decoder.decode([data], encoding);
                if (source === 'stderr' && options.throwOnStdErr) {
                    subscriber.error(new types_1.StdErrError(out));
                }
                else {
                    subscriber.next({ source, out: out });
                }
            };
            on(proc.stdout, 'data', (data) => sendOutput('stdout', data));
            on(proc.stderr, 'data', (data) => sendOutput('stderr', data));
            proc.once('close', () => {
                procExited = true;
                subscriber.complete();
                disposables.forEach(disposable => disposable.dispose());
            });
            proc.once('error', ex => {
                procExited = true;
                subscriber.error(ex);
                disposables.forEach(disposable => disposable.dispose());
            });
        });
        return { proc, out: output };
    }
    exec(file, args, options = {}) {
        const encoding = options.encoding = typeof options.encoding === 'string' && options.encoding.length > 0 ? options.encoding : constants_1.DEFAULT_ENCODING;
        delete options.encoding;
        const spawnOptions = Object.assign({}, options);
        if (!spawnOptions.env || Object.keys(spawnOptions).length === 0) {
            spawnOptions.env = Object.assign({}, process.env);
        }
        // Always ensure we have unbuffered output.
        spawnOptions.env.PYTHONUNBUFFERED = '1';
        if (!spawnOptions.env.PYTHONIOENCODING) {
            spawnOptions.env.PYTHONIOENCODING = 'utf-8';
        }
        const proc = child_process_1.spawn(file, args, spawnOptions);
        const deferred = helpers_1.createDeferred();
        const disposables = [];
        const on = (ee, name, fn) => {
            ee.on(name, fn);
            disposables.push({ dispose: () => ee.removeListener(name, fn) });
        };
        if (options.token) {
            disposables.push(options.token.onCancellationRequested(() => {
                if (!proc.killed && !deferred.completed) {
                    proc.kill();
                }
            }));
        }
        const stdoutBuffers = [];
        on(proc.stdout, 'data', (data) => stdoutBuffers.push(data));
        const stderrBuffers = [];
        on(proc.stderr, 'data', (data) => {
            if (options.mergeStdOutErr) {
                stdoutBuffers.push(data);
                stderrBuffers.push(data);
            }
            else {
                stderrBuffers.push(data);
            }
        });
        proc.once('close', () => {
            if (deferred.completed) {
                return;
            }
            const stderr = stderrBuffers.length === 0 ? undefined : this.decoder.decode(stderrBuffers, encoding);
            if (stderr && stderr.length > 0 && options.throwOnStdErr) {
                deferred.reject(new types_1.StdErrError(stderr));
            }
            else {
                const stdout = this.decoder.decode(stdoutBuffers, encoding);
                deferred.resolve({ stdout, stderr });
            }
            disposables.forEach(disposable => disposable.dispose());
        });
        proc.once('error', ex => {
            deferred.reject(ex);
            disposables.forEach(disposable => disposable.dispose());
        });
        return deferred.promise;
    }
};
ProcessService = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(types_1.IBufferDecoder))
], ProcessService);
exports.ProcessService = ProcessService;
//# sourceMappingURL=proc.js.map