import cors from 'cors';
import express, { Express } from 'express';
import routerCliente from './config_enrutamiento/endPointsCliente';
import routerTienda from './config_enrutamiento/endPointsTienda';

export default function config_pipeline(app:Express):void {    
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ extended: true, limit: '25mb' }));

    app.use(cors());
    
    app.use('/api/cliente', routerCliente);
    app.use('/api/tienda', routerTienda);
}
