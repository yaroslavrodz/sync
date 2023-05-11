import mongoose, { Schema, Document } from "mongoose";

import { ConnectionType } from './connection-type.enum';

export interface IConnection {
    type: ConnectionType;
    database: {
        config: {
            host: string;
            port: string;
            user: string;
            password: string;
            database: string;
        },
        table: string;
    };
}

export interface IConnectionModel extends IConnection, Document { }

const Connection = new Schema({
    type: { type: String, enum: Object.values(ConnectionType) },
    database: {
        config: {
            host: { type: String, required: true },
            port: { type: String, required: true },
            user: { type: String, required: true },
            password: { type: String, required: true },
            database: { type: String, required: true },
        },
        table: { type: String, required: true },
    },
});

export default mongoose.model<IConnection>('Connection', Connection);