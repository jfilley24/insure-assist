"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
console.log(Object.keys(prisma).filter(function (k) { return k.toLowerCase().includes('coi'); }));
