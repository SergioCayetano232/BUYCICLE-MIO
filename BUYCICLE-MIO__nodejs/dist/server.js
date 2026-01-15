"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const config_pipeline_1 = __importDefault(require("./config_server_express/config_pipeline"));
const app = (0, express_1.default)();
(0, config_pipeline_1.default)(app);
app.listen(3000, (error) => {
    if (error) {
        console.log('Error al INICIAR servidor WEB EXPRESS en puerto 3000:', error);
    }
    else {
        console.log('...Servidor WEB EXPRESS iniciado en puerto 3000...');
    }
});
//# sourceMappingURL=server.js.map