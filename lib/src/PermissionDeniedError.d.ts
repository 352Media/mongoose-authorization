/// <reference types="node" />
declare const _default: {
    new (action: any, fields?: any): {
        name: string;
        message: string;
        stack?: string;
    };
    captureStackTrace(targetObject: Object, constructorOpt?: Function): void;
    prepareStackTrace?: (err: Error, stackTraces: NodeJS.CallSite[]) => any;
    stackTraceLimit: number;
};
export = _default;
