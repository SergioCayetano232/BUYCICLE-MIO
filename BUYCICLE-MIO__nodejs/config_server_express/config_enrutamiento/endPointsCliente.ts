import express, { Request, Response,NextFunction } from 'express';
import Cliente from '../../modelos/modelos_mongoose_ORM/Cliente';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import JwtService from '../../servicios/JwtService';

const routerCliente = express.Router();

routerCliente.post('/Login',  async (req:Request, res:Response, next:NextFunction) => {
    // Lógica para manejar el login del cliente
    try {
        const { email, password } = req.body;
        console.log(`Datos recibidos en login del cliente: email: ${email}, password: ${password}`);

        await mongoose.connect(process.env.URL_MONGODB!);
        const cliente = await Cliente.findOne({ 'cuenta.email': email }).exec();
        const passwordMatch = cliente ? await bcrypt.compare(password, cliente.cuenta.password) : false;
        if (! cliente || ! passwordMatch || ! cliente.cuenta.cuentaActivada ) throw new Error('Cliente no encontrado con ese email o password o la cuenta no esta activada');

        cliente.cuenta.password = ''; //eliminamos el password de la respuesta
        //generar tokens JWT de acceso y refresh
        const tokens = JwtService.generarJWT({ email: cliente.cuenta.email, idCliente: cliente._id }, '1h', true);
        console.log('datos a mandar...', { cliente, accessToken: tokens[0], refreshToken: tokens[1] });
        
        res.send({ codigo: 0, mensaje: 'Login ok...', datos: { cliente, accessToken: tokens[0], refreshToken: tokens[1] } });
    
    } catch (error) {
        console.error('Error en login del cliente:', error);
    }
    
});


routerCliente.post('/Registro', async (req:Request, res:Response, next:NextFunction) => {
    try {
        console.log('Datos recibidos en el servidor para registro de cliente:', req.body);
        const { nombre, apellidos, email, password, planAmigo, genero } = req.body;
        const nuevoCliente = new Cliente({
            nombre,
            apellidos,
            genero,
            cuenta: {
                email,
                password: bcrypt.hashSync(password, 10), // Hashear la contraseña antes de guardarla
                cuentaActiva: false,
                fechaCreacionCuenta: Date.now(),
                telefonoContacto: '',
                imagenAvatar: '',
            },
            nifcif: '',
            fechaNacmiento: null,
            direcciones: [],
            misAnuncios: [],
            pedidosYVentas: []
        });
        await mongoose.connect(process.env.URL_MONGODB || 'mongodb://127.0.0.1:27017/HSN');

        const resInsert=await nuevoCliente.save();
        console.log('Nuevo cliente registrado en la base de datos:', resInsert);
        res.status(200).send({ codigo: 0, mensaje: 'Cliente registrado con exito.', datos: resInsert });

    } catch (error) {
        console.error('Error al registrar nuevo cliente:', error);
        res.status(200).send({ codigo: 1, mensaje: 'Error al registrar cliente.', datos: error });
    } finally {
        await mongoose.disconnect();
    }
});

routerCliente.post('/Anuncio', async (req:Request, res:Response, next:NextFunction) => {
    try {
        const { idCliente, anuncio } = req.body;
        if (!idCliente || !anuncio) {
            throw new Error('Faltan datos para guardar el anuncio.');
        }
        await mongoose.connect(process.env.URL_MONGODB!);
        const clienteActualizado = await Cliente.findByIdAndUpdate(
            idCliente,
            { $push: { misAnuncios: anuncio } },
            { new: true }
        ).exec();

        if (!clienteActualizado) {
            throw new Error('Cliente no encontrado para guardar el anuncio.');
        }
        clienteActualizado.cuenta.password = '';
        res.status(200).send({ codigo: 0, mensaje: 'Anuncio guardado correctamente.', datos: { cliente: clienteActualizado } });
    } catch (error:any) {
        console.error('Error al guardar anuncio:', error);
        res.status(200).send({ codigo: 1, mensaje: 'Error al guardar el anuncio.', datos: error?.message || error });
    } finally {
        await mongoose.disconnect();
    }
});

export default routerCliente;
